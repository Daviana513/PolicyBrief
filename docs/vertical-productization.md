# Vertical productization boundary

## PolicyBrief as the factual layer

PolicyBrief should remain a complete standalone knowledge product. Vertical applications consume its verified policy packet but do not live inside the Skill.

```text
PolicyBrief
  -> verified policy packet
  -> downstream adapter
  -> video, FAQ, service guide, comparison, or alert
```

This separation lets one verified policy support many products without repeating research or allowing every content workflow to reinterpret the source.

## The verified packet contract

A downstream product receives:

- policy identity and issuer;
- policy and application status;
- audience and geography;
- supported claim rows;
- unsupported or prohibited claims;
- official sources and relationships;
- application channel;
- check date and remaining uncertainty.

It does not receive permission to change amounts, eligibility, duration, validity, or application status.

## Future HuiTaiVideo integration

HuiTaiVideo can later consume the verified packet to select a topic, define a Taiwan-youth scenario, write a Traditional Chinese script, create a storyboard, and generate image prompts.

The integration should use stage gates:

```text
Verified packet
  -> Topic approval
  -> Script approval
  -> Storyboard approval
  -> Image-prompt generation
```

PolicyBrief remains the owner of facts. HuiTaiVideo owns storytelling and production format.

## Other vertical products

The same contract can support:

- student internship or housing guides;
- employment and talent-policy comparisons;
- enterprise application checklists;
- policy-change alerts;
- service-desk FAQs;
- regional policy research.

Each vertical product adds audience rules, output format, and success metrics. It should not copy the complete PolicyBrief workflow or maintain a second policy truth store.

## Product maturity path

### Stage 1: Personal knowledge workflow

Use local CSV or Markdown as the record, with Feishu or Notion for filtering and collaboration.

### Stage 2: Team policy system

Separate leads, verified policies, claim evidence, and downstream usage. Record check dates, owners, and change reasons.

### Stage 3: Reusable vertical platform

Add subscriptions, policy-change monitoring, comparison views, and multiple downstream adapters while keeping one evidence layer.

## Metrics

- supported-claim coverage;
- application-status coverage;
- stale-record rate;
- duplicate-record rate;
- time from discovery to verified packet;
- correction rate after downstream publication;
- reuse of one verified policy across products.
