# Fact-checking protocol

Use this protocol for every statement affecting eligibility, money, timing, validity, or application.

## 1. Source identity and hierarchy

Confirm both publisher identity and policy authority. Prefer:

1. Policy text, regulation, normative document, official attachment.
2. Official implementation notice, application guide, annual call, or service page.
3. Official interpretation, government Q&A, or government news release.
4. Verified government or public-institution social account.
5. Media, commercial platforms, personal posts, and prior summaries as leads only.

Record why the source is authoritative. A government repost may support discovery but can still require the issuing body's original text.

## 2. Four independent dimensions

Keep these separate:

| Dimension | Question |
|---|---|
| `source_type` | What kind of source is this? |
| `verification_status` | Is the evidence chain complete? |
| `policy_status` | Is the policy itself effective? |
| `application_status` | Can the audience apply in the current round? |

Do not equate an accessible page with an effective policy. Do not equate an effective framework with an open application window.

## 3. Claim-evidence ledger

Create one row per material claim:

| claim_id | type | claim | verdict | quote | source | location | checked | caveat |
|---|---|---|---|---|---|---|---|---|

Use claim types `eligibility`, `benefit`, `duration`, `restriction`, `validity`, `application`, `calculation`, or `other`. Use verdicts `supported`, `partial`, `unsupported`, or `outdated`.

Break compound claims apart. Amount, duration, audience, application channel, and current availability often need different evidence rows.

## 4. Policy-status test

Mark `effective` only when applicable checks pass:

- no explicit expiry has passed;
- no later source supersedes or repeals it;
- the policy or current official source supports continuing implementation;
- required local implementation exists;
- the status basis and check date are recorded.

Use `needs_recheck` when official evidence exists but current validity is unclear. Use `expired` for an ended policy, not merely for a closed annual application round.

## 5. Application-status test

- `open`: a current notice gives an active start/end window.
- `rolling`: an official service accepts applications continuously.
- `upcoming`: an official source announces a future opening.
- `closed`: the current or most recent round ended.
- `unknown`: the framework exists but no current operational notice was found.
- `not_applicable`: the policy has no application process.

Before saying "apply now", require an application notice or current service page, channel, audience match, and check date.

## 6. Policy relationships

Use linked records when one document:

- implements a framework policy;
- announces an annual or batch application;
- interprets another policy;
- supersedes another policy.

Do not merge documents with different validity periods or application windows into one undifferentiated record.

## 7. Numbers and derived claims

Record currency, unit, frequency, cap, duration, tier, and stacking rules. Label derived amounts as calculations, cite every component rule, and identify the audience reaching the maximum.

## 8. Link and document handling

- Remove tracking parameters when a canonical URL exists.
- Open PDF attachments and record page or article numbers.
- Keep policy, interpretation, PDF, application notice, and service page as separate URLs.
- Search the issuer's site by title or document number when a link breaks.
- Do not replace a dead official link with an unofficial mirror without downgrading verification.

## 9. Final language

Prefer precise labels:

- "Policy effective; current application status unknown."
- "Application closed on [date]; follow the next annual notice."
- "Supported by an official interpretation; original policy text not found."
- "Lead only; do not use for publication."

Avoid "everyone receives", "apply now", "free", or "maximum" without the controlling conditions.
