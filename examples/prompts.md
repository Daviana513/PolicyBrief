# Example prompts

## Search and update a knowledge base

```text
Use $policy-brief to search official housing policies for Taiwan students in Fujian.
Read the existing policy and lead stores first. Separate policy validity from current application availability, add claim-level evidence, and report new, updated, expired, superseded, and lead-only records. Update local files only; do not write to a remote platform.
```

## Search with authorized remote sync

```text
Use $policy-brief to find and verify 3 new policies, update my local policy and claim stores, and sync them with the configured Notion adapter. Use the private project .env file and run one read-only preflight before research. After local validation, dry-run and sync only the policy IDs changed in this run. Write policy pages before claim pages so the evidence relation resolves. Do not create remote databases or fields unless I explicitly authorize schema preparation.
```

## Verify a large-number claim

```text
Use $policy-brief to verify: "A Taiwan graduate can receive up to RMB 450,000 for working in Zhangzhou."
Split the claim into audience, degree tier, base subsidy, district match, employment timing, contract term, policy validity, and current application status. Give one evidence row per claim.
```

## Check whether an old policy is usable now

```text
Use $policy-brief to audit this policy. Do not treat an accessible page as proof that it is effective. Check expiry, replacement documents, implementation notices, the current application round, and the service channel. Return policy_status and application_status separately.
```

## Produce a verified downstream packet

```text
Use $policy-brief to turn this verified record into a structured policy packet for a downstream product. Include only verified claims, prohibited or unsupported claims, official links, relationships, check date, and remaining uncertainty. Do not create a title, story, script, storyboard, or image prompt.
```

## Audit a complete policy store

```text
Use $policy-brief to audit policies.csv and policy_claims.csv. Check duplicate IDs, duplicate title/issuer/date combinations, stale check dates, missing application status, broken relationships, unsupported effective-status judgments, and claims without official evidence. Do not modify files until I approve the audit results.
```
