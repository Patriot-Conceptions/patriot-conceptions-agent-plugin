#!/usr/bin/env node
/**
 * Patriot Conceptions Zoho One read-only CLI + stdio MCP.
 * Auth: product and shared OAuth refresh tokens in GCP Secret Manager.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { stdin, stdout, stderr } from "node:process";

const PROJECT = "pc-application-portal";
const TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";
const API_BASE = "https://www.zohoapis.com/crm/v8";
const REFRESH_SKEW_MS = 120_000;
const TOKEN_CONFIGS = {
  zoho_one: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_REFRESH_TOKEN"],
  workplace: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_WORKPLACE_REFRESH_TOKEN"],
  growth: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_GROWTH_REFRESH_TOKEN"],
  operations: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_OPERATIONS_REFRESH_TOKEN"],
  people: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_PEOPLE_REFRESH_TOKEN"],
  finance: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_FINANCE_REFRESH_TOKEN"],
  data: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_DATA_REFRESH_TOKEN"],
  directory: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_DIRECTORY_REFRESH_TOKEN"],
  crm_v8: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_CRM_V8_REFRESH_TOKEN"],
  projects: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_PROJECTS_REFRESH_TOKEN"],
  desk_creator: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_DESK_CREATOR_REFRESH_TOKEN"],
  content_voice: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_CONTENT_VOICE_REFRESH_TOKEN"],
  mail_calendar: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_ONE_MAIL_CALENDAR_REFRESH_TOKEN"],
  crm: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_CRM_ALL_REFRESH_TOKEN"],
  books: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_BOOKS_REFRESH_TOKEN"],
  workdrive: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_WORKDRIVE_REFRESH_TOKEN"],
  vault: ["ZOHO_SELF_CLIENT_ID", "ZOHO_SELF_CLIENT_SECRET", "ZOHO_VAULT_REFRESH_TOKEN"],
  portal: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"],
};
const PRODUCT_TOKEN_PREFERENCES = {
  crm: ["zoho_one", "growth", "crm_v8", "crm", "portal"],
  bigin: ["zoho_one", "growth"],
  bookings: ["zoho_one", "growth"],
  campaigns: ["zoho_one", "growth"],
  salesiq: ["zoho_one", "growth"],
  social: ["zoho_one", "growth"],
  marketing_automation: ["zoho_one", "growth"],
  books: ["zoho_one", "finance", "books"],
  expense: ["zoho_one", "finance"],
  invoice: ["zoho_one", "finance"],
  workdrive: ["zoho_one", "workplace", "workdrive"],
  vault: ["zoho_one", "vault"],
  mail: ["zoho_one", "workplace", "mail_calendar", "portal"],
  calendar: ["zoho_one", "workplace", "mail_calendar", "portal"],
  connect: ["zoho_one", "workplace", "portal"],
  directory: ["zoho_one", "directory", "workplace"],
  cliq: ["zoho_one", "workplace"],
  meeting: ["zoho_one", "workplace"],
  sheet: ["zoho_one", "workplace"],
  show: ["zoho_one", "workplace"],
  writer: ["zoho_one", "workplace", "portal"],
  projects: ["zoho_one", "operations", "projects", "portal"],
  desk: ["zoho_one", "operations", "desk_creator"],
  creator: ["zoho_one", "operations", "desk_creator"],
  backstage: ["zoho_one", "operations", "content_voice"],
  learn: ["zoho_one", "operations", "content_voice"],
  sprints: ["zoho_one", "operations", "projects"],
  sign: ["zoho_one", "operations", "content_voice"],
  voice: ["zoho_one", "operations", "content_voice"],
  people: ["zoho_one", "people"],
  recruit: ["zoho_one"],
  analytics: ["zoho_one", "data"],
  dataprep: ["zoho_one", "data"],
};

function log(...args) {
  stderr.write(`zoho-one: ${args.join(" ")}\n`);
}

function resolveGcloud() {
  for (const candidate of [
    "/opt/homebrew/bin/gcloud",
    "/usr/local/bin/gcloud",
    `${process.env.HOME || ""}/google-cloud-sdk/bin/gcloud`,
  ]) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  const which = spawnSync("which", ["gcloud"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  throw new Error("gcloud not found");
}

function gcloudSecret(name) {
  const bin = resolveGcloud();
  return new Promise((resolve, reject) => {
    const child = spawn(
      bin,
      ["secrets", "versions", "access", "latest", "--secret", name, `--project=${PROJECT}`],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (c) => {
      out += c;
    });
    child.stderr.on("data", (c) => {
      err += c;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && out.trim()) resolve(out.trim());
      else reject(new Error(err.trim() || `gcloud secret ${name} exit ${code}`));
    });
  });
}

const tokenStates = new Map();

async function getAccessToken(alias) {
  const names = TOKEN_CONFIGS[alias];
  if (!names) throw new Error(`unknown token alias: ${alias}`);
  const cached = tokenStates.get(alias);
  if (cached?.accessToken && Date.now() + REFRESH_SKEW_MS < cached.expiresAt) return cached;

  const [clientId, clientSecret, refreshToken] = await Promise.all(names.map(gcloudSecret));
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `token HTTP ${res.status}`);
  }
  const state = {
    accessToken: json.access_token,
    apiDomain: json.api_domain || "https://www.zohoapis.com",
    expiresAt: Date.now() + Number(json.expires_in || 3600) * 1000,
    scopes: String(json.scope || "").split(/\s+/).filter(Boolean),
  };
  tokenStates.set(alias, state);
  log(`refreshed ${alias} access token`);
  return state;
}

async function getProductToken(product = "zoho_one") {
  const aliases = PRODUCT_TOKEN_PREFERENCES[product] || [
    "zoho_one",
    "operations",
    "workplace",
    "growth",
    "people",
    "finance",
    "data",
  ];
  let lastErr = "no configured token";
  for (const alias of aliases) {
    try {
      return { alias, ...(await getAccessToken(alias)) };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`${product} token unavailable: ${lastErr}`);
}

function isTrustedZohoUrl(url) {
  if (url.protocol !== "https:") return false;
  return /(^|\.)(?:zoho|zohoapis|zohocloud)\.(?:com|eu|in|com\.au|jp|ca|sa|com\.cn|ae|uk)$/i.test(
    url.hostname,
  );
}

async function readResponse(res, url) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 20_000) };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || data?.code || text.slice(0, 300) || `HTTP ${res.status}`;
    throw new Error(`Zoho GET ${url.pathname} ${res.status}: ${msg}`);
  }
  return data;
}

async function getZohoUrl(urlValue, { product = "zoho_one", query } = {}) {
  const url = new URL(urlValue);
  if (!isTrustedZohoUrl(url)) throw new Error("URL must be HTTPS on an official Zoho API domain");
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  const token = await getProductToken(product);
  const res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token.accessToken}` } });
  return { token_alias: token.alias, data: await readResponse(res, url) };
}

async function listTokenScopes() {
  const tokens = [];
  for (const alias of Object.keys(TOKEN_CONFIGS)) {
    try {
      const state = await getAccessToken(alias);
      tokens.push({
        alias,
        available: true,
        scope_count: state.scopes.length,
        service_prefixes: [...new Set(state.scopes.map((scope) => scope.split(".")[0]))].sort(),
        scopes: [...state.scopes].sort(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      tokens.push({
        alias,
        available: false,
        error: message.includes("NOT_FOUND") ? "refresh-token secret unavailable" : "token refresh failed",
      });
    }
  }
  return { project: PROJECT, tokens };
}

async function zoho(method, path, { query, json } = {}) {
  const token = await getProductToken("crm");
  const url = new URL(path.startsWith("http") ? path : API_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v == null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${token.accessToken}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
    },
    body: json ? JSON.stringify(json) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 2000) };
  }
  if (!res.ok) {
    const msg =
      data?.message || data?.error || data?.code || text.slice(0, 300) || `HTTP ${res.status}`;
    throw new Error(`Zoho ${method} ${url.pathname} ${res.status}: ${msg}`);
  }
  return data;
}

const TOOLS = [
  {
    name: "search_records",
    description:
      "Search Zoho CRM records in a module (Leads, Deals, Contacts, Intended_Parents, Egg_Donor, etc.).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        module: { type: "string" },
        criteria: { type: "string" },
        word: { type: "string" },
        fields: { type: "string" },
        page: { type: "integer", minimum: 1 },
        per_page: { type: "integer", minimum: 1, maximum: 200 },
      },
      required: ["module"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_record",
    description: "Get one Zoho CRM record by module and record id.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        module: { type: "string" },
        id: { type: "string" },
        fields: { type: "string" },
      },
      required: ["module", "id"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "coql",
    description: "Run a Zoho COQL query. Example: select id, Stage from Deals limit 20",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { select_query: { type: "string" } },
      required: ["select_query"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_users",
    description: "List Zoho CRM users (ActiveUsers by default).",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: {
          type: "string",
          enum: ["AllUsers", "ActiveUsers", "DeactiveUsers", "ConfirmedUsers"],
        },
        page: { type: "integer", minimum: 1 },
        per_page: { type: "integer", minimum: 1, maximum: 200 },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "related_records",
    description: "List related records for a parent CRM record.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        module: { type: "string" },
        id: { type: "string" },
        related_list: { type: "string" },
        page: { type: "integer", minimum: 1 },
        per_page: { type: "integer", minimum: 1, maximum: 200 },
      },
      required: ["module", "id", "related_list"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_zoho_url",
    description: "Make one read-only GET request to an official Zoho API URL with the best configured product token.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        product: { type: "string" },
        url: { type: "string" },
        query: { type: "object", additionalProperties: { type: ["string", "number", "boolean"] } },
      },
      required: ["product", "url"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_token_scopes",
    description: "List configured Zoho token aliases and their granted OAuth scope names without exposing credentials.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
    annotations: { readOnlyHint: true },
  },
];

async function callTool(name, args = {}) {
  switch (name) {
    case "search_records": {
      const query = {
        fields: args.fields,
        page: args.page || 1,
        per_page: args.per_page || 20,
      };
      if (args.criteria) query.criteria = args.criteria;
      if (args.word) query.word = args.word;
      if (!args.criteria && !args.word) {
        return zoho("GET", `/${encodeURIComponent(args.module)}`, {
          query: { fields: args.fields, page: query.page, per_page: query.per_page },
        });
      }
      return zoho("GET", `/${encodeURIComponent(args.module)}/search`, { query });
    }
    case "get_record":
      return zoho("GET", `/${encodeURIComponent(args.module)}/${encodeURIComponent(args.id)}`, {
        query: { fields: args.fields },
      });
    case "coql":
      return zoho("POST", "/coql", { json: { select_query: args.select_query } });
    case "list_users":
      return zoho("GET", "/users", {
        query: {
          type: args.type || "ActiveUsers",
          page: args.page || 1,
          per_page: args.per_page || 50,
        },
      });
    case "related_records":
      return zoho(
        "GET",
        `/${encodeURIComponent(args.module)}/${encodeURIComponent(args.id)}/${encodeURIComponent(args.related_list)}`,
        { query: { page: args.page || 1, per_page: args.per_page || 20 } },
      );
    case "get_zoho_url":
      return getZohoUrl(args.url, { product: args.product, query: args.query });
    case "list_token_scopes":
      return listTokenScopes();
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function printJson(payload) {
  stdout.write(JSON.stringify(payload, null, 2) + "\n");
}

function usage() {
  stderr.write(`Usage:
  zoho-one search --module Deals [--criteria '(Stage:equals:Delivery)'] [--word text] [--fields id,Stage]
  zoho-one get --module Deals --id 4301... [--fields Stage]
  zoho-one coql --query 'select id, Stage from Deals limit 20'
  zoho-one users [--type ActiveUsers]
  zoho-one related --module Deals --id 4301... --list Notes
  zoho-one get-url --product books --url 'https://www.zohoapis.com/books/v3/organizations'
  zoho-one scopes
  zoho-one doctor
  zoho-one mcp

The legacy command name zoho-crm remains as a compatibility alias.
`);
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2).replace(/-/g, "_");
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) flags[key] = true;
    else flags[key] = argv[++i];
  }
  return flags;
}

async function runCli(cmd, flags) {
  switch (cmd) {
    case "search":
      if (!flags.module) throw new Error("--module is required");
      return callTool("search_records", flags);
    case "get":
      if (!flags.module || !flags.id) throw new Error("--module and --id are required");
      return callTool("get_record", flags);
    case "coql": {
      const q = flags.query || flags.select_query;
      if (!q) throw new Error("--query is required");
      return callTool("coql", { select_query: q });
    }
    case "users":
      return callTool("list_users", flags);
    case "related":
      if (!flags.module || !flags.id || !flags.list) {
        throw new Error("--module, --id, and --list are required");
      }
      return callTool("related_records", { ...flags, related_list: flags.list });
    case "get-url": {
      if (!flags.product || !flags.url) throw new Error("--product and --url are required");
      const query = flags.query_json ? JSON.parse(flags.query_json) : undefined;
      return getZohoUrl(flags.url, { product: flags.product, query });
    }
    case "scopes":
      return listTokenScopes();
    case "doctor": {
      const data = await callTool("coql", {
        select_query: "select id, Stage from Deals where Stage is not null limit 1",
      });
      return {
        ok: true,
        project: PROJECT,
        sample_id: data?.data?.[0]?.id || null,
        sample_stage: data?.data?.[0]?.Stage || null,
        api_version: "v8",
        token_summary: (await listTokenScopes()).tokens.map(({ alias, available, scope_count, service_prefixes }) => ({
          alias,
          available,
          scope_count,
          service_prefixes,
        })),
      };
    }
    default:
      usage();
      throw new Error(`unknown command: ${cmd}`);
  }
}

function resultText(id, payload) {
  return {
    jsonrpc: "2.0",
    id,
    result: { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] },
  };
}

function resultError(id, message) {
  return {
    jsonrpc: "2.0",
    id,
    result: { content: [{ type: "text", text: message }], isError: true },
  };
}

function write(msg) {
  stdout.write(JSON.stringify(msg) + "\n");
}

function handleMcp(msg) {
  if (!msg || typeof msg !== "object") return;
  if (!("id" in msg) && typeof msg.method === "string") return;
  const { id, method, params } = msg;
  if (method === "initialize") {
    write({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion || "2025-11-25",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "zoho-one-rest", version: "2.0.0" },
        instructions:
          "Patriot Conceptions Zoho One REST access via GCP OAuth. Tools are read-only unless a future user request explicitly adds a guarded mutation tool.",
      },
    });
    return;
  }
  if (method === "tools/list") {
    write({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }
  if (method === "ping") {
    write({ jsonrpc: "2.0", id, result: {} });
    return;
  }
  if (method === "tools/call") {
    callTool(params?.name, params?.arguments || {})
      .then((data) => write(resultText(id, data)))
      .catch((err) => write(resultError(id, err.message)));
    return;
  }
  write({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
}

function runMcp() {
  let buf = Buffer.alloc(0);
  stdin.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (true) {
      const nl = buf.indexOf("\n");
      if (nl === -1) break;
      const line = buf.slice(0, nl).toString("utf8").replace(/\r$/, "").trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        handleMcp(JSON.parse(line));
      } catch (err) {
        log(`bad message: ${err.message}`);
      }
    }
  });
  stdin.resume();
}

const argv = process.argv.slice(2);
const cmd = argv[0];
if (!cmd || cmd === "mcp" || cmd === "--mcp") {
  if (cmd && argv.includes("--help")) {
    usage();
    process.exit(0);
  }
  if (!cmd) {
    if (stdin.isTTY) {
      usage();
      process.exit(2);
    }
  }
  runMcp();
} else if (cmd === "-h" || cmd === "--help" || cmd === "help") {
  usage();
} else {
  runCli(cmd, parseFlags(argv.slice(1)))
    .then(printJson)
    .catch((err) => {
      log(err.message);
      process.exit(1);
    });
}
