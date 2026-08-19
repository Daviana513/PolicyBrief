#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

const API_VERSION = "2026-03-11";
const REQUEST_TIMEOUT_MS = 20_000;
const WRITE_INTERVAL_MS = 350;
const RELATION_FIELD = "关联政策";

const profiles = {
  zh: {
    policy: [
      ["policy_id", "rich_text"], ["地区", "select"], ["城市", "rich_text"], ["区县", "rich_text"], ["发布机构", "rich_text"],
      ["机构层级", "select"], ["政策标题", "title"], ["文号", "rich_text"], ["发布时间", "date"], ["有效期", "rich_text"],
      ["政策状态", "select"], ["申请状态", "select"], ["惠台适用方式", "select"], ["当前可操作性", "select"],
      ["申请开始日期", "date"], ["申请截止日期", "date"], ["当前申请通知链接", "url"], ["政策状态依据链接", "url"],
      ["政策状态判断", "rich_text"], ["来源类型", "select"], ["核验状态", "select"], ["来源身份说明", "rich_text"],
      ["上位政策ID", "rich_text"], ["关系类型", "select"], ["适用对象", "multi_select"], ["政策类别", "multi_select"],
      ["核心支持内容", "rich_text"], ["政策重要原文", "rich_text"], ["原文位置", "rich_text"], ["官方政策链接", "url"],
      ["官方解读链接", "url"], ["申请或查询入口", "rich_text"], ["最近核查日期", "date"], ["对应视频期数", "rich_text"],
      ["选题状态", "select"], ["证据等级", "select"], ["更新说明", "rich_text"],
    ],
    claims: [
      ["claim_id", "rich_text"], ["policy_id", "rich_text"], ["事实类型", "select"], ["事实表述", "title"],
      ["核验结论", "select"], ["证据原文", "rich_text"], ["证据链接", "url"], ["来源类型", "select"],
      ["原文位置", "rich_text"], ["核查日期", "date"], ["限制说明", "rich_text"],
    ],
    requiredPolicy: ["policy_id", "政策标题", "政策状态", "适用对象", "核心支持内容", "官方政策链接", "最近核查日期"],
    requiredClaims: ["claim_id", "policy_id", "事实类型", "事实表述", "核验结论", "证据原文", "证据链接", "来源类型", "原文位置", "核查日期"],
  },
  canonical: {
    policy: [
      ["policy_id", "rich_text"], ["region", "rich_text"], ["city", "rich_text"], ["district", "rich_text"], ["issuer", "rich_text"],
      ["issuer_level", "select"], ["title", "title"], ["document_number", "rich_text"], ["published_at", "date"],
      ["effective_period", "rich_text"], ["policy_status", "select"], ["application_status", "select"],
      ["audience_applicability", "select"], ["actionability", "select"], ["application_window_start", "date"],
      ["application_window_end", "date"], ["application_notice_url", "url"], ["status_basis_url", "url"], ["status_reason", "rich_text"],
      ["source_type", "select"], ["verification_status", "select"], ["source_identity_note", "rich_text"], ["parent_policy_id", "rich_text"],
      ["relation_type", "select"], ["audience", "multi_select"], ["categories", "multi_select"], ["summary", "rich_text"],
      ["source_quote", "rich_text"], ["quote_location", "rich_text"], ["official_policy_url", "url"],
      ["official_interpretation_url", "url"], ["source_url", "url"], ["application_channel", "rich_text"], ["last_checked", "date"],
      ["video_reference", "rich_text"], ["topic_status", "select"], ["evidence_level", "select"], ["update_note", "rich_text"],
    ],
    claims: [
      ["claim_id", "rich_text"], ["policy_id", "rich_text"], ["claim_type", "select"], ["claim", "title"],
      ["verdict", "select"], ["source_quote", "rich_text"], ["source_url", "url"], ["source_type", "select"],
      ["quote_location", "rich_text"], ["checked_at", "date"], ["caveat", "rich_text"],
    ],
    requiredPolicy: ["policy_id", "title", "policy_status", "audience", "summary", "official_policy_url", "last_checked"],
    requiredClaims: ["claim_id", "policy_id", "claim_type", "claim", "verdict", "source_quote", "source_url", "source_type", "quote_location", "checked_at"],
  },
};

class SyncError extends Error {
  constructor(code, message, nextAction, status) {
    super(message);
    this.code = code;
    this.nextAction = nextAction;
    this.status = status;
  }
}

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function parseEnv(text) {
  const values = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[line.slice(0, index).trim()] = value;
  }
  return values;
}

async function readEnvFile(filePath) {
  try {
    return parseEnv(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function resolveFrom(root, value) {
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

async function loadConfig(command) {
  const initialRoot = path.resolve(process.env.POLICYBRIEF_PROJECT_ROOT || process.cwd());
  const envPath = resolveFrom(initialRoot, argument("env") || process.env.POLICYBRIEF_ENV_FILE || ".env");
  const env = { ...(await readEnvFile(envPath)), ...process.env };
  const projectRoot = resolveFrom(initialRoot, env.POLICYBRIEF_PROJECT_ROOT || ".");
  const kbDir = resolveFrom(projectRoot, env.POLICYBRIEF_KB_DIR || "knowledge-base");
  const profileName = env.POLICYBRIEF_FIELD_PROFILE || "canonical";
  if (!profiles[profileName]) throw new SyncError("invalid_config", `Unknown POLICYBRIEF_FIELD_PROFILE: ${profileName}`, "Use canonical or zh.");
  if (!env.NOTION_TOKEN) throw new SyncError("missing_config", "Missing NOTION_TOKEN.", `Add it to ${envPath}.`);
  const policyDataSourceId = env.NOTION_POLICY_DATA_SOURCE_ID || "";
  const claimDataSourceId = env.NOTION_CLAIM_DATA_SOURCE_ID || "";
  if (command !== "prepare" && (!policyDataSourceId || !claimDataSourceId)) {
    throw new SyncError("missing_config", "Missing Notion data source IDs.", "Run prepare after configuring NOTION_PARENT_PAGE_ID, then save the returned IDs in .env.");
  }
  if (command === "prepare" && (!policyDataSourceId || !claimDataSourceId) && !env.NOTION_PARENT_PAGE_ID) {
    throw new SyncError("missing_config", "NOTION_PARENT_PAGE_ID is required to create the databases.", "Create a Notion parent page, connect the integration, and add its page ID to .env.");
  }
  return {
    env,
    projectRoot,
    policyCsv: env.POLICYBRIEF_POLICY_CSV ? resolveFrom(projectRoot, env.POLICYBRIEF_POLICY_CSV) : path.join(kbDir, "policies.csv"),
    claimCsv: env.POLICYBRIEF_CLAIM_CSV ? resolveFrom(projectRoot, env.POLICYBRIEF_CLAIM_CSV) : path.join(kbDir, "policy_claims.csv"),
    policyDataSourceId,
    claimDataSourceId,
    parentPageId: env.NOTION_PARENT_PAGE_ID || "",
    policyDatabaseName: env.NOTION_POLICY_DATABASE_NAME || (profileName === "zh" ? "政策总库" : "Policy records"),
    claimDatabaseName: env.NOTION_CLAIM_DATABASE_NAME || (profileName === "zh" ? "政策事实证据" : "Policy claims"),
    profileName,
    fields: profiles[profileName],
    timeoutMs: Number(env.POLICYBRIEF_REQUEST_TIMEOUT_MS || REQUEST_TIMEOUT_MS),
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function csvRecords(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function request(config, apiPath, options = {}) {
  let response;
  try {
    response = await fetch(`https://api.notion.com${apiPath}`, {
      ...options,
      signal: AbortSignal.timeout(config.timeoutMs),
      headers: {
        Authorization: `Bearer ${config.env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": API_VERSION,
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const code = error?.name === "TimeoutError" ? "network_timeout" : "network_error";
    throw new SyncError(code, "Could not reach the Notion API.", "Check connectivity before running the command again.");
  }
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new SyncError("invalid_response", "Notion returned a non-JSON response.", "Inspect the service response before running the command again.", response.status);
  }
  if (!response.ok) {
    const nextAction = response.status === 401 ? "Check NOTION_TOKEN." : response.status === 403 || response.status === 404 ? "Connect the integration to the parent page and both databases." : response.status === 429 ? "Wait for the Notion rate-limit window before running sync again." : "Inspect the Notion error before running the command again.";
    throw new SyncError(json.code || "notion_api_error", json.message || "Notion API request failed.", nextAction, response.status);
  }
  return json;
}

function richText(value) {
  const text = String(value ?? "");
  const parts = [];
  for (let index = 0; index < text.length; index += 2000) parts.push({ type: "text", text: { content: text.slice(index, index + 2000) } });
  return parts;
}

function schemaProperties(definitions) {
  return Object.fromEntries(definitions.map(([name, type]) => [name, { [type]: {} }]));
}

async function retrieveDataSource(config, id) {
  return request(config, `/v1/data_sources/${id}`);
}

async function retrieveDatabase(config, id) {
  return request(config, `/v1/databases/${id}`);
}

async function queryPages(config, dataSourceId) {
  const pages = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const json = await request(config, `/v1/data_sources/${dataSourceId}/query`, { method: "POST", body: JSON.stringify(body) });
    pages.push(...(json.results || []).filter((item) => item.object === "page"));
    cursor = json.has_more ? json.next_cursor : null;
  } while (cursor);
  return pages;
}

async function createDatabase(config, name, definitions) {
  const database = await request(config, "/v1/databases", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "page_id", page_id: config.parentPageId },
      title: richText(name),
      is_inline: false,
      initial_data_source: { properties: schemaProperties(definitions) },
    }),
  });
  const complete = await retrieveDatabase(config, database.id);
  const dataSourceId = complete.data_sources?.[0]?.id;
  if (!dataSourceId) throw new SyncError("invalid_response", `Notion created ${name} without returning a data source ID.`, "Open the database and copy its data source ID manually.");
  return { databaseId: database.id, dataSourceId, url: database.url || complete.url };
}

function inspectSchema(dataSource, definitions, required) {
  const expected = new Map(definitions);
  const actual = new Map(Object.entries(dataSource.properties || {}).map(([name, property]) => [name, property.type]));
  const missing = required.filter((name) => !actual.has(name));
  const mismatched = [...expected].filter(([name, type]) => actual.has(name) && actual.get(name) !== type).map(([name, type]) => ({ field: name, expected: type, actual: actual.get(name) }));
  const optionalMissing = [...expected.keys()].filter((name) => !actual.has(name) && !missing.includes(name));
  return { missing, mismatched, optionalMissing, ready: missing.length === 0 && mismatched.length === 0 };
}

async function addMissingProperties(config, dataSourceId, definitions, dataSource) {
  const actual = new Set(Object.keys(dataSource.properties || {}));
  const titleName = Object.entries(dataSource.properties || {}).find(([, property]) => property.type === "title")?.[0];
  const expectedTitle = definitions.find(([, type]) => type === "title")?.[0];
  if (titleName !== expectedTitle) throw new SyncError("schema_mismatch", `The title property must be named ${expectedTitle}, but the data source uses ${titleName || "none"}.`, "Create a new database with prepare or rename the title property in Notion.");
  const properties = Object.fromEntries(definitions.filter(([name]) => !actual.has(name)).map(([name, type]) => [name, { [type]: {} }]));
  if (Object.keys(properties).length) await request(config, `/v1/data_sources/${dataSourceId}`, { method: "PATCH", body: JSON.stringify({ properties }) });
  return Object.keys(properties);
}

async function ensureRelation(config, claimDataSourceId, policyDataSourceId) {
  const claims = await retrieveDataSource(config, claimDataSourceId);
  if (claims.properties?.[RELATION_FIELD]?.type === "relation") return false;
  await request(config, `/v1/data_sources/${claimDataSourceId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { [RELATION_FIELD]: { relation: { data_source_id: policyDataSourceId, type: "single_property", single_property: {} } } } }),
  });
  return true;
}

function propertyValue(value, type) {
  const text = String(value ?? "").trim();
  if (type === "title" || type === "rich_text") return { [type]: richText(text) };
  if (type === "select") return { select: text ? { name: text } : null };
  if (type === "multi_select") return { multi_select: text ? text.split(/[;；]/).map((name) => ({ name: name.trim() })).filter((item) => item.name) : [] };
  if (type === "date") return { date: text ? { start: text } : null };
  if (type === "url") return { url: text || null };
  return null;
}

function propertyPlain(property) {
  if (!property) return null;
  if (property.type === "title" || property.type === "rich_text") return (property[property.type] || []).map((item) => item.plain_text || item.text?.content || "").join("");
  if (property.type === "select") return property.select?.name || "";
  if (property.type === "multi_select") return (property.multi_select || []).map((item) => item.name).sort();
  if (property.type === "date") return property.date?.start || "";
  if (property.type === "url") return property.url || "";
  if (property.type === "relation") return (property.relation || []).map((item) => item.id).sort();
  return null;
}

function intendedPlain(value, type) {
  const text = String(value ?? "").trim();
  if (type === "multi_select") return text ? text.split(/[;；]/).map((item) => item.trim()).filter(Boolean).sort() : [];
  return text;
}

function buildProperties(record, definitions, schema, extra = {}) {
  const properties = {};
  for (const [name, type] of definitions) {
    if (!schema.properties?.[name] || schema.properties[name].type !== type) continue;
    properties[name] = propertyValue(record[name], type);
  }
  return { ...properties, ...extra };
}

function changed(record, page, definitions, schema, extraComparable = {}) {
  for (const [name, type] of definitions) {
    if (!schema.properties?.[name] || schema.properties[name].type !== type) continue;
    if (!isDeepStrictEqual(intendedPlain(record[name], type), propertyPlain(page.properties?.[name]))) return true;
  }
  return Object.entries(extraComparable).some(([name, value]) => !isDeepStrictEqual(value, propertyPlain(page.properties?.[name])));
}

async function upsert(config, { dataSourceId, csvPath, keyField, definitions, dryRun, filter = () => true, extraProperties = () => ({}), extraComparable = () => ({}) }) {
  const schema = await retrieveDataSource(config, dataSourceId);
  const local = csvRecords(parseCsv(await fs.readFile(csvPath, "utf8"))).filter(filter);
  const pages = await queryPages(config, dataSourceId);
  const byKey = new Map(pages.map((page) => [propertyPlain(page.properties?.[keyField]), page]).filter(([key]) => key));
  const summary = { data_source_id: dataSourceId, total_local: local.length, created: 0, updated: 0, skipped: 0, page_ids: [], dry_run: dryRun };
  for (const record of local) {
    const key = String(record[keyField] || "").trim();
    if (!key) {
      summary.skipped += 1;
      continue;
    }
    const existing = byKey.get(key);
    const extras = extraProperties(record);
    const comparableExtras = extraComparable(record);
    if (existing && !changed(record, existing, definitions, schema, comparableExtras)) {
      summary.skipped += 1;
      continue;
    }
    if (dryRun) {
      existing ? summary.updated += 1 : summary.created += 1;
      continue;
    }
    const properties = buildProperties(record, definitions, schema, extras);
    const page = existing
      ? await request(config, `/v1/pages/${existing.id}`, { method: "PATCH", body: JSON.stringify({ properties }) })
      : await request(config, "/v1/pages", { method: "POST", body: JSON.stringify({ parent: { type: "data_source_id", data_source_id: dataSourceId }, properties }) });
    byKey.set(key, page);
    existing ? summary.updated += 1 : summary.created += 1;
    summary.page_ids.push(page.id);
    await new Promise((resolve) => setTimeout(resolve, WRITE_INTERVAL_MS));
  }
  return { summary, byKey };
}

async function preflight(config) {
  const [policySource, claimSource] = await Promise.all([retrieveDataSource(config, config.policyDataSourceId), retrieveDataSource(config, config.claimDataSourceId)]);
  const policy = inspectSchema(policySource, config.fields.policy, config.fields.requiredPolicy);
  const claims = inspectSchema(claimSource, config.fields.claims, config.fields.requiredClaims);
  const relationReady = claimSource.properties?.[RELATION_FIELD]?.type === "relation";
  console.log(JSON.stringify({
    ok: policy.ready && claims.ready,
    sync_mode: policy.ready && claims.ready ? "full" : "blocked",
    notion_api_version: API_VERSION,
    field_profile: config.profileName,
    policy_data_source_id: config.policyDataSourceId,
    claim_data_source_id: config.claimDataSourceId,
    policy_schema: policy,
    claim_schema: claims,
    relation_ready: relationReady,
    next_action: policy.ready && claims.ready ? (relationReady ? "sync" : "run prepare to add the claim-to-policy relation") : "run prepare with schema-write authorization",
  }, null, 2));
  if (!policy.ready || !claims.ready) process.exitCode = 2;
}

async function prepare(config, dryRun) {
  if (dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dry_run: true,
      create_policy_database: !config.policyDataSourceId,
      create_claim_database: !config.claimDataSourceId,
      policy_fields: config.fields.policy.map(([name]) => name),
      claim_fields: [...config.fields.claims.map(([name]) => name), RELATION_FIELD],
    }, null, 2));
    return;
  }
  let policyDataSourceId = config.policyDataSourceId;
  let claimDataSourceId = config.claimDataSourceId;
  let policyCreated = null;
  let claimCreated = null;
  if (!policyDataSourceId) {
    policyCreated = await createDatabase(config, config.policyDatabaseName, config.fields.policy);
    policyDataSourceId = policyCreated.dataSourceId;
  } else {
    await addMissingProperties(config, policyDataSourceId, config.fields.policy, await retrieveDataSource(config, policyDataSourceId));
  }
  if (!claimDataSourceId) {
    claimCreated = await createDatabase(config, config.claimDatabaseName, config.fields.claims);
    claimDataSourceId = claimCreated.dataSourceId;
  } else {
    await addMissingProperties(config, claimDataSourceId, config.fields.claims, await retrieveDataSource(config, claimDataSourceId));
  }
  const relationCreated = await ensureRelation(config, claimDataSourceId, policyDataSourceId);
  console.log(JSON.stringify({
    ok: true,
    dry_run: false,
    policy_database: policyCreated,
    claim_database: claimCreated,
    policy_data_source_id: policyDataSourceId,
    claim_data_source_id: claimDataSourceId,
    relation_created: relationCreated,
    env_updates: {
      NOTION_POLICY_DATA_SOURCE_ID: policyDataSourceId,
      NOTION_CLAIM_DATA_SOURCE_ID: claimDataSourceId,
    },
  }, null, 2));
}

async function sync(config, dryRun) {
  const selected = new Set(process.argv.filter((item) => item.startsWith("--policy-id=")).flatMap((item) => item.slice(12).split(",")).map((item) => item.trim()).filter(Boolean));
  const policyFilter = selected.size ? (record) => selected.has(String(record.policy_id || "").trim()) : () => true;
  const policyResult = await upsert(config, { dataSourceId: config.policyDataSourceId, csvPath: config.policyCsv, keyField: "policy_id", definitions: config.fields.policy, dryRun, filter: policyFilter });
  const claimSchema = await retrieveDataSource(config, config.claimDataSourceId);
  const hasRelation = claimSchema.properties?.[RELATION_FIELD]?.type === "relation";
  const claimResult = await upsert(config, {
    dataSourceId: config.claimDataSourceId,
    csvPath: config.claimCsv,
    keyField: "claim_id",
    definitions: config.fields.claims,
    dryRun,
    filter: selected.size ? (record) => selected.has(String(record.policy_id || "").trim()) : () => true,
    extraProperties: (record) => {
      if (!hasRelation) return {};
      const page = policyResult.byKey.get(String(record.policy_id || "").trim());
      return { [RELATION_FIELD]: { relation: page ? [{ id: page.id }] : [] } };
    },
    extraComparable: (record) => {
      if (!hasRelation) return {};
      const page = policyResult.byKey.get(String(record.policy_id || "").trim());
      return { [RELATION_FIELD]: page ? [page.id] : [] };
    },
  });
  console.log(JSON.stringify({ ok: true, dry_run: dryRun, sync_mode: "full", selected_policy_ids: [...selected], policy: policyResult.summary, claims: claimResult.summary }, null, 2));
}

function selfTest() {
  assert.deepEqual(parseEnv("A=1\nB='two words'\n# C=3"), { A: "1", B: "two words" });
  assert.deepEqual(parseCsv('a,b\n"x,y",z\n'), [["a", "b"], ["x,y", "z"]]);
  assert.deepEqual(propertyValue("A；B", "multi_select"), { multi_select: [{ name: "A" }, { name: "B" }] });
  assert.equal(propertyPlain({ type: "select", select: { name: "有效" } }), "有效");
  assert.equal(richText("x".repeat(2001)).length, 2);
  console.log(JSON.stringify({ ok: true, tests: 5 }, null, 2));
}

function help() {
  console.log("Usage: node notion_policy_sync.mjs <preflight|prepare|sync|self-test> [--dry-run] [--policy-id=ID,...] [--env=PATH]");
}

try {
  const command = process.argv[2] || "preflight";
  if (["help", "--help", "-h"].includes(command)) help();
  else if (command === "self-test") selfTest();
  else {
    const config = await loadConfig(command);
    const dryRun = process.argv.includes("--dry-run");
    if (command === "preflight") await preflight(config);
    else if (command === "prepare") await prepare(config, dryRun);
    else if (command === "sync") await sync(config, dryRun);
    else throw new SyncError("invalid_command", `Unknown command: ${command}`, "Use preflight, prepare, sync, self-test, or help.");
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, category: error.code || "unexpected_error", status: error.status, message: error.message, next_action: error.nextAction || "Inspect the error before running the command again." }, null, 2));
  process.exitCode = 1;
}
