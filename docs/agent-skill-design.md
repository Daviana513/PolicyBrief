# PolicyBrief Agent / Skill design

## Product boundary

PolicyBrief is a policy knowledge-base agent, not a general content agent. Its job ends when it has produced traceable records and a verified policy packet.

It does not select video topics, write scripts, design storyboards, or generate image prompts. Those jobs belong to downstream products such as HuiTaiVideo.

## Why a Skill

Stable methods belong in the Skill: source hierarchy, verification procedure, record lifecycle, data contracts, validation, and write boundaries. Changing policy facts belong in an external knowledge base and must be rechecked.

The package follows progressive disclosure:

| Layer | Contents |
|---|---|
| `SKILL.md` | Modes, workflow, safety boundaries, reference routing |
| `references/` | Fact checking, schema, output contracts, platform sync |
| `scripts/` | Deterministic completeness and consistency checks |
| External store | Policy records, claim evidence, leads, and history |

## Operating modes

- `Discover`: find candidates and evidence gaps.
- `Verify`: test claims and source authority.
- `Maintain`: update records and relationships.
- `Audit`: recheck validity, application status, links, and freshness.
- `Brief`: produce a policy brief or verified packet.

The mode determines allowed behavior. Read-only analysis does not imply permission to change local or remote data.

## Core data flow

```text
User scope
  -> Existing policy and lead stores
  -> Candidate discovery
  -> Source identity and authority check
  -> Claim-evidence ledger
  -> Policy status + application status
  -> Deduplication and relationships
  -> Validation
  -> Authorized local/remote upsert
  -> Verified policy packet
```

## Why four separate dimensions

A reliable policy record cannot use one status field for everything:

- `source_type` describes the source.
- `verification_status` describes evidence completeness.
- `policy_status` describes the policy lifecycle.
- `application_status` describes the current operational window.

This prevents common failures such as treating an official page as proof of current validity, or treating an effective framework as an open application.

## Claim-level evidence

Record-level quotations are retained for compatibility, but the canonical evidence unit is a claim. Eligibility, amount, duration, validity, and application can come from different clauses or documents.

Downstream systems receive supported claims, prohibited claims, links, caveats, and check dates. They do not receive authority to reinterpret the original policy.

## Tools and integrations

- Browsing opens and inspects official sources.
- Local tools maintain CSV, JSON, Markdown, or Obsidian stores.
- Existing project scripts or connectors sync Feishu, Notion, or Airtable.
- `validate_policy_record.py` checks structure and consistency.

The validator cannot prove that a domain is official. Publisher identity and authority remain an explicit research step.

## Deliberate exclusions

Version one does not include a universal government-site crawler, a hard-coded domain allowlist, a built-in Feishu client, or content-generation logic. These would increase deployment cost or false confidence without improving the core evidence model.

## Success criteria

- Every material claim has traceable evidence.
- Policy validity and application availability are independently recorded.
- Leads cannot silently become verified records.
- Superseded and expired history remains queryable.
- Remote writes are authorized, dry-run when mappings change, and verifiably reported.
- A downstream product can consume the verified packet without rereading or rewriting policy facts.
