#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PROJECT = "pc-application-portal";
const TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";

function gcloudBin() {
  for (const candidate of ["/opt/homebrew/bin/gcloud", "/usr/local/bin/gcloud"]) {
    if (existsSync(candidate)) return candidate;
  }
  const found = spawnSync("which", ["gcloud"], { encoding: "utf8" });
  if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  throw new Error("gcloud not found");
}

function runGcloud(args, input) {
  const result = spawnSync(gcloudBin(), args, {
    input,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `gcloud exit ${result.status}`);
  return result.stdout.trim();
}

function secret(name) {
  return runGcloud(["secrets", "versions", "access", "latest", "--secret", name, `--project=${PROJECT}`]);
}

function secretExists(name) {
  const result = spawnSync(
    gcloudBin(),
    ["secrets", "describe", name, `--project=${PROJECT}`, "--format=value(name)"],
    { encoding: "utf8" },
  );
  return result.status === 0;
}

function storeSecret(name, value) {
  if (!secretExists(name)) {
    runGcloud([
      "secrets", "create", name, `--project=${PROJECT}`, "--replication-policy=automatic",
      "--labels=purpose=zoho-one-oauth,source=self-client",
    ]);
  }
  runGcloud(["secrets", "versions", "add", name, `--project=${PROJECT}`, "--data-file=-"], value);
}

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return JSON.parse(text);
}

const input = await readStdin();
if (!input?.code || !input?.secretName) throw new Error("code and secretName are required");

const response = await fetch(TOKEN_URL, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code: input.code,
    grant_type: "authorization_code",
    client_id: secret("ZOHO_SELF_CLIENT_ID"),
    client_secret: secret("ZOHO_SELF_CLIENT_SECRET"),
  }),
});
const body = await response.json();
if (!response.ok || !body.refresh_token) {
  throw new Error(body.error_description || body.error || `token exchange HTTP ${response.status}`);
}

storeSecret(input.secretName, body.refresh_token);
const scopes = String(body.scope || "").split(/\s+/).filter(Boolean);
process.stdout.write(JSON.stringify({
  ok: true,
  secret_name: input.secretName,
  scope_count: scopes.length,
  scopes,
  api_domain: body.api_domain || null,
  token_type: body.token_type || null,
  expires_in: body.expires_in || null,
}) + "\n");
