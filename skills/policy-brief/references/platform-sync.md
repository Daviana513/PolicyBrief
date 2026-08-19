# Platform sync

Reuse the user's existing platform and schema. Evidence traceability matters more than storage product choice.

This Skill bundles configurable Notion and Feishu adapters. Notion is the recommended remote knowledge base; Feishu remains available for existing projects. Airtable and other targets still require an authorized connector or project adapter. If none exists, preserve the validated local result and report the missing integration instead of claiming sync is available.

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

Do not retry a permission denial. When the policy table is accessible but the claim table is unavailable, sync changed policy rows once, retain claim rows in the validated local store, and mark the remote result `degraded`. Attempt schema creation only with explicit schema-management authorization.

## Platform notes

- **Notion**: use the bundled adapter with separate policy and claim data sources plus a claim-to-policy relation.
- **Feishu Bitable**: use the bundled legacy adapter with separate policy and claim tables.
- **Airtable**: use stable keys rather than row order.
- **CSV/Markdown**: use UTF-8, quote multiline evidence, and preserve existing column order during migration.

Collaborative database row position is not priority. Use sorted views based on status, check date, or downstream selection fields.

## Bundled Notion adapter

The dependency-free adapter uses Notion API `2026-03-11` and requires Node.js 18 or newer. Policy pages use the policy title as their Notion title, and claim pages use the fact statement; `policy_id` and `claim_id` remain stable upsert keys. The adapter clears mapped remote values when the local source is empty and preserves unmapped Notion properties.

Create an internal Notion integration with read, insert, and update content capabilities. Create or choose a parent page, connect the integration to that page, and configure:

- `NOTION_TOKEN`: private integration token;
- `NOTION_PARENT_PAGE_ID`: parent page used only when `prepare` creates the two databases;
- `NOTION_POLICY_DATA_SOURCE_ID`: policy data source ID returned by `prepare`;
- `NOTION_CLAIM_DATA_SOURCE_ID`: claim data source ID returned by `prepare`.

Run schema preparation only after explicit authorization:

```bash
node <skill-directory>/scripts/notion_policy_sync.mjs prepare --dry-run
node <skill-directory>/scripts/notion_policy_sync.mjs prepare
```

Save the two returned data source IDs in the project `.env`, then run:

```bash
node <skill-directory>/scripts/notion_policy_sync.mjs preflight
node <skill-directory>/scripts/notion_policy_sync.mjs sync --dry-run --policy-id=REGION-2026-001
node <skill-directory>/scripts/notion_policy_sync.mjs sync --policy-id=REGION-2026-001
```

`prepare` creates or completes both schemas and adds the derived `关联政策` relation to claim records. `sync` writes policy pages first, then claim pages, so relation targets exist before evidence is written. The adapter does not manage Notion views; configure mobile-friendly list and filtered views in the Notion app.

## Bundled Feishu adapter

The adapter requires Node.js 18 or newer and reads secrets from an environment file or exported variables. Copy `.env.example` from the Skill directory into the user's project as `.env`, then fill in the user's own values. Never edit or commit the bundled example with real credentials.

Important configuration:

- `POLICYBRIEF_PROJECT_ROOT`: base directory for relative paths; defaults to the current directory.
- `POLICYBRIEF_KB_DIR`: directory containing `policies.csv` and `policy_claims.csv`.
- `POLICYBRIEF_POLICY_CSV` and `POLICYBRIEF_CLAIM_CSV`: optional explicit CSV paths.
- `POLICYBRIEF_FIELD_PROFILE`: `canonical` for the English schema or `zh` for the compatible Chinese schema.
- `FEISHU_BITABLE_APP_TOKEN`: Base token.
- `FEISHU_POLICY_TABLE_ID`: required policy table ID.
- `FEISHU_CLAIM_TABLE_ID`: optional claim table ID; when omitted, the adapter searches by `FEISHU_CLAIM_TABLE_NAME` when the app may list tables, otherwise it safely falls back to policy-only sync.
- `FEISHU_POLICY_TABLE_NAME` and `FEISHU_CLAIM_TABLE_NAME`: user-facing table names used for discovery and diagnostics.

Run commands from the policy project, or pass `--env=/absolute/path/to/.env`:

```bash
node <skill-directory>/scripts/feishu_policy_sync.mjs preflight
node <skill-directory>/scripts/feishu_policy_sync.mjs sync --dry-run --policy-id=REGION-2026-001
node <skill-directory>/scripts/feishu_policy_sync.mjs sync --policy-id=REGION-2026-001
```

`preflight` is read-only. `sync --dry-run` compares local and remote records without writing. `sync` upserts by `policy_id` and `claim_id`, skips unchanged mapped fields, and preserves unmapped remote fields.

Preflight requires only the core identity, status, audience, summary, source, and check-date fields. Optional fields are reported as unmapped and skipped safely. `prepare` offers the complete profile when the user wants the full schema.

The `prepare` command may create missing fields and the claim table. Run it only after the user explicitly authorizes schema changes:

```bash
node <skill-directory>/scripts/feishu_policy_sync.mjs prepare --dry-run
node <skill-directory>/scripts/feishu_policy_sync.mjs prepare
```

If the policy table is usable but the claim table is missing, incomplete, or denied, normal sync automatically becomes `policy-only`; claims stay in the configured local CSV. Add `--require-claims` only when the caller wants that condition to block the run.
