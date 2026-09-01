# Patriot Conceptions

Patriot Conceptions helps intended parents explore authorized surrogate profile previews and published Surrogacy Atlas information from an AI assistant.

Use it to:

- Browse and search authorized surrogate profile previews.
- Compare a shortlist of two or three profiles.
- Find published fertility clinics, reproductive attorneys, agencies, and evaluators near a city, state, or shared location.
- Open provider cards with published doctor, service, contact, and sourced-note information when available.
- Compare two to four providers on published facts without ranking them or naming a winner.
- Review published state-planning references and cost-planning categories.
- Continue to Patriot Conceptions when you choose to review a gated profile or begin intake.

## Install

Install **Patriot Conceptions** from the Cursor Marketplace. The same marketplace package is available to Grok Bot accounts that can use Cursor plugins and MCP connectors.

For local validation in a compatible agent client, load this repository as an Agent Plugin. It contains one remote Streamable HTTP MCP connection and requires no API key.

Validate the manifest and exercise all ten live tools without printing returned profile or provider records:

```bash
grok plugin validate .
node scripts/smoke.mjs
```

### PC SSH skill

The repository also publishes the `pc-ssh` Agent Skill for authorized Patriot Conceptions remote-server access through Zoho Vault and Tailscale. Install it globally for every locally detected compatible agent with the open Agent Skills CLI:

```bash
npx skills add Patriot-Conceptions/patriot-conceptions-agent-plugin --skill pc-ssh --global --agent '*' --yes
```

The operator must already have an authenticated, unlocked `zv` session. The skill retrieves and validates the selected SSH key in private temporary storage for each connection; it does not put private keys in the repository or agent configuration.

### Zoho One skill

The repository also publishes the `zoho-one` Agent Skill for Patriot Conceptions Zoho One. It replaces the legacy `zoho-crm` skill (limited CRM-only scope) with a production OAuth client backed by GCP Secret Manager (`pc-application-portal`). Install it globally:

```bash
npx skills add Patriot-Conceptions/patriot-conceptions-agent-plugin --skill zoho-one --global --agent '*' --yes
```

`zoho-one` provides 13 token families (340 scopes) — CRM v8 (105 scopes), Books/Finance (17), Projects + Sprints (82), Desk + Creator (23), Mail + Calendar (18), Directory (12), People, WorkDrive, Vault, Analytics/DataPrep, and legacy portal fallback — via `zoho-one doctor / scopes / search / get / coql / get-url` and MCP `zoho_crm_rest`. The legacy `zoho-crm` CLI remains as a compatibility alias. Do not use `zohomcp.com` MCP proxies; this skill replaces all 13 of them. The `zohomcp.com` proxies have been removed from Hermes (`hermes mcp list` now shows only `zoho_crm_rest`).

## How it works

This package connects to the existing Patriot Conceptions MCP service at:

`https://gpt.patriotconceptions.com/mcp`

The package does not contain or fork the Patriot Conceptions application server. ChatGPT, Claude, Cursor, and Grok Bot use the same ten tool names, schemas, authorization boundaries, Profile Preview source, and published Atlas export. The portable `plugin.json`, Cursor `.cursor-plugin/plugin.json`, `mcp.json`, and compatibility `.mcp.json` all describe one package and the same endpoint; they do not define separate servers.

Hosts that support MCP App UI may render the Profile Preview and Atlas interface. Other hosts receive a complete text result with the same structured facts.

## Boundaries

- Provider results are not quality rankings.
- Provider comparisons do not name a winner.
- State references are planning information, not legal advice.
- Cost information contains published planning categories and does not calculate a personal total or quote.
- The tools do not submit an intake or represent that a profile introduction has been made.
- Full profiles and continuation steps open on Patriot Conceptions only when the user chooses.

## Privacy and support

- [Privacy policy](https://patriotconceptions.com/privacy-policy/#chatgpt-and-claude)
- [Connected-assistant help](https://patriotconceptions.com/help/chatgpt-and-claude/)
- [Data deletion](https://patriotconceptions.com/data-deletion/)
- Support: [info@patriotconceptions.com](mailto:info@patriotconceptions.com)

## License

The package manifest and documentation in this repository are available under the MIT License. The Patriot Conceptions service, data, content, trademarks, and brand assets remain subject to their respective terms and ownership.
