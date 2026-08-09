# Platform sync

Reuse the user's existing platform, schema, and sync path. Evidence traceability matters more than storage product choice.

This Skill does not bundle a universal Feishu, Notion, or Airtable client. Remote sync requires an existing authorized connector or project adapter. If none exists, preserve the validated local result and report the missing integration instead of claiming sync is available.

## Authorization boundary

- Treat search, verification, comparison, and dry runs as read-only.
- Write local files only when requested or when project instructions define local maintenance as the default.
- Write remote systems only with explicit user intent or established project authorization.
- Run a dry run before the first remote write and whenever destination or field mappings change.

## Preflight

Confirm destination workspace, table or database, unique key, policy and claim tables, field names and types, write permission, operation type, and expected record count.

Read credentials from the environment or approved secret store. Never print, document, or commit tokens and app secrets.

Run this read-only preflight before policy research when the request includes remote sync. Classify readiness as:

- `full`: policy and claim records can be written;
- `policy-only`: the policy table is ready but the claim table or fields are missing;
- `unavailable`: the policy table or adapter cannot be used.

Record-write permission and schema-write permission are different capabilities. Never infer permission to create tables or fields from successful record writes. A missing table is not evidence of a network problem.

## Upsert behavior

- Match policies by `policy_id` and claims by `claim_id`.
- Pass the changed `policy_id` values to the adapter when it supports scoped sync; claim rows should be filtered by their parent `policy_id`.
- Create when no record exists; update only mapped changed fields when it does.
- Preserve history and unmapped user-authored fields.
- Keep leads and verified policies logically or physically separate.
- Do not delete superseded or expired records; update status and relationships.
- Sync policy records before claim records so references resolve.

## Failure behavior

Preserve local structured output when remote sync fails. Report destination, operation, created/updated/skipped/failed counts, safe error category, and local-save status.

Use one bounded retry only for a genuine timeout or transient response. Do not retry a permission denial. When the policy table is writable but the claim table is unavailable, sync changed policy rows once, retain claim rows in the validated local store, and mark the remote result `degraded`. Attempt schema creation only with explicit schema-management authorization.

## Platform notes

- **Feishu Bitable**: use separate policy and claim tables; map dates, selects, multi-selects, links, and policy relations explicitly.
- **Notion**: inspect property types and relation targets before writing.
- **Airtable**: use stable keys rather than row order.
- **CSV/Markdown**: use UTF-8, quote multiline evidence, and preserve existing column order during migration.

Collaborative database row position is not priority. Use sorted views based on status, check date, or downstream selection fields.
