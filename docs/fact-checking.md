# PolicyBrief fact-checking system

## Verify claims, not pages

A single policy summary may contain different claims about audience, amount, duration, applicant, deadline, stacking, and application route. One official page may support only some of them.

For example, "Taiwan graduates can receive up to RMB 450,000 for working in Zhangzhou" must be split into degree tier, graduation window, first-time employment, contract term, base subsidy, district match, validity, and current application availability.

## Source and verification are different

`source_type` records whether evidence is policy text, an application notice, an official interpretation, official social media, media, or another source.

`verification_status` records whether the evidence chain is complete, partial, or unverified. An official interpretation can still leave the controlling policy text or application notice missing.

## Policy and application are different

`policy_status` answers whether the framework or measure remains effective.

`application_status` answers whether the target audience can apply now, continuously, later, or no longer in the current round.

Valid outputs include:

```text
Policy effective; current application status unknown.
```

```text
The 2026 round closed; retain the framework and follow the next annual notice.
```

## Claim evidence

Each material statement receives its own row:

```text
claim_id
policy_id
claim_type
claim_text
verdict
source_quote
source_url
source_type
quote_location
checked_at
caveat
```

This is the factual interface between PolicyBrief and future products. A downstream system may simplify language but cannot add facts absent from supported claim rows.

## Time checks

Store publication date, official validity wording, current application window, and last check date separately. Treat calculated dates as calculations, not quotations.

Reject future check dates. Warn when records exceed the project's freshness threshold. Recheck annual calls more frequently than long-running framework policies.

## Number checks

For each amount, record currency, unit, frequency, duration, cap, tier, stacking rule, and applicant. Derived headline amounts require separate component claims and a calculation caveat.

## Relationship checks

Keep framework policies, implementation documents, annual calls, interpretations, and replacements as separate linked records when they have different legal or operational roles.

Use `parent_policy_id` with `implements`, `announces`, `interprets`, or `supersedes`.

## Failed verification is still useful

Keep unresolved candidates in the lead store with the best available source, missing evidence, next department or notice to check, and the reason they cannot be promoted.

## Human responsibility

PolicyBrief organizes public policy information; it does not replace eligibility review, legal advice, or an issuing authority's answer. The validator confirms record completeness, not factual truth or domain ownership.

The operational checklist is bundled in [the Skill reference](../skills/policy-brief/references/fact-checking.md).
