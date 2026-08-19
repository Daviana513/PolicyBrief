# PolicyBrief

PolicyBrief `v0.2.1-beta` is an installable Codex Skill for building policy knowledge bases that remain traceable over time. It discovers candidate policies, verifies official evidence, separates policy validity from current application availability, maintains record history, and produces verified policy packets for downstream products.

Its first real-world dataset comes from Taiwan-related policies, but the core workflow can be reused for housing, education, employment, entrepreneurship, talent, and industry-support policies.

## Capabilities

- Discover official policies while keeping non-official material in a lead store.
- Verify audience, amount, duration, restrictions, validity, and application availability.
- Maintain separate `policy_status` and `application_status` values.
- Store one evidence row per material claim.
- Deduplicate records and track implementation, interpretation, and supersession relationships.
- Audit stale links, check dates, lifecycle status, and evidence gaps.
- Write local CSV or Markdown and sync the linked policy and evidence stores with the bundled Notion or Feishu adapter.
- Produce a verified policy packet without generating downstream scripts or content.

## Install

For local setup and testing, ask Codex to install the Skill from the published repository:

```text
Use $skill-installer to install:
https://github.com/Daviana513/PolicyBrief/tree/main/skills/policy-brief
```

Manual installation:

```bash
git clone https://github.com/Daviana513/PolicyBrief.git
mkdir -p ~/.codex/skills
cp -R PolicyBrief/skills/policy-brief ~/.codex/skills/policy-brief
```

Skills under `~/.codex/skills` are available across projects. Codex can also install skills from other repositories with `$skill-installer`. For broader public distribution, OpenAI recommends packaging reusable skills as plugins. See [Build skills](https://learn.chatgpt.com/docs/build-skills).

## Notion setup

Notion is the recommended cloud knowledge base. PolicyBrief includes a dependency-free adapter for Node.js 18 or newer and uses the current Notion data-source API.

1. Create an internal Notion integration with read, insert, and update content capabilities.
2. Create a parent page such as `惠台政策知识库` and connect the integration to it.
3. Copy `.env.example` into the policy project and fill `NOTION_TOKEN` and `NOTION_PARENT_PAGE_ID`.
4. Preview and create the two linked databases:

```bash
cp ~/.codex/skills/policy-brief/.env.example /path/to/policy-project/.env
cd /path/to/policy-project
node ~/.codex/skills/policy-brief/scripts/notion_policy_sync.mjs prepare --dry-run
node ~/.codex/skills/policy-brief/scripts/notion_policy_sync.mjs prepare
```

Save the returned `NOTION_POLICY_DATA_SOURCE_ID` and `NOTION_CLAIM_DATA_SOURCE_ID` in `.env`, then verify and sync:

```bash
node ~/.codex/skills/policy-brief/scripts/notion_policy_sync.mjs preflight
node ~/.codex/skills/policy-brief/scripts/notion_policy_sync.mjs sync --dry-run
node ~/.codex/skills/policy-brief/scripts/notion_policy_sync.mjs sync
```

The adapter creates separate policy and claim databases, adds a claim-to-policy relation, upserts by stable IDs, and preserves unmapped Notion properties. Set `POLICYBRIEF_FIELD_PROFILE=canonical` for the English schema or `zh` for the Taiwan-policy Chinese schema.

## Feishu setup

PolicyBrief includes a dependency-free Feishu Bitable adapter for Node.js 18 or newer. After installing the Skill, copy its `.env.example` into the policy project as `.env`, then fill in that user's Base and self-built application values. The completed `.env` remains private and is ignored by this repository.

```bash
cp ~/.codex/skills/policy-brief/.env.example /path/to/policy-project/.env
cd /path/to/policy-project
node ~/.codex/skills/policy-brief/scripts/feishu_policy_sync.mjs preflight
```

Set `POLICYBRIEF_FIELD_PROFILE=canonical` for the English schema in this repository, or `zh` for the compatible Chinese field set. Paths, table names, table IDs, timeout, and timezone offset are configurable; see [platform sync](skills/policy-brief/references/platform-sync.md).

Only core fields are required for sync. Optional profile fields are mapped when present and reported when absent; users do not need to create every possible field before the first run.

The Feishu adapter remains available for existing projects. If the policy table is accessible but the claim table is unavailable, it completes the local workflow, syncs only the changed policy rows, keeps claims locally, and reports a degraded sync. Preflight checks access and schema; the sync result confirms record-write permission.

## Recommended one-command prompt

Replace the values in brackets and send the complete prompt to Codex. This template covers discovery, verification, deduplication, local maintenance, validation, and authorized remote sync. It selects policies for knowledge-base value, not for video or storytelling potential.

```text
使用 $policy-brief 完成一次政策知识库更新。

执行模式：快速严谨（默认；最多两轮搜索，深度核验目标数量加1个备用候选）
搜索范围：〔地区或行政层级，例如：福建省及下属城市〕
目标对象：〔例如：台湾青年、台湾学生、台湾毕业生〕
政策方向：〔例如：就业、住房、创业、职业发展〕
时间范围：〔例如：最近一年发布，或目前仍然有效〕
目标数量：〔例如：筛选 3 项〕
本地知识库：〔政策表路径〕和〔事实证据表路径〕
远程目标：〔推荐：已配置的 Notion 政策总库和政策事实证据库〕
远程写入授权：〔允许 / 不允许〕
远程降级策略：〔远程不可用时保留已验证本地结果；不要自动建库或重复重试〕

请按以下流程执行：
1. 先读取现有政策表和事实证据表，了解已有记录并查重。
2. 若允许远程写入，立即运行一次只读预检，将远程目标标为完整可用、仅政策表可用或不可用。分别检查写记录和新建表/字段权限；权限不足不是网络错误，不尝试网页绕过或重复建表。
3. 搜索候选政策；搜索结果、媒体和社交内容只能作为线索，最终结论必须回到官方来源。
4. 优先保留与目标对象直接相关、支持内容明确、仍有现实使用价值且现有知识库未充分覆盖的政策。
5. 打开并核验政策正文、附件、官方解读、实施通知和当前申报入口。分别判断政策状态与申请状态，不把“政策有效”写成“现在可以申请”。
6. 将适用对象、支持金额、期限、限制、有效期、申请方式和计算结果拆成独立事实证据；每项重要结论保存官方原文、原文位置、链接、核查日期和必要备注。
7. 将候选项分类为新增、更新、无变化、失效、被替代或仅作线索。不得删除历史记录，不得覆盖未映射的用户字段。
8. 先运行严格校验。只有通过校验的正式政策和事实证据才能写入已核验知识库。
9. 更新本地知识库并执行远程同步预演。若预检结果为“仅政策表可用”，只同步本轮政策，事实证据保留本地并标记待补传；不得因此中止整轮任务。
10. 最后报告：搜索数量、新增、更新、跳过、仅作线索、校验失败、远程新增/更新/失败数量、是否降级同步，以及仍待确认的问题。

如果一次定向补查后仍找不到控制性原文、有效期依据或精确申报日期，请降级为部分核验或线索，不要继续翻查大量目录页，也不要猜测日期。

只完成政策知识库工作，不生成视频选题、故事、脚本、分镜或生图 Prompt。
```

For the current Taiwan-policy project, the bracketed values can point to `惠台政策知识库/policies.csv`, `惠台政策知识库/policy_claims.csv`, and the configured Notion data sources. More focused requests are available in [examples/prompts.md](examples/prompts.md).

## Repository structure

```text
PolicyBrief/
├── README.md
├── docs/
│   ├── agent-skill-design.md
│   ├── fact-checking.md
│   └── vertical-productization.md
├── examples/
│   ├── policy-record.json
│   ├── policy-claims.json
│   └── prompts.md
├── tests/
│   └── test_validator.py
└── skills/
    └── policy-brief/
        ├── SKILL.md
        ├── agents/openai.yaml
        ├── references/
        ├── .env.example
        └── scripts/
            ├── validate_policy_record.py
            ├── notion_policy_sync.mjs
            └── feishu_policy_sync.mjs
```

## Data model

PolicyBrief uses two linked datasets:

- Policy records describe identity, jurisdiction, lifecycle, application status, relationships, and two optional audience filters: applicability and current actionability.
- Claim records connect each material statement to a quotation, source, location, verdict, and check date. Applicant, recipient, materials, and responsible department stay here instead of becoming sparse policy columns.

Legacy Chinese fields such as `政策状态`, `适用对象`, and `证据等级` remain readable. The canonical model adds `申请状态`, `来源类型`, `核验状态`, `政策状态依据链接`, and a separate claim table. When claim records are supplied, strict validation does not require duplicate record-level quotations.

## Validation

Validate the Skill structure:

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/policy-brief
```

Compatibility-check an existing policy store:

```bash
python3 skills/policy-brief/scripts/validate_policy_record.py policies.csv
```

Strictly validate publication-ready policies and claims:

```bash
python3 skills/policy-brief/scripts/validate_policy_record.py \
  examples/policy-record.json \
  --claims examples/policy-claims.json \
  --strict \
  --max-age-days 90
```

The validator checks completeness and internal consistency. It cannot determine whether a domain is genuinely official; the research workflow must verify publisher identity and authority.

Run the regression tests:

```bash
python3 -m unittest discover -s tests -v
```

Run the Feishu adapter's offline self-test:

```bash
node skills/policy-brief/scripts/feishu_policy_sync.mjs self-test
```

Run the Notion adapter's offline self-test:

```bash
node skills/policy-brief/scripts/notion_policy_sync.mjs self-test
```

## Safety boundaries

- Never promote media, social posts, or model output directly into the verified store.
- Never equate policy validity with an open application round.
- Never convert "up to" or "no longer than" into a guarantee.
- Never delete expired or superseded history.
- Never expose platform credentials.
- Never report a remote sync without returned confirmation.

PolicyBrief intentionally stops at a verified policy packet. A future HuiTaiVideo workflow can consume that packet without gaining permission to reinterpret policy facts.

PolicyBrief organizes public information and evidence. It does not provide legal advice, guarantee eligibility, replace an issuing authority's decision, or guarantee that an application remains available after the recorded check date.

## Documentation

- [Agent / Skill design](docs/agent-skill-design.md)
- [Fact-checking system](docs/fact-checking.md)
- [Vertical productization boundary](docs/vertical-productization.md)

## License

MIT
