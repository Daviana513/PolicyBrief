#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

const requestTimeoutDefault = 20_000;

const fieldProfiles = {
  zh: {
    policy: [
      ["policy_id", 1], ["地区", 3], ["城市", 1], ["区县", 1], ["发布机构", 1], ["机构层级", 3],
      ["政策标题", 1], ["文号", 1], ["发布时间", 5], ["有效期", 1], ["政策状态", 3], ["申请状态", 3],
      ["申请开始日期", 5], ["申请截止日期", 5], ["当前申请通知链接", 15], ["政策状态依据链接", 15],
      ["政策状态判断", 1], ["来源类型", 3], ["核验状态", 3], ["来源身份说明", 1], ["上位政策ID", 1],
      ["关系类型", 3], ["适用对象", 4], ["政策类别", 4], ["核心支持内容", 1], ["政策重要原文", 1],
      ["原文位置", 1], ["官方政策链接", 15], ["官方解读链接", 15], ["申请或查询入口", 1], ["最近核查日期", 5],
      ["对应视频期数", 1], ["选题状态", 3], ["证据等级", 3], ["更新说明", 1],
    ],
    claims: [
      ["claim_id", 1], ["policy_id", 1], ["事实类型", 3], ["事实表述", 1], ["核验结论", 3],
      ["证据原文", 1], ["证据链接", 15], ["来源类型", 3], ["原文位置", 1], ["核查日期", 5], ["限制说明", 1],
    ],
    requiredPolicy: ["policy_id", "地区", "发布机构", "政策标题", "政策状态", "申请状态", "适用对象", "政策类别", "核心支持内容", "来源类型", "核验状态", "最近核查日期"],
    requiredClaims: ["claim_id", "policy_id", "事实类型", "事实表述", "核验结论", "证据原文", "证据链接", "来源类型", "原文位置", "核查日期"],
  },
  canonical: {
    policy: [
      ["policy_id", 1], ["region", 1], ["city", 1], ["district", 1], ["issuer", 1], ["issuer_level", 3],
      ["title", 1], ["document_number", 1], ["published_at", 5], ["effective_period", 1], ["policy_status", 3],
      ["application_status", 3], ["application_window_start", 5], ["application_window_end", 5], ["application_notice_url", 15],
      ["status_basis_url", 15], ["status_reason", 1], ["audience", 4], ["categories", 4], ["summary", 1], ["source_quote", 1],
      ["quote_location", 1], ["official_policy_url", 15], ["official_interpretation_url", 15], ["source_url", 15], ["source_type", 3],
      ["source_identity_note", 1], ["verification_status", 3], ["application_channel", 1], ["last_checked", 5],
      ["parent_policy_id", 1], ["relation_type", 3], ["supersedes", 1], ["superseded_by", 1], ["content_id", 1],
      ["topic_status", 3], ["update_note", 1],
    ],
    claims: [
      ["claim_id", 1], ["policy_id", 1], ["claim_type", 3], ["claim_text", 1], ["verdict", 3],
      ["source_quote", 1], ["source_url", 15], ["source_type", 3], ["quote_location", 1], ["checked_at", 5], ["caveat", 1],
    ],
    requiredPolicy: ["policy_id", "region", "issuer", "title", "policy_status", "application_status", "audience", "categories", "summary", "source_type", "verification_status", "last_checked"],
    requiredClaims: ["claim_id", "policy_id", "claim_type", "claim_text", "verdict", "source_quote", "source_url", "source_type", "quote_location", "checked_at"],
  },
};

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const index = line.indexOf("=");
    const value = line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    return [line.slice(0, index).trim(), value];
  }));
}

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? "";
}

function resolveFrom(base, value) {
  return path.resolve(base, value);
}

async function readEnvFile(envPath) {
  try {
    return parseEnv(await fs.readFile(envPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function loadConfig() {
  const initialRoot = path.resolve(process.env.POLICYBRIEF_PROJECT_ROOT || process.cwd());
  const envPath = resolveFrom(initialRoot, argument("env") || process.env.POLICYBRIEF_ENV_FILE || ".env");
  const env = { ...(await readEnvFile(envPath)), ...process.env };
  const projectRoot = resolveFrom(initialRoot, env.POLICYBRIEF_PROJECT_ROOT || ".");
  const kbDir = resolveFrom(projectRoot, env.POLICYBRIEF_KB_DIR || "惠台政策知识库");
  const fieldProfile = env.POLICYBRIEF_FIELD_PROFILE || "zh";
  if (!fieldProfiles[fieldProfile]) throw new SyncBlockedError("invalid_config", `Unknown POLICYBRIEF_FIELD_PROFILE: ${fieldProfile}`, "Use zh or canonical.");
  const required = ["FEISHU_APP_ID", "FEISHU_APP_SECRET", "FEISHU_BITABLE_APP_TOKEN", "FEISHU_POLICY_TABLE_ID"].filter((key) => !env[key]);
  if (required.length) throw new SyncBlockedError("missing_config", `Missing configuration: ${required.join(", ")}`, `Create ${envPath} from the bundled .env.example or export the variables.`);
  const timeout = Number(env.POLICYBRIEF_REQUEST_TIMEOUT_MS || requestTimeoutDefault);
  if (!Number.isFinite(timeout) || timeout < 1_000) throw new SyncBlockedError("invalid_config", "POLICYBRIEF_REQUEST_TIMEOUT_MS must be at least 1000.", "Use a timeout such as 20000.");
  return {
    env,
    envPath,
    projectRoot,
    kbDir,
    policyCsv: env.POLICYBRIEF_POLICY_CSV ? resolveFrom(projectRoot, env.POLICYBRIEF_POLICY_CSV) : path.join(kbDir, "policies.csv"),
    claimCsv: env.POLICYBRIEF_CLAIM_CSV ? resolveFrom(projectRoot, env.POLICYBRIEF_CLAIM_CSV) : path.join(kbDir, "policy_claims.csv"),
    policyTableName: env.FEISHU_POLICY_TABLE_NAME || "政策总库",
    claimTableName: env.FEISHU_CLAIM_TABLE_NAME || "政策事实证据",
    policyTableId: env.FEISHU_POLICY_TABLE_ID,
    claimTableId: env.FEISHU_CLAIM_TABLE_ID || "",
    fieldProfile,
    fields: fieldProfiles[fieldProfile],
    requestTimeoutMs: timeout,
    timezoneOffset: env.POLICYBRIEF_TIMEZONE_OFFSET || "+08:00",
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function csvRecords([headers, ...rows]) {
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))).filter((record) => Object.values(record).some(Boolean));
}

class FeishuApiError extends Error {
  constructor(status, code, message, method, url) {
    super(message);
    Object.assign(this, { status, code, method, url });
  }
}

class SyncBlockedError extends Error {
  constructor(category, message, nextAction) {
    super(message);
    Object.assign(this, { category, nextAction });
  }
}

async function requestJson(config, url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(config.requestTimeoutMs),
      headers: { "Content-Type": "application/json; charset=utf-8", ...(options.headers ?? {}) },
    });
  } catch (error) {
    if (error?.name === "TimeoutError") throw new SyncBlockedError("network_timeout", `Feishu request exceeded ${config.requestTimeoutMs / 1000}s.`, "Retry once; if it repeats, keep the validated local result.");
    throw new SyncBlockedError("network_error", "Could not reach the Feishu API.", "Retry once outside a restricted network; if it repeats, keep the validated local result.");
  }
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new SyncBlockedError("invalid_response", "Feishu returned a non-JSON response.", "Retry once, then inspect the service status if it repeats.");
  }
  if (!response.ok || (json.code !== undefined && json.code !== 0)) throw new FeishuApiError(response.status, json.code, json.msg ?? "Feishu API request failed", options.method ?? "GET", url);
  return json;
}

async function getToken(config) {
  const json = await requestJson(config, "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    body: JSON.stringify({ app_id: config.env.FEISHU_APP_ID, app_secret: config.env.FEISHU_APP_SECRET }),
  });
  return json.tenant_access_token;
}

function api(config, token, apiPath, options = {}) {
  return requestJson(config, `https://open.feishu.cn/open-apis${apiPath}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) } });
}

async function listTables(config, token) {
  const json = await api(config, token, `/bitable/v1/apps/${config.env.FEISHU_BITABLE_APP_TOKEN}/tables`);
  return json.data?.items ?? [];
}

async function createTable(config, token, name, primaryField) {
  const json = await api(config, token, `/bitable/v1/apps/${config.env.FEISHU_BITABLE_APP_TOKEN}/tables`, {
    method: "POST",
    body: JSON.stringify({ table: { name, default_view_name: "全部记录", fields: [{ field_name: primaryField, type: 1 }] } }),
  });
  return json.data?.table_id;
}

async function listFields(config, token, tableId) {
  const json = await api(config, token, `/bitable/v1/apps/${config.env.FEISHU_BITABLE_APP_TOKEN}/tables/${tableId}/fields?page_size=100`);
  return json.data?.items ?? [];
}

function createField(config, token, tableId, [fieldName, type]) {
  return api(config, token, `/bitable/v1/apps/${config.env.FEISHU_BITABLE_APP_TOKEN}/tables/${tableId}/fields`, {
    method: "POST",
    body: JSON.stringify({ field_name: fieldName, type }),
  });
}

async function listRecords(config, token, tableId) {
  const items = [];
  let pageToken = "";
  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (pageToken) query.set("page_token", pageToken);
    const json = await api(config, token, `/bitable/v1/apps/${config.env.FEISHU_BITABLE_APP_TOKEN}/tables/${tableId}/records?${query}`);
    items.push(...(json.data?.items ?? []));
    pageToken = json.data?.page_token ?? "";
  } while (pageToken);
  return items;
}

function normalizeDate(config, value) {
  const timestamp = Date.parse(`${value}T00:00:00${config.timezoneOffset}`);
  return Number.isNaN(timestamp) ? value : timestamp;
}

function fieldsPayload(config, record, fieldTypeByName, allowedFields) {
  const fields = {};
  for (const key of allowedFields) {
    const value = String(record[key] ?? "").trim();
    if (!value || !fieldTypeByName.has(key)) continue;
    const type = fieldTypeByName.get(key);
    fields[key] = type === 5 ? normalizeDate(config, value) : type === 4 ? value.split(/[;；]/).map((item) => item.trim()).filter(Boolean) : type === 15 && /^https?:\/\//.test(value) ? { text: value, link: value } : value;
  }
  return fields;
}

function comparable(value, type) {
  if (type === 15 && value && typeof value === "object") return value.link ?? value.text ?? "";
  if (type === 4) return [...(Array.isArray(value) ? value : [])].map(String).sort();
  if (type === 5) return Number(value);
  return String(value ?? "");
}

function payloadChanged(payload, remoteFields, fieldTypeByName) {
  return Object.entries(payload).some(([key, value]) => !isDeepStrictEqual(comparable(value, fieldTypeByName.get(key)), comparable(remoteFields[key], fieldTypeByName.get(key))));
}

async function upsertRecords(config, token, { tableId, csvPath, keyField, definitions, dryRun, recordFilter = () => true }) {
  const fields = await listFields(config, token, tableId);
  const fieldTypeByName = new Map(fields.map((field) => [field.field_name, field.type]));
  const local = csvRecords(parseCsv(await fs.readFile(csvPath, "utf8"))).filter(recordFilter);
  const remote = await listRecords(config, token, tableId);
  const byKey = new Map(remote.map((item) => [String(item.fields?.[keyField] ?? ""), item]).filter(([key]) => key));
  const summary = { table_id: tableId, total_local: local.length, created: 0, updated: 0, skipped: 0, record_ids: [], dry_run: dryRun };
  for (const record of local) {
    const key = String(record[keyField] ?? "").trim();
    if (!key) {
      summary.skipped += 1;
      continue;
    }
    const payload = fieldsPayload(config, record, fieldTypeByName, definitions.map(([name]) => name));
    const existing = byKey.get(key);
    if (existing && !payloadChanged(payload, existing.fields ?? {}, fieldTypeByName)) {
      summary.skipped += 1;
      continue;
    }
    if (dryRun) {
      existing ? summary.updated += 1 : summary.created += 1;
      continue;
    }
    const endpoint = `/bitable/v1/apps/${config.env.FEISHU_BITABLE_APP_TOKEN}/tables/${tableId}/records${existing ? `/${existing.record_id}` : ""}`;
    const json = await api(config, token, endpoint, { method: existing ? "PUT" : "POST", body: JSON.stringify({ fields: payload }) });
    const recordId = json.data?.record?.record_id ?? existing?.record_id;
    existing ? summary.updated += 1 : summary.created += 1;
    if (recordId) summary.record_ids.push(recordId);
  }
  return summary;
}

async function context(config) {
  const token = await getToken(config);
  let tables = [];
  let claimTableId = config.claimTableId;
  if (!claimTableId) {
    try {
      tables = await listTables(config, token);
    } catch (error) {
      if (!(error instanceof FeishuApiError && error.code === 1254302)) throw error;
    }
    claimTableId = tables.find((table) => table.name === config.claimTableName)?.table_id ?? "";
  }
  return { config, token, tables, claimTableId };
}

async function inspectSchema(ctx) {
  const policy = await listFields(ctx.config, ctx.token, ctx.config.policyTableId);
  let claims = [];
  let claimTableAccess = ctx.claimTableId ? "available" : "missing";
  if (ctx.claimTableId) {
    try {
      claims = await listFields(ctx.config, ctx.token, ctx.claimTableId);
    } catch (error) {
      if (!(error instanceof FeishuApiError && error.code === 1254302)) throw error;
      claimTableAccess = "denied";
    }
  }
  const policyNames = new Set(policy.map((field) => field.field_name));
  const claimNames = new Set(claims.map((field) => field.field_name));
  const missingPolicyFields = ctx.config.fields.requiredPolicy.filter((name) => !policyNames.has(name));
  const missingClaimFields = ctx.config.fields.requiredClaims.filter((name) => !claimNames.has(name));
  const unmappedPolicyFields = ctx.config.fields.policy.map(([name]) => name).filter((name) => !policyNames.has(name));
  const unmappedClaimFields = ctx.config.fields.claims.map(([name]) => name).filter((name) => !claimNames.has(name));
  return {
    missingPolicyFields,
    missingClaimFields,
    unmappedPolicyFields,
    unmappedClaimFields,
    policyReady: missingPolicyFields.length === 0,
    claimsReady: claimTableAccess === "available" && missingClaimFields.length === 0,
    claimTableAccess,
  };
}

function chooseSyncMode({ policyReady, claimsReady, policiesOnly, requireClaims }) {
  if (!policyReady) return { mode: "blocked", reason: "policy_schema_incomplete" };
  if (policiesOnly) return { mode: "policy-only", reason: "requested" };
  if (claimsReady) return { mode: "full", reason: null };
  if (requireClaims) return { mode: "blocked", reason: "claim_schema_incomplete" };
  return { mode: "policy-only", reason: "claim_schema_incomplete" };
}

async function preflight(config) {
  const ctx = await context(config);
  const schema = await inspectSchema(ctx);
  const decision = chooseSyncMode({ ...schema, policiesOnly: false, requireClaims: false });
  console.log(JSON.stringify({
    ok: decision.mode !== "blocked",
    full_sync_ready: decision.mode === "full",
    sync_mode: decision.mode,
    field_profile: config.fieldProfile,
    policy_table_id: config.policyTableId,
    claim_table_id: ctx.claimTableId || null,
    claim_table_access: schema.claimTableAccess,
    policy_csv: config.policyCsv,
    claim_csv: config.claimCsv,
    missing_policy_fields: schema.missingPolicyFields,
    missing_claim_fields: schema.missingClaimFields,
    optional_policy_fields_not_mapped: schema.unmappedPolicyFields.filter((name) => !schema.missingPolicyFields.includes(name)),
    optional_claim_fields_not_mapped: schema.unmappedClaimFields.filter((name) => !schema.missingClaimFields.includes(name)),
    next_action: decision.mode === "full" ? "sync" : decision.mode === "policy-only" ? "sync with automatic policy-only fallback; keep claims local" : `repair the ${config.policyTableName} schema before syncing`,
  }, null, 2));
  if (decision.mode === "blocked") process.exitCode = 2;
}

async function check(config) {
  const ctx = await context(config);
  const schema = await inspectSchema(ctx);
  const policyRecords = await listRecords(config, ctx.token, config.policyTableId);
  console.log(JSON.stringify({
    ok: schema.policyReady && schema.claimsReady,
    field_profile: config.fieldProfile,
    policy_table_id: config.policyTableId,
    claim_table_id: ctx.claimTableId || null,
    claim_table_access: schema.claimTableAccess,
    missing_policy_fields: schema.missingPolicyFields,
    missing_claim_fields: schema.missingClaimFields,
    policy_record_count: policyRecords.length,
  }, null, 2));
  if (!schema.policyReady || !schema.claimsReady) process.exitCode = 2;
}

async function prepare(config, { dryRun }) {
  const ctx = await context(config);
  const schema = await inspectSchema(ctx);
  if (schema.claimTableAccess === "denied") throw new SyncBlockedError("claim_table_access_denied", `The app role cannot access ${config.claimTableName}.`, "Grant the app role access to the claim table before changing schema.");
  const missingPolicy = config.fields.policy.filter(([name]) => schema.unmappedPolicyFields.includes(name));
  let claimTableId = ctx.claimTableId;
  const createdClaimTable = !claimTableId;
  if (!dryRun) {
    for (const field of missingPolicy) await createField(config, ctx.token, config.policyTableId, field);
    if (!claimTableId) claimTableId = await createTable(config, ctx.token, config.claimTableName, "claim_id");
  }
  const claimExisting = new Set(claimTableId ? (await listFields(config, ctx.token, claimTableId)).map((field) => field.field_name) : []);
  const missingClaims = config.fields.claims.filter(([name]) => !claimExisting.has(name));
  if (!dryRun) {
    for (const field of missingClaims) if (field[0] !== "claim_id") await createField(config, ctx.token, claimTableId, field);
  }
  console.log(JSON.stringify({ ok: true, dry_run: dryRun, created_claim_table: createdClaimTable && !dryRun, claim_table_id: claimTableId || null, policy_fields_to_create: missingPolicy.map(([name]) => name), claim_fields_to_create: missingClaims.map(([name]) => name) }, null, 2));
}

async function sync(config, { dryRun, policiesOnly, requireClaims }) {
  const ctx = await context(config);
  const schema = await inspectSchema(ctx);
  const decision = chooseSyncMode({ ...schema, policiesOnly, requireClaims });
  const selectedPolicyIds = new Set(process.argv.filter((arg) => arg.startsWith("--policy-id=")).flatMap((arg) => arg.slice("--policy-id=".length).split(",")).map((id) => id.trim()).filter(Boolean));
  const policyFilter = selectedPolicyIds.size ? (record) => selectedPolicyIds.has(String(record.policy_id ?? "").trim()) : () => true;
  if (decision.mode === "blocked") {
    const policyProblem = decision.reason === "policy_schema_incomplete";
    throw new SyncBlockedError(decision.reason, policyProblem ? `Missing policy fields: ${schema.missingPolicyFields.join(", ")}` : `Missing or incomplete Feishu table: ${config.claimTableName}`, policyProblem ? "Run prepare with schema-write permission." : "Rerun without --require-claims to use policy-only fallback.");
  }
  const policy = await upsertRecords(config, ctx.token, { tableId: config.policyTableId, csvPath: config.policyCsv, keyField: "policy_id", definitions: config.fields.policy, dryRun, recordFilter: policyFilter });
  if (decision.mode === "policy-only") {
    console.log(JSON.stringify({ ok: true, dry_run: dryRun, degraded: decision.reason !== "requested", sync_mode: decision.mode, selected_policy_ids: [...selectedPolicyIds], policy, claims: { skipped: true, reason: decision.reason, local_copy: config.claimCsv } }, null, 2));
    return;
  }
  const claims = await upsertRecords(config, ctx.token, { tableId: ctx.claimTableId, csvPath: config.claimCsv, keyField: "claim_id", definitions: config.fields.claims, dryRun, recordFilter: policyFilter });
  console.log(JSON.stringify({ ok: true, dry_run: dryRun, degraded: false, sync_mode: decision.mode, selected_policy_ids: [...selectedPolicyIds], policy, claims }, null, 2));
}

function selfTest() {
  assert.deepEqual(parseEnv("A=1\nB='two words'\n# C=3"), { A: "1", B: "two words" });
  assert.deepEqual(parseCsv('a,b\n"x,y",z\n'), [["a", "b"], ["x,y", "z"]]);
  assert.deepEqual(chooseSyncMode({ policyReady: true, claimsReady: false, policiesOnly: false, requireClaims: false }), { mode: "policy-only", reason: "claim_schema_incomplete" });
  assert.equal(payloadChanged({ a: "x" }, { a: "x" }, new Map([["a", 1]])), false);
  assert.equal(payloadChanged({ a: "x" }, { a: "y" }, new Map([["a", 1]])), true);
  console.log(JSON.stringify({ ok: true, tests: 5 }, null, 2));
}

function help() {
  console.log("Usage: node feishu_policy_sync.mjs <preflight|check|prepare|sync|self-test> [--dry-run] [--policy-id=ID,...] [--policies-only] [--require-claims] [--env=PATH]");
}

let activeConfig;
try {
  const command = process.argv[2] ?? "preflight";
  if (["help", "--help", "-h"].includes(command)) help();
  else if (command === "self-test") selfTest();
  else {
    activeConfig = await loadConfig();
    const options = { dryRun: process.argv.includes("--dry-run"), policiesOnly: process.argv.includes("--policies-only"), requireClaims: process.argv.includes("--require-claims") };
    if (command === "preflight") await preflight(activeConfig);
    else if (command === "check") await check(activeConfig);
    else if (command === "prepare") await prepare(activeConfig, options);
    else if (command === "sync") await sync(activeConfig, options);
    else throw new SyncBlockedError("invalid_command", `Unknown command: ${command}`, "Use preflight, check, prepare, sync, self-test, or help.");
  }
} catch (error) {
  const roleDenied = error instanceof FeishuApiError && error.code === 1254302;
  const schemaDenied = roleDenied && (error.url?.includes("/fields") || (error.method === "POST" && error.url?.endsWith("/tables")));
  const recordDenied = roleDenied && error.method !== "GET" && !schemaDenied;
  const target = activeConfig && error.url?.includes(`/tables/${activeConfig.policyTableId}/`) ? activeConfig.policyTableName : activeConfig?.claimTableName ?? "configured table";
  console.error(JSON.stringify({
    ok: false,
    error_category: schemaDenied ? "schema_write_denied" : recordDenied ? "record_write_denied" : roleDenied ? "table_access_denied" : error.category ?? (error instanceof FeishuApiError ? "feishu_api_error" : "unexpected_error"),
    status: error.status,
    code: error.code,
    message: roleDenied ? `The app role cannot perform this operation on ${target}.` : error.message,
    next_action: schemaDenied ? "Grant schema-management permission or create the fields manually." : roleDenied ? `Grant the app role access to ${target}; do not retry as a network error.` : error.nextAction ?? "Keep the validated local result and inspect the error before retrying.",
  }, null, 2));
  process.exitCode = 1;
}
