---
name: zoho-one
description: >
  Read Patriot Conceptions Zoho One products through the production OAuth
  credentials in GCP Secret Manager. Use for Zoho CRM, Books, WorkDrive,
  Vault, Mail, Calendar, Connect, Projects, Directory, People, Recruit, Desk,
  Campaigns, Analytics, and other Zoho One API lookups. Slash command:
  /zoho-one. The legacy /zoho-crm command remains a compatibility alias.
---

# zoho-one

Use the local REST client backed by `pc-application-portal` Secret Manager. Do not use `zohomcp.com` servers.

## Commands

```bash
zoho-one <command>
```

| Command | Purpose |
|---|---|
| `doctor` | CRM v8 canary plus sanitized token-family summary |
| `scopes` | Exact granted OAuth scope names by token alias; never prints credentials |
| `get-url --product books --url 'https://www.zohoapis.com/books/v3/organizations'` | One read-only GET to an official Zoho API URL |
| `search --module Deals --criteria '(Stage:equals:Delivery)'` | Search CRM records |
| `get --module Deals --id 4301…` | Fetch one CRM record |
| `coql --query 'select id, Stage from Deals limit 20'` | Run a CRM COQL read |
| `users` | List CRM users |
| `related --module Deals --id 4301… --list Notes` | Fetch a CRM related list |

The executable is also available as `zoho-crm` for compatibility. New instructions, automation, and MCP configuration should use `zoho-one` and `zoho_one_rest`.

## Token routing

The client prefers a matching Zoho One domain token when available:

- `ZOHO_ONE_WORKPLACE_REFRESH_TOKEN`
- `ZOHO_ONE_GROWTH_REFRESH_TOKEN`
- `ZOHO_ONE_OPERATIONS_REFRESH_TOKEN`
- `ZOHO_ONE_PEOPLE_REFRESH_TOKEN`
- `ZOHO_ONE_FINANCE_REFRESH_TOKEN`
- `ZOHO_ONE_DATA_REFRESH_TOKEN`
- `ZOHO_ONE_DIRECTORY_REFRESH_TOKEN`
- `ZOHO_ONE_CRM_V8_REFRESH_TOKEN`
- `ZOHO_ONE_PROJECTS_REFRESH_TOKEN`
- `ZOHO_ONE_DESK_CREATOR_REFRESH_TOKEN`
- `ZOHO_ONE_CONTENT_VOICE_REFRESH_TOKEN`
- `ZOHO_ONE_MAIL_CALENDAR_REFRESH_TOKEN`

It also supports an optional combined `ZOHO_ONE_REFRESH_TOKEN` and falls back to existing product tokens:

- `ZOHO_CRM_ALL_REFRESH_TOKEN`
- `ZOHO_BOOKS_REFRESH_TOKEN`
- `ZOHO_WORKDRIVE_REFRESH_TOKEN`
- `ZOHO_VAULT_REFRESH_TOKEN`
- `ZOHO_REFRESH_TOKEN` for the older portal multi-product grant

All refresh tokens use either the Self Client or portal client credentials already stored in the same project. Never print or persist token values outside Secret Manager.

## Operating rules

- Default to read-only. The shipped CLI and MCP tools issue GET requests or CRM read queries only.
- A broad OAuth grant does not authorize an unrequested write. Add or run a mutation only after the user asks for that exact external change.
- Prefer narrow product endpoints and bounded page sizes. Do not dump whole CRM modules, mailboxes, drives, or organizations.
- Return IDs, statuses, counts, and aggregate facts by default. Fetch names, addresses, message bodies, documents, or other sensitive fields only when the user requests the specific record or workflow.
- `get-url` accepts only HTTPS URLs on official Zoho or Zoho API domains. It must never forward an OAuth token to another host.
- Keep source, token refresh, API response, and operational acceptance as separate claims.
- Use the response `api_domain` for products that support it. Respect the account's US data center unless the live token says otherwise.

## Scope maintenance

Read [references/scope-manifest.md](references/scope-manifest.md) when creating, rotating, or auditing Zoho One grants. It records the current grant bundles, special CRM v8 gaps, products without a public full-access scope, and the readback gates.

OAuth grant creation and revocation are not ordinary skill reads. Inventory the exact client and grant age first, preserve recent tokens, and require action-time confirmation immediately before creating persistent access or revoking a grant.

Current authorization boundary: the Zoho account used by this skill is not a member of any Recruit service organization. Do not claim Recruit access from the People token or retry Recruit scopes until that product membership changes.

Cliq and Connect scope requests, including a clean one-scope Connect control, fail in this Self Client flow. Continue using the existing portal token for its current narrow Connect access; expanding those products requires a different OAuth client or authorization flow.

## MCP

The stdio server exposes the existing CRM read tools plus:

- `get_zoho_url`
- `list_token_scopes`

It is launched by `zoho.mjs mcp`. Do not register a second copy of the same server under the legacy CRM name.
