---
name: policy-brief
description: Research, verify, structure, audit, and maintain public-policy knowledge bases. Use when a user asks to search official policies, fact-check benefits or eligibility, determine policy validity or current application availability, separate leads from verified records, build claim-level evidence, deduplicate or update policy records, track implementation or supersession relationships, produce verified policy briefs, or prepare policy data for CSV, Markdown, Feishu, Notion, or Airtable. Sync remotely only when the project already provides an authorized connector or adapter.
---

# PolicyBrief

Turn policy discovery into traceable, reusable knowledge. Stop at a verified policy packet; leave topic selection, scripts, storyboards, and other content production to downstream skills.

## Choose the requested mode

- **Discover**: find candidates and identify evidence gaps.
- **Verify**: check a supplied policy, link, claim, or existing record.
- **Maintain**: add, update, deduplicate, relate, supersede, or expire records.
- **Audit**: recheck links, validity, application availability, and stale records.
- **Brief**: produce a decision-ready brief or verified policy packet.

Complete only the requested modes. Default to read-only analysis unless the user requests a local update or the project explicitly defines local maintenance as part of the workflow. Require explicit user intent or established project authorization before any remote write.

## Choose an execution profile

- **Fast rigorous** is the default for bounded requests such as "find 3 new policies and sync them". Use at most two search batches, shortlist no more than twice the requested count, and deeply verify the requested count plus one backup.
- **Exhaustive** is for explicit comprehensive audits, legal-risk reviews, or jurisdiction-wide inventories. State that this profile takes longer before starting.

In fast rigorous mode, stop researching a candidate after one targeted fallback search fails to resolve a missing controlling source, validity basis, or application window. Mark it partial or lead-only and continue. Never invent an exact date to make validation pass.

## Load references selectively

- Read [fact-checking.md](references/fact-checking.md) before research, validity judgments, or claim verification.
- Read [schema.md](references/schema.md) before creating, changing, or migrating records.
- Read [output-contracts.md](references/output-contracts.md) before producing candidate tables, briefs, audit reports, change logs, or verified packets.
- Read [platform-sync.md](references/platform-sync.md) before writing to Feishu, Notion, Airtable, spreadsheets, or local knowledge bases.

## Run the workflow

### 1. Establish scope and authority

Identify jurisdiction, audience, policy direction, time window, requested deliverable, destination, and whether the task is read-only or may write. Make conservative assumptions only when they do not change policy meaning or external state.

### 2. Preflight remote destinations early

When remote sync is requested and an adapter exists, run one read-only preflight before policy research. Test record-write readiness separately from schema-write readiness and classify the destination as `full`, `policy-only`, or `unavailable`.

A missing claim table or field is a schema issue, not a network failure. Do not attempt schema creation, browser workarounds, or repeated retries unless the user has explicitly authorized schema management. If the policy table is ready but the claim table is not, continue the complete local workflow and plan a policy-only remote sync; keep claim rows locally and report them as pending. If preflight itself fails once, preserve a local-first plan and move on.

### 3. Inspect existing records

Read policy and lead stores before searching. Preserve existing field names and add new fields non-destructively when required. Deduplicate by normalized title, issuer, and publication date; use document number, canonical URL, and policy relationships as secondary signals.

Never delete history. Link newer policies, implementation notices, interpretations, and application rounds to the records they affect.

### 4. Discover broadly, verify narrowly

Use search results, media, social posts, and prior documents only to discover candidates. Use official policy text, government portals, official department pages, official application notices, or verified public-service pages as final evidence.

Open every relied-on source. Do not cite search snippets. Confirm publisher identity and authority, then locate the exact paragraph, article, attachment, or service notice supporting each material claim.

Batch independent searches and source opens. Prefer title, document-number, issuer-domain, and current-year queries over generic browsing. Do not walk paginated archives in fast rigorous mode unless the missing item is the only blocker for a likely promoted record.

### 5. Build claim-level evidence

Create one evidence row per claim that affects audience, benefit, amount, duration, restriction, validity, calculation, or application. Capture the claim, verdict, short verbatim quotation, source URL and type, location, check date, and caveat.

Do not compress several claims into one quotation when they come from different clauses or documents.

### 6. Assign four separate dimensions

Do not collapse these dimensions into one label:

- `source_type`: what kind of source supports the record;
- `verification_status`: whether the evidence chain is verified, partial, or unverified;
- `policy_status`: whether the policy is effective, adjusted, expired, superseded, or needs recheck;
- `application_status`: whether the current application is open, rolling, upcoming, closed, unknown, or not applicable.

An official page can describe an expired program. An effective framework can have no open application round.

### 7. Record relationships and constraints

Extract geography, audience, benefit, amount, currency, frequency, cap, duration, exclusions, application actor, channel, timing, and contact. Preserve limiting language equivalent to "eligible", "up to", "no longer than", "subject to the annual notice", and "not duplicated with other support".

Relate implementation notices, annual calls, interpretations, and replacements to their parent policy. Keep calculations separate from quoted facts and show every stacking condition.

### 8. Decide record action

Classify each candidate as new, updated, unchanged, expired, superseded, or lead-only. Update only changed fields plus check date and update note. Keep quotations verbatim.

Use the canonical schema for a new store. For an existing store, map current fields and add missing safety fields without destructive migration.

### 9. Validate before promotion

Run structural validation before moving a lead into the verified store. Use strict validation for publication-ready records. A passing validator proves completeness and consistency only; it never proves that a website is official or a claim is true.

### 10. Write and sync safely

Confirm destination identity, unique key, field mapping, and write authority. Run a dry run before the first remote sync or whenever mappings change. Preserve a local structured result if remote sync fails, and report returned counts or record identifiers accurately.

When the adapter supports filtering, sync only records and claims changed in the current run. Do not rewrite the entire remote knowledge base merely to add a bounded set of records.

Treat policy-only fallback as a successful but degraded sync, not as a complete remote sync. Do not retry schema creation after a permission denial. Report which policy records were written, where claim rows remain, and the one action needed to enable a later claim backfill.

### 11. Produce the requested output

Lead with what is verified, what is effective, what is currently available, and what remains uncertain. Attach official links close to supported claims. Include a change log whenever records were inspected or modified.

## Non-negotiable safeguards

- Never promote a lead without an official evidence chain.
- Never use page availability as proof of policy validity.
- Never use policy validity as proof that applications are open.
- Never turn "up to" into a guaranteed amount.
- Never omit eligibility, geography, timing, applicant, or contract requirements.
- Never use generated prose instead of an official quotation.
- Never overwrite user-authored fields or delete policy history.
- Never expose credentials or claim an unconfirmed sync succeeded.
- State exactly what was not checked, found, or verified.

## Validate structured data

Resolve the bundled validator relative to this `SKILL.md`; do not assume the user's project has its own `scripts/` directory.

Run a compatibility check on an existing store:

```bash
python3 <skill-directory>/scripts/validate_policy_record.py policies.csv
```

Run publication-ready validation with claim evidence:

```bash
python3 <skill-directory>/scripts/validate_policy_record.py policies.csv --claims policy_claims.csv --strict --max-age-days 90
```
