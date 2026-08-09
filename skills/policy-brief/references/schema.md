# Canonical data schema

Use this schema for new stores. For existing stores, preserve current columns and add missing fields non-destructively.

## Contents

- Policy records
- Status values
- Claim records
- Common Chinese mappings
- Identity and deduplication

## Policy records

| Field | Required | Meaning |
|---|---:|---|
| `policy_id` | yes | Stable `REGION-YEAR-NNN` or `REGION-CLUE-NNN` key |
| `region` | yes | Top-level jurisdiction |
| `city` / `district` | no | Local jurisdiction |
| `issuer` | yes | Issuing or responsible body |
| `issuer_level` | no | National, provincial, city, district, park, official platform |
| `title` | yes | Official title; descriptive title only for leads |
| `document_number` | no | Formal document number |
| `published_at` | conditional | ISO publication date; required for strict verified records |
| `effective_period` | conditional | Official validity wording or precise period |
| `policy_status` | yes | Policy lifecycle status |
| `application_status` | conditional | Current application availability |
| `application_window_start` | no | Current round opening date |
| `application_window_end` | no | Current round closing date |
| `application_notice_url` | no | Current official call or service page |
| `status_basis_url` | conditional | Official source supporting policy status |
| `status_reason` | conditional | Concise reason for the assigned status |
| `audience` | yes | Eligible audience, preferably a list |
| `categories` | yes | Policy categories, preferably a list |
| `summary` | yes | Plain-language benefit and constraints |
| `source_quote` / `quote_location` | conditional | Legacy fallback when no claim-evidence table is supplied; do not duplicate claim rows |
| `official_policy_url` | conditional | Canonical official source for formal records |
| `official_interpretation_url` | no | Official explanation or Q&A |
| `source_url` | conditional | Best available discovery URL for leads |
| `source_type` | yes | Source category |
| `source_identity_note` | conditional | Why the publisher is treated as authoritative |
| `verification_status` | yes | Evidence-chain completeness |
| `application_channel` | no | Platform, app, mini-program, office, or contact |
| `last_checked` | yes | Most recent verification date |
| `parent_policy_id` | no | Related framework or parent policy |
| `relation_type` | no | `implements`, `announces`, `interprets`, or `supersedes` |
| `supersedes` / `superseded_by` | no | Replacement links |
| `content_id` / `topic_status` | no | Optional downstream references only |
| `update_note` | no | What changed and why |

## Status values

`policy_status`:

- `effective`
- `partially_adjusted`
- `expired`
- `superseded`
- `needs_recheck`
- `lead_unverified`

`application_status`:

- `open`
- `rolling`
- `upcoming`
- `closed`
- `unknown`
- `not_applicable`

`source_type`:

- `policy_text`
- `application_notice`
- `official_interpretation`
- `official_social`
- `media`
- `other`

`verification_status`:

- `verified`
- `partial`
- `unverified`

## Claim records

Store claim evidence in `policy_claims.csv`, a linked database table, or an equivalent collection.

| Field | Required | Meaning |
|---|---:|---|
| `claim_id` | yes | Stable claim key |
| `policy_id` | yes | Parent policy key |
| `claim_type` | yes | Eligibility, benefit, duration, restriction, validity, application, calculation, other |
| `claim_text` | yes | Plain-language claim |
| `verdict` | yes | `supported`, `partial`, `unsupported`, or `outdated` |
| `source_quote` | conditional | Short verbatim quotation |
| `source_url` | yes | Evidence URL |
| `source_type` | yes | Source category |
| `quote_location` | conditional | Article, section, attachment, or page |
| `checked_at` | yes | Verification date |
| `caveat` | no | Limitation or missing evidence |

Chinese claim values are accepted for local stores: `资格条件`, `待遇内容`, `期限`, `限制条件`, `有效期`, `申请方式`, `计算方式`, and `其他`; verdicts may use `已支持`, `部分支持`, `不支持`, and `已过时`.

Verified formal records should have supported claims for eligibility and validity. Records with `open` or `rolling` applications should also have a supported application claim.

## Common Chinese mappings

| Canonical | Chinese field |
|---|---|
| `region` / `city` / `district` | 地区 / 城市 / 区县 |
| `issuer` / `issuer_level` | 发布机构 / 机构层级 |
| `title` / `document_number` | 政策标题 / 文号 |
| `published_at` / `effective_period` | 发布时间 / 有效期 |
| `policy_status` / `application_status` | 政策状态 / 申请状态 |
| `application_window_start` / `application_window_end` | 申请开始日期 / 申请截止日期 |
| `application_notice_url` | 当前申请通知链接 |
| `status_basis_url` / `status_reason` | 政策状态依据链接 / 政策状态判断 |
| `audience` / `categories` | 适用对象 / 政策类别 |
| `summary` | 核心支持内容 |
| `source_quote` / `quote_location` | 政策重要原文 / 原文位置 |
| `official_policy_url` / `official_interpretation_url` | 官方政策链接 / 官方解读链接 |
| `source_url` | 线索来源链接 |
| `source_type` / `verification_status` | 来源类型 / 核验状态 |
| `source_identity_note` | 来源身份说明 |
| `application_channel` | 申请或查询入口 |
| `last_checked` | 最近核查日期 |
| `parent_policy_id` / `relation_type` | 上位政策ID / 关系类型 |
| `content_id` / `topic_status` | 对应内容ID / 内容状态 |
| `update_note` | 更新说明 |

Treat the legacy `证据等级` field as a compatibility input, not the new canonical model.

## Identity and deduplication

Do not recycle IDs. Deduplicate formal policies by normalized title, issuer, and publication date. Use document number and canonical URL to resolve ambiguity. Keep annual calls and implementation notices separate when dates or application windows differ, and link them with `parent_policy_id` and `relation_type`.
