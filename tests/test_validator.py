import importlib.util
import unittest
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VALIDATOR_PATH = ROOT / "skills" / "policy-brief" / "scripts" / "validate_policy_record.py"
SPEC = importlib.util.spec_from_file_location("policybrief_validator", VALIDATOR_PATH)
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


def valid_policy():
    today = date.today()
    return {
        "policy_id": "FJ-2026-999",
        "region": "福建",
        "issuer": "示例政府机构",
        "title": "示例政策",
        "published_at": (today - timedelta(days=30)).isoformat(),
        "effective_period": "至2027-12-31",
        "policy_status": "effective",
        "application_status": "unknown",
        "status_basis_url": "https://example.gov.cn/policy",
        "status_reason": "官方文本载明有效期尚未届满",
        "audience": ["学生"],
        "categories": ["就业"],
        "summary": "示例支持内容",
        "source_quote": "符合条件的学生可以申请。",
        "quote_location": "第一条",
        "official_policy_url": "https://example.gov.cn/policy",
        "source_type": "policy_text",
        "source_identity_note": "示例政府官方网站",
        "verification_status": "verified",
        "last_checked": today.isoformat(),
    }


def valid_claims():
    today = date.today().isoformat()
    return [
        {
            "claim_id": "FJ-2026-999-C01",
            "policy_id": "FJ-2026-999",
            "claim_type": "eligibility",
            "claim_text": "符合条件的学生属于适用对象。",
            "verdict": "supported",
            "source_quote": "符合条件的学生可以申请。",
            "source_url": "https://example.gov.cn/policy",
            "source_type": "policy_text",
            "quote_location": "第一条",
            "checked_at": today,
        },
        {
            "claim_id": "FJ-2026-999-C02",
            "policy_id": "FJ-2026-999",
            "claim_type": "validity",
            "claim_text": "政策有效期尚未届满。",
            "verdict": "supported",
            "source_quote": "本政策有效期至2027年12月31日。",
            "source_url": "https://example.gov.cn/policy",
            "source_type": "policy_text",
            "quote_location": "附则",
            "checked_at": today,
        },
    ]


class ValidatorTests(unittest.TestCase):
    def test_valid_strict_policy_and_claims(self):
        policy = valid_policy()
        errors, _ = validator.validate_policy(
            policy, strict=True, max_age_days=90, has_claims=True
        )
        claim_errors, _ = validator.validate_claim_collection(
            valid_claims(), [policy], strict=True
        )
        self.assertEqual([], errors)
        self.assertEqual([], claim_errors)

    def test_future_check_date_is_rejected(self):
        policy = valid_policy()
        policy["last_checked"] = (date.today() + timedelta(days=1)).isoformat()
        errors, _ = validator.validate_policy(policy, strict=True, max_age_days=90)
        self.assertTrue(any("cannot be in the future" in error for error in errors))

    def test_future_application_window_is_allowed(self):
        policy = valid_policy()
        policy.update(
            {
                "application_status": "upcoming",
                "application_window_start": (date.today() + timedelta(days=30)).isoformat(),
                "application_notice_url": "https://example.gov.cn/notice",
            }
        )
        errors, _ = validator.validate_policy(policy, strict=True, max_age_days=90)
        self.assertFalse(any("application_window_start cannot" in error for error in errors))

    def test_open_application_before_start_is_rejected(self):
        policy = valid_policy()
        policy.update(
            {
                "application_status": "open",
                "application_window_start": (date.today() + timedelta(days=1)).isoformat(),
                "application_window_end": (date.today() + timedelta(days=30)).isoformat(),
                "application_notice_url": "https://example.gov.cn/notice",
                "application_channel": "线上申请",
            }
        )
        errors, _ = validator.validate_policy(policy, strict=True, max_age_days=90)
        self.assertTrue(any("has not started" in error for error in errors))

    def test_open_application_after_deadline_is_rejected(self):
        policy = valid_policy()
        policy.update(
            {
                "application_status": "open",
                "application_window_start": (date.today() - timedelta(days=30)).isoformat(),
                "application_window_end": (date.today() - timedelta(days=1)).isoformat(),
                "application_notice_url": "https://example.gov.cn/notice",
                "application_channel": "线上申请",
            }
        )
        errors, _ = validator.validate_policy(policy, strict=True, max_age_days=90)
        self.assertTrue(any("has ended" in error for error in errors))

    def test_upcoming_application_start_date_must_be_future(self):
        policy = valid_policy()
        policy.update(
            {
                "application_status": "upcoming",
                "application_window_start": date.today().isoformat(),
                "application_notice_url": "https://example.gov.cn/notice",
            }
        )
        errors, _ = validator.validate_policy(policy, strict=True, max_age_days=90)
        self.assertTrue(any("start date has arrived" in error for error in errors))

    def test_claim_table_replaces_legacy_record_quote(self):
        policy = valid_policy()
        policy.pop("source_quote")
        policy.pop("quote_location")
        errors, _ = validator.validate_policy(
            policy, strict=True, max_age_days=90, has_claims=True
        )
        claim_errors, _ = validator.validate_claim_collection(
            valid_claims(), [policy], strict=True
        )
        self.assertEqual([], errors)
        self.assertEqual([], claim_errors)

    def test_duplicate_policy_is_rejected(self):
        policy = valid_policy()
        errors = validator.duplicate_errors([policy, dict(policy)])
        self.assertTrue(any("duplicate policy_id" in error for error in errors))
        self.assertTrue(any("duplicates title/issuer/date" in error for error in errors))

    def test_partial_interpretation_does_not_require_policy_text_url(self):
        policy = valid_policy()
        policy.update(
            {
                "policy_status": "needs_recheck",
                "verification_status": "partial",
                "source_type": "official_interpretation",
                "official_policy_url": "",
                "official_interpretation_url": "https://example.gov.cn/explanation",
            }
        )
        errors, _ = validator.validate_policy(policy, strict=False, max_age_days=90)
        self.assertFalse(any("official_policy_url" in error for error in errors))

    def test_chinese_claim_values_are_normalized(self):
        claim = valid_claims()[0]
        claim.update({"claim_type": "资格条件", "verdict": "已支持", "source_type": "申请通知"})
        normalized = validator.normalize_claim(claim)
        self.assertEqual("eligibility", normalized["claim_type"])
        self.assertEqual("supported", normalized["verdict"])
        self.assertEqual("application_notice", normalized["source_type"])

    def test_huitai_filters_and_periodic_application_are_normalized(self):
        policy = valid_policy()
        policy.update(
            {
                "application_status": "定期开放",
                "application_notice_url": "https://example.gov.cn/notice",
                "application_channel": "每月1至5日线上申请",
                "惠台适用方式": "明确参照执行",
                "当前可操作性": "有明确入口",
            }
        )
        normalized = validator.normalize_policy(policy)
        self.assertEqual("periodic", normalized["application_status"])
        self.assertEqual("explicit_reference", normalized["audience_applicability"])
        self.assertEqual("explicit_channel", normalized["actionability"])

    def test_application_detail_claim_types_are_normalized(self):
        expected = {
            "适用依据": "applicability_basis",
            "申请主体": "applicant",
            "资金对象": "recipient",
            "申请材料": "materials",
            "受理部门": "authority",
        }
        for value, canonical in expected.items():
            claim = valid_claims()[0]
            claim["claim_type"] = value
            self.assertEqual(canonical, validator.normalize_claim(claim)["claim_type"])

    def test_applicability_basis_can_replace_generic_eligibility_claim(self):
        policy = valid_policy()
        claims = valid_claims()
        claims[0]["claim_type"] = "适用依据"
        errors, _ = validator.validate_claim_collection(claims, [policy], strict=True)
        self.assertEqual([], errors)


if __name__ == "__main__":
    unittest.main()
