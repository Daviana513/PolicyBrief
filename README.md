# PolicyBrief

PolicyBrief `v0.1.1-beta` is an installable Codex Skill for building policy knowledge bases that remain traceable over time. It discovers candidate policies, verifies official evidence, separates policy validity from current application availability, maintains record history, and produces verified policy packets for downstream products.

Its first real-world dataset comes from Taiwan-related policies, but the core workflow can be reused for housing, education, employment, entrepreneurship, talent, and industry-support policies.

## Capabilities

- Discover official policies while keeping non-official material in a lead store.
- Verify audience, amount, duration, restrictions, validity, and application availability.
- Maintain separate `policy_status` and `application_status` values.
- Store one evidence row per material claim.
- Deduplicate records and track implementation, interpretation, and supersession relationships.
- Audit stale links, check dates, lifecycle status, and evidence gaps.
- Write local CSV or Markdown and sync through an existing authorized Feishu, Notion, or Airtable connector or project adapter.
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
mkdir -p ~/.agents/skills
cp -R PolicyBrief/skills/policy-brief ~/.agents/skills/policy-brief
```

Skills under `~/.agents/skills` are available across projects. Codex can also install skills from other repositories with `$skill-installer`. For broader public distribution, OpenAI recommends packaging reusable skills as plugins. See [Build skills](https://learn.chatgpt.com/docs/build-skills).

## Remote sync requirements

PolicyBrief does not include a universal Feishu, Notion, or Airtable client. Remote write requires an authorized connector or a project-specific adapter, destination IDs, field mappings, and credentials stored outside the repository. Without that setup, the Skill completes research, validation, and local output, then reports that remote sync was skipped.

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
远程目标：〔例如：已配置的飞书政策总库和政策事实证据表〕
远程写入授权：〔允许 / 不允许〕

请按以下流程执行：
1. 先读取现有政策表和事实证据表，了解已有记录并查重。
2. 搜索候选政策；搜索结果、媒体和社交内容只能作为线索，最终结论必须回到官方来源。
3. 优先保留与目标对象直接相关、支持内容明确、仍有现实使用价值且现有知识库未充分覆盖的政策。
4. 打开并核验政策正文、附件、官方解读、实施通知和当前申报入口。分别判断政策状态与申请状态，不把“政策有效”写成“现在可以申请”。
5. 将适用对象、支持金额、期限、限制、有效期、申请方式和计算结果拆成独立事实证据；每项重要结论保存官方原文、原文位置、链接、核查日期和必要备注。
6. 将候选项分类为新增、更新、无变化、失效、被替代或仅作线索。不得删除历史记录，不得覆盖未映射的用户字段。
7. 先运行严格校验。只有通过校验的正式政策和事实证据才能写入已核验知识库。
8. 更新本地知识库。若“远程写入授权”为“允许”，先预演同步，再写入指定平台；同步失败时保留本地结果并如实报告，不得声称上传成功。
9. 最后报告：搜索数量、新增、更新、跳过、仅作线索、校验失败、远程新增/更新/失败数量，以及仍待确认的问题。

如果一次定向补查后仍找不到控制性原文、有效期依据或精确申报日期，请降级为部分核验或线索，不要继续翻查大量目录页，也不要猜测日期。

只完成政策知识库工作，不生成视频选题、故事、脚本、分镜或生图 Prompt。
```

For the current Taiwan-policy project, the bracketed values can point to `惠台政策知识库/policies.csv`, `惠台政策知识库/policy_claims.csv`, and the configured Feishu tables. More focused requests are available in [examples/prompts.md](examples/prompts.md).

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
        └── scripts/validate_policy_record.py
```

## Data model

PolicyBrief uses two linked datasets:

- Policy records describe identity, jurisdiction, lifecycle, application status, and relationships.
- Claim records connect each material statement to a quotation, source, location, verdict, and check date.

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
