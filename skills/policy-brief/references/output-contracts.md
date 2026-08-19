# Output contracts

Match the requested mode and keep leads separate from verified records.

## Candidate table

| Candidate | Jurisdiction | Audience | Core support | Policy status | Application status | Evidence gap | Official link | Action |
|---|---|---|---|---|---|---|---|---|

Use actions `new`, `update`, `unchanged`, `expire`, `supersede`, or `lead_only`.

## Policy brief

Use this order:

1. **Decision**: what is verified, policy validity, and current application availability.
2. **Who qualifies**: audience, applicability basis, geography, timing, identity, contract, or organizational requirements.
3. **What support exists**: amount, duration, cap, stacking, and exclusions.
4. **How it operates**: applicant, channel, current notice, materials, or contact.
5. **Evidence**: claim-level official quotations and links.
6. **Relationships**: parent policy, implementation notice, interpretation, or replacement.
7. **Caveats and check date**.

## Verification report

| Claim | Verdict | Evidence | Location | Missing evidence | Safe wording |
|---|---|---|---|---|---|

Use verdicts `supported`, `partial`, `unsupported`, or `outdated`.

## Verified policy packet

Provide this handoff to downstream products:

```text
policy_id:
official_title:
issuer:
policy_status:
policy_status_reason:
application_status:
audience_applicability:
actionability:
application_window:
audience:
geography:
verified_claims:
unsupported_or_prohibited_claims:
application_channel:
official_sources:
relationships:
last_checked:
remaining_uncertainty:
```

Do not add story angles, scripts, or visual directions. Downstream skills must consume this packet without changing its facts.

## Knowledge-base change log

```text
New:
Updated:
Unchanged:
Expired:
Superseded:
Lead-only:
Claims added or changed:
Local save:
Remote dry run:
Remote sync:
```

Do not report a remote sync as successful without returned record identifiers, affected-row counts, or equivalent confirmation.

## Uncertainty labels

- `Verified`: complete official evidence chain.
- `Partially verified`: some claims or controlling documents are missing.
- `Policy effective; application unknown`: valid framework without a current operational notice.
- `Application closed`: current or most recent round ended.
- `Lead only`: not ready for the verified store or publication.
- `Needs local confirmation`: current local implementation was not found.
