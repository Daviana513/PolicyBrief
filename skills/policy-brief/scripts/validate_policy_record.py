#!/usr/bin/env python3
"""Validate PolicyBrief policy and claim records with no dependencies."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path
from urllib.parse import urlparse


ALIASES = {
    "地区": "region",
    "城市": "city",
    "区县": "district",
    "发布机构": "issuer",
    "机构层级": "issuer_level",
    "政策标题": "title",
    "文号": "document_number",
    "发布时间": "published_at",
    "有效期": "effective_period",
    "政策状态": "policy_status",
    "申请状态": "application_status",
    "申请开始日期": "application_window_start",
    "申请截止日期": "application_window_end",
    "当前申请通知链接": "application_notice_url",
    "政策状态依据链接": "status_basis_url",
    "政策状态判断": "status_reason",
    "适用对象": "audience",
    "政策类别": "categories",
    "核心支持内容": "summary",
    "政策重要原文": "source_quote",
    "原文位置": "quote_location",
    "官方政策链接": "official_policy_url",
    "官方解读链接": "official_interpretation_url",
    "线索来源链接": "source_url",
    "来源类型": "source_type",
    "核验状态": "verification_status",
    "来源身份说明": "source_identity_note",
    "证据等级": "evidence_level",
    "申请或查询入口": "application_channel",
    "最近核查日期": "last_checked",
    "上位政策ID": "parent_policy_id",
    "关系类型": "relation_type",
    "对应视频期数": "content_id",
    "对应内容ID": "content_id",
    "选题状态": "topic_status",
    "内容状态": "topic_status",
    "更新说明": "update_note",
}

CLAIM_ALIASES = {
    "事实ID": "claim_id",
    "事实类型": "claim_type",
    "事实表述": "claim_text",
    "核验结论": "verdict",
    "证据原文": "source_quote",
    "证据链接": "source_url",
    "来源类型": "source_type",
    "原文位置": "quote_location",
    "核查日期": "checked_at",
    "限制说明": "caveat",
}

POLICY_STATUS_ALIASES = {
    "现行有效": "effective",
    "部分调整": "partially_adjusted",
    "已失效": "expired",
    "已过期线索": "expired",
    "已替代": "superseded",
    "待核实": "needs_recheck",
    "线索待核": "lead_unverified",
}

APPLICATION_STATUS_ALIASES = {
    "开放申请": "open",
    "持续受理": "rolling",
    "即将开放": "upcoming",
    "申请关闭": "closed",
    "申请状态未知": "unknown",
    "不适用": "not_applicable",
}

SOURCE_TYPE_ALIASES = {
    "政策原文": "policy_text",
    "官方原文": "policy_text",
    "申请通知": "application_notice",
    "官方解读": "official_interpretation",
    "官方报道": "official_interpretation",
    "政务公众号": "official_social",
    "媒体": "media",
    "其他": "other",
}

CLAIM_TYPE_ALIASES = {
    "资格条件": "eligibility",
    "待遇内容": "benefit",
    "支持内容": "benefit",
    "期限": "duration",
    "限制条件": "restriction",
    "有效期": "validity",
    "申请方式": "application",
    "计算方式": "calculation",
    "其他": "other",
}

VERDICT_ALIASES = {
    "已支持": "supported",
    "部分支持": "partial",
    "不支持": "unsupported",
    "已过时": "outdated",
}

VERIFICATION_STATUS_ALIASES = {
    "已核验": "verified",
    "部分核验": "partial",
    "未核验": "unverified",
}

LEGACY_EVIDENCE = {
    "官方原文": ("policy_text", "verified"),
    "官方解读": ("official_interpretation", "partial"),
    "官方报道": ("official_interpretation", "partial"),
    "政务公众号": ("official_social", "partial"),
    "线索待核": ("other", "unverified"),
}

VALID_POLICY_STATUSES = {
    "effective",
    "partially_adjusted",
    "expired",
    "superseded",
    "needs_recheck",
    "lead_unverified",
}

VALID_APPLICATION_STATUSES = {
    "open",
    "rolling",
    "upcoming",
    "closed",
    "unknown",
    "not_applicable",
}

VALID_SOURCE_TYPES = {
    "policy_text",
    "application_notice",
    "official_interpretation",
    "official_social",
    "media",
    "other",
}

VALID_VERIFICATION_STATUSES = {"verified", "partial", "unverified"}
VALID_RELATIONS = {"implements", "announces", "interprets", "supersedes"}
VALID_CLAIM_TYPES = {
    "eligibility",
    "benefit",
    "duration",
    "restriction",
    "validity",
    "application",
    "calculation",
    "other",
}
VALID_VERDICTS = {"supported", "partial", "unsupported", "outdated"}

POLICY_REQUIRED = {
    "policy_id",
    "region",
    "issuer",
    "title",
    "policy_status",
    "audience",
    "categories",
    "summary",
    "last_checked",
    "source_type",
    "verification_status",
}

CLAIM_REQUIRED = {
    "claim_id",
    "policy_id",
    "claim_type",
    "claim_text",
    "verdict",
    "source_url",
    "source_type",
    "checked_at",
}

ID_PATTERN = re.compile(r"^[A-Z]{2,8}-(?:\d{4}|CLUE)-\d{3}$")


def load_records(path: Path) -> list[dict]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        records = [data] if isinstance(data, dict) else data
        if not isinstance(records, list) or not all(isinstance(item, dict) for item in records):
            raise ValueError("JSON must contain an object or a list of objects")
    elif suffix == ".jsonl":
        records = []
        for line_number, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            if not line.strip():
                continue
            item = json.loads(line)
            if not isinstance(item, dict):
                raise ValueError(f"JSONL line {line_number} must be an object")
            records.append(item)
    elif suffix == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as handle:
            records = list(csv.DictReader(handle))
    else:
        raise ValueError("Supported formats: .json, .jsonl, .csv")

    if not records:
        raise ValueError("Input contains no records")
    return records


def canonical_value(value: object, aliases: dict[str, str]) -> object:
    if isinstance(value, str):
        stripped = value.strip()
        return aliases.get(stripped, stripped)
    return value


def normalize_policy(record: dict) -> dict:
    normalized = {ALIASES.get(key, key): value for key, value in record.items()}
    normalized["policy_status"] = canonical_value(
        normalized.get("policy_status", ""), POLICY_STATUS_ALIASES
    )
    normalized["application_status"] = canonical_value(
        normalized.get("application_status", ""), APPLICATION_STATUS_ALIASES
    )
    normalized["source_type"] = canonical_value(
        normalized.get("source_type", ""), SOURCE_TYPE_ALIASES
    )
    normalized["verification_status"] = canonical_value(
        normalized.get("verification_status", ""), VERIFICATION_STATUS_ALIASES
    )

    legacy = str(normalized.get("evidence_level", "")).strip()
    if legacy in LEGACY_EVIDENCE:
        source_type, verification_status = LEGACY_EVIDENCE[legacy]
        if missing(normalized.get("source_type")):
            normalized["source_type"] = source_type
        if missing(normalized.get("verification_status")):
            normalized["verification_status"] = verification_status
    return normalized


def normalize_claim(record: dict) -> dict:
    normalized = {CLAIM_ALIASES.get(key, key): value for key, value in record.items()}
    normalized["claim_type"] = canonical_value(
        normalized.get("claim_type", ""), CLAIM_TYPE_ALIASES
    )
    normalized["verdict"] = canonical_value(
        normalized.get("verdict", ""), VERDICT_ALIASES
    )
    normalized["source_type"] = canonical_value(
        normalized.get("source_type", ""), SOURCE_TYPE_ALIASES
    )
    return normalized


def missing(value: object) -> bool:
    return value is None or (isinstance(value, str) and not value.strip()) or value == []


def parse_date(value: object) -> date | None:
    if missing(value):
        return None
    try:
        return date.fromisoformat(str(value).strip())
    except ValueError:
        return None


def valid_url(value: object) -> bool:
    if missing(value):
        return False
    parsed = urlparse(str(value).strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def normalized_text(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return re.sub(r"[\s\-—_，,。.;；:：()（）《》\[\]]+", "", text)


def split_ids(value: object) -> list[str]:
    if missing(value):
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [item.strip() for item in re.split(r"[;；,，]", str(value)) if item.strip()]


def require(record: dict, fields: set[str], label: str, errors: list[str]) -> None:
    for field in sorted(fields):
        if missing(record.get(field)):
            errors.append(f"{label}: missing required field '{field}'")


def check_date_field(
    record: dict,
    field: str,
    label: str,
    errors: list[str],
    allow_future: bool = False,
) -> date | None:
    value = record.get(field)
    if missing(value):
        return None
    parsed = parse_date(value)
    if parsed is None:
        errors.append(f"{label}: {field} must be YYYY-MM-DD")
        return None
    if not allow_future and parsed > date.today():
        errors.append(f"{label}: {field} cannot be in the future")
    return parsed


def validate_policy(
    record: dict,
    strict: bool,
    max_age_days: int | None,
    has_claims: bool = False,
) -> tuple[list[str], list[str]]:
    record = normalize_policy(record)
    errors: list[str] = []
    warnings: list[str] = []
    policy_id = str(record.get("policy_id", "")).strip() or "<missing-id>"

    require(record, POLICY_REQUIRED, policy_id, errors)

    if policy_id != "<missing-id>" and not ID_PATTERN.fullmatch(policy_id):
        errors.append(f"{policy_id}: invalid policy_id format")

    status = record.get("policy_status")
    application_status = record.get("application_status")
    source_type = record.get("source_type")
    verification_status = record.get("verification_status")

    if not missing(status) and status not in VALID_POLICY_STATUSES:
        errors.append(f"{policy_id}: unknown policy_status '{status}'")
    if not missing(application_status) and application_status not in VALID_APPLICATION_STATUSES:
        errors.append(f"{policy_id}: unknown application_status '{application_status}'")
    if not missing(source_type) and source_type not in VALID_SOURCE_TYPES:
        errors.append(f"{policy_id}: unknown source_type '{source_type}'")
    if not missing(verification_status) and verification_status not in VALID_VERIFICATION_STATUSES:
        errors.append(f"{policy_id}: unknown verification_status '{verification_status}'")

    checked = check_date_field(record, "last_checked", policy_id, errors)
    published = check_date_field(record, "published_at", policy_id, errors)
    window_start = check_date_field(
        record, "application_window_start", policy_id, errors, allow_future=True
    )
    window_end = check_date_field(
        record, "application_window_end", policy_id, errors, allow_future=True
    )
    if window_start and window_end and window_start > window_end:
        errors.append(f"{policy_id}: application window starts after it ends")

    for field in {
        "official_policy_url",
        "official_interpretation_url",
        "source_url",
        "application_notice_url",
        "status_basis_url",
    }:
        if not missing(record.get(field)) and not valid_url(record.get(field)):
            errors.append(f"{policy_id}: {field} must be an http(s) URL")

    is_lead = status == "lead_unverified"
    if is_lead:
        if missing(record.get("source_url")) and missing(record.get("official_policy_url")):
            errors.append(f"{policy_id}: lead requires source_url or official_policy_url")
        if verification_status != "unverified":
            message = f"{policy_id}: lead should use unverified verification_status"
            (errors if strict else warnings).append(message)
    elif verification_status == "verified" and missing(record.get("official_policy_url")):
        errors.append(f"{policy_id}: verified formal record requires official_policy_url")
    elif all(
        missing(record.get(field))
        for field in {
            "official_policy_url",
            "official_interpretation_url",
            "application_notice_url",
        }
    ):
        errors.append(f"{policy_id}: formal record requires at least one official source URL")

    if verification_status == "verified" and not has_claims:
        for field in {"source_quote", "quote_location"}:
            if missing(record.get(field)):
                errors.append(f"{policy_id}: verified record requires {field}")
    if verification_status == "verified":
        if source_type in {"media", "other"}:
            errors.append(f"{policy_id}: verified record cannot use source_type '{source_type}'")

    if missing(application_status) and not is_lead:
        message = f"{policy_id}: application_status is missing"
        (errors if strict else warnings).append(message)

    if strict and not is_lead:
        require(
            record,
            {"published_at", "source_identity_note"},
            policy_id,
            errors,
        )

    if status == "effective":
        if verification_status != "verified":
            errors.append(f"{policy_id}: effective status requires verified evidence")
        if strict and source_type not in {"policy_text", "application_notice"}:
            errors.append(
                f"{policy_id}: strict effective status requires policy_text or application_notice"
            )
        if strict:
            require(
                record,
                {"effective_period", "status_basis_url", "status_reason"},
                policy_id,
                errors,
            )
        elif missing(record.get("effective_period")):
            warnings.append(f"{policy_id}: effective record has no effective_period")

    if status == "superseded" and missing(record.get("superseded_by")):
        message = f"{policy_id}: superseded record should identify superseded_by"
        (errors if strict else warnings).append(message)

    relation_type = record.get("relation_type")
    parent_policy_id = record.get("parent_policy_id")
    if not missing(relation_type) and relation_type not in VALID_RELATIONS:
        errors.append(f"{policy_id}: unknown relation_type '{relation_type}'")
    if missing(parent_policy_id) != missing(relation_type):
        errors.append(f"{policy_id}: parent_policy_id and relation_type must appear together")

    if application_status in {"open", "rolling", "upcoming"}:
        if verification_status != "verified":
            errors.append(f"{policy_id}: active application status requires verified evidence")
        if missing(record.get("application_notice_url")):
            errors.append(f"{policy_id}: active application status requires application_notice_url")
    if application_status == "open":
        require(
            record,
            {"application_window_start", "application_window_end", "application_channel"},
            policy_id,
            errors,
        )
        if window_start and window_start > date.today():
            errors.append(
                f"{policy_id}: open application window has not started; use upcoming"
            )
        if window_end and window_end < date.today():
            errors.append(
                f"{policy_id}: open application window has ended; use closed or recheck"
            )
    if application_status == "rolling" and missing(record.get("application_channel")):
        errors.append(f"{policy_id}: rolling application requires application_channel")
    if application_status == "upcoming" and missing(record.get("application_window_start")):
        errors.append(f"{policy_id}: upcoming application requires application_window_start")
    if application_status == "upcoming" and window_start and window_start <= date.today():
        errors.append(
            f"{policy_id}: upcoming application start date has arrived; recheck its status"
        )
    if application_status == "closed" and missing(record.get("application_window_end")):
        message = f"{policy_id}: closed application has no application_window_end"
        (errors if strict else warnings).append(message)
    if status == "expired" and application_status in {"open", "rolling", "upcoming"}:
        errors.append(f"{policy_id}: expired policy cannot have an active application status")

    if checked and max_age_days is not None:
        age = (date.today() - checked).days
        if age > max_age_days:
            warnings.append(
                f"{policy_id}: last_checked is {age} days old (limit {max_age_days})"
            )

    return errors, warnings


def validate_claim(record: dict, strict: bool) -> tuple[list[str], list[str]]:
    record = normalize_claim(record)
    errors: list[str] = []
    warnings: list[str] = []
    claim_id = str(record.get("claim_id", "")).strip() or "<missing-claim-id>"

    require(record, CLAIM_REQUIRED, claim_id, errors)

    claim_type = record.get("claim_type")
    verdict = record.get("verdict")
    source_type = record.get("source_type")
    if not missing(claim_type) and claim_type not in VALID_CLAIM_TYPES:
        errors.append(f"{claim_id}: unknown claim_type '{claim_type}'")
    if not missing(verdict) and verdict not in VALID_VERDICTS:
        errors.append(f"{claim_id}: unknown verdict '{verdict}'")
    if not missing(source_type) and source_type not in VALID_SOURCE_TYPES:
        errors.append(f"{claim_id}: unknown source_type '{source_type}'")

    check_date_field(record, "checked_at", claim_id, errors)
    if not missing(record.get("source_url")) and not valid_url(record.get("source_url")):
        errors.append(f"{claim_id}: source_url must be an http(s) URL")

    if verdict in {"supported", "partial", "outdated"}:
        require(record, {"source_quote", "quote_location"}, claim_id, errors)
    if strict and verdict == "supported" and source_type in {"media", "other"}:
        errors.append(f"{claim_id}: supported claim requires an official source type")
    if verdict == "unsupported" and missing(record.get("caveat")):
        message = f"{claim_id}: unsupported claim should explain the evidence gap"
        (errors if strict else warnings).append(message)

    return errors, warnings


def duplicate_errors(records: list[dict]) -> list[str]:
    errors: list[str] = []
    ids: dict[str, int] = {}
    dedup_keys: dict[tuple[str, str, str], str] = {}
    document_keys: dict[tuple[str, str], str] = {}

    for index, raw in enumerate(records, start=1):
        record = normalize_policy(raw)
        policy_id = str(record.get("policy_id", "")).strip()
        if policy_id:
            if policy_id in ids:
                errors.append(
                    f"{policy_id}: duplicate policy_id in rows {ids[policy_id]} and {index}"
                )
            else:
                ids[policy_id] = index

        if record.get("policy_status") != "lead_unverified":
            key = (
                normalized_text(record.get("title")),
                normalized_text(record.get("issuer")),
                str(record.get("published_at", "")).strip(),
            )
            if all(key):
                if key in dedup_keys:
                    errors.append(
                        f"{policy_id or index}: duplicates title/issuer/date of {dedup_keys[key]}"
                    )
                else:
                    dedup_keys[key] = policy_id or f"row-{index}"

        document_number = normalized_text(record.get("document_number"))
        issuer = normalized_text(record.get("issuer"))
        if document_number and issuer:
            key = (issuer, document_number)
            if key in document_keys:
                errors.append(
                    f"{policy_id or index}: duplicates document number of {document_keys[key]}"
                )
            else:
                document_keys[key] = policy_id or f"row-{index}"
    return errors


def relationship_warnings(records: list[dict]) -> list[str]:
    warnings: list[str] = []
    ids = {
        str(normalize_policy(record).get("policy_id", "")).strip()
        for record in records
    }
    for raw in records:
        record = normalize_policy(raw)
        policy_id = str(record.get("policy_id", "")).strip() or "<missing-id>"
        references = []
        references.extend(split_ids(record.get("parent_policy_id")))
        references.extend(split_ids(record.get("supersedes")))
        references.extend(split_ids(record.get("superseded_by")))
        for reference in references:
            if reference not in ids:
                warnings.append(
                    f"{policy_id}: related policy '{reference}' is not present in this file"
                )
    return warnings


def validate_claim_collection(
    claims: list[dict], policy_records: list[dict], strict: bool
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    policy_ids = {
        str(normalize_policy(record).get("policy_id", "")).strip()
        for record in policy_records
    }
    claim_ids: set[str] = set()
    supported_types: dict[str, set[str]] = defaultdict(set)

    for raw in claims:
        claim = normalize_claim(raw)
        claim_id = str(claim.get("claim_id", "")).strip()
        policy_id = str(claim.get("policy_id", "")).strip()
        claim_errors, claim_warnings = validate_claim(claim, strict)
        errors.extend(claim_errors)
        warnings.extend(claim_warnings)

        if claim_id:
            if claim_id in claim_ids:
                errors.append(f"{claim_id}: duplicate claim_id")
            claim_ids.add(claim_id)
        if policy_id and policy_id not in policy_ids:
            errors.append(f"{claim_id or '<missing-claim-id>'}: unknown policy_id '{policy_id}'")
        if claim.get("verdict") == "supported":
            supported_types[policy_id].add(str(claim.get("claim_type", "")))

    if strict:
        for raw in policy_records:
            policy = normalize_policy(raw)
            policy_id = str(policy.get("policy_id", "")).strip()
            if policy.get("verification_status") != "verified":
                continue
            required_types = {"eligibility"}
            if policy.get("policy_status") == "effective":
                required_types.add("validity")
            if policy.get("application_status") in {"open", "rolling", "upcoming"}:
                required_types.add("application")
            missing_types = sorted(required_types - supported_types.get(policy_id, set()))
            if missing_types:
                errors.append(
                    f"{policy_id}: missing supported claim types: {', '.join(missing_types)}"
                )
    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="JSON, JSONL, or CSV policy records")
    parser.add_argument("--claims", type=Path, help="JSON, JSONL, or CSV claim records")
    parser.add_argument("--strict", action="store_true", help="enforce verified-store rules")
    parser.add_argument(
        "--max-age-days",
        type=int,
        default=None,
        help="warn when last_checked is older than this many days",
    )
    args = parser.parse_args()

    try:
        policies = load_records(args.path)
        claims = load_records(args.claims) if args.claims else []
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    errors: list[str] = duplicate_errors(policies)
    warnings: list[str] = relationship_warnings(policies)
    for policy in policies:
        policy_errors, policy_warnings = validate_policy(
            policy, args.strict, args.max_age_days, has_claims=bool(claims)
        )
        errors.extend(policy_errors)
        warnings.extend(policy_warnings)

    if args.strict and not claims:
        verified_ids = [
            str(policy.get("policy_id", "")).strip()
            for policy in map(normalize_policy, policies)
            if policy.get("verification_status") == "verified"
        ]
        if verified_ids:
            errors.append(
                "strict validation requires --claims for verified policies: "
                + ", ".join(verified_ids)
            )

    if claims:
        claim_errors, claim_warnings = validate_claim_collection(
            claims, policies, args.strict
        )
        errors.extend(claim_errors)
        warnings.extend(claim_warnings)

    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}")

    if errors:
        print(f"FAIL: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1

    print(
        f"OK: {len(policies)} policy record(s), {len(claims)} claim record(s), "
        f"{len(warnings)} warning(s)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
