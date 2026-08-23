#!/usr/bin/env node

import assert from 'node:assert/strict'

const mcpUrl = new URL(process.env.PC_MCP_URL || 'https://gpt.patriotconceptions.com/mcp')
const expectedTools = [
  'open_profile_preview_board',
  'search_profile_previews',
  'compare_profile_previews',
  'continue_profile_shortlist',
  'get_profile_intro_handoff',
  'find_surrogacy_providers',
  'get_surrogacy_provider',
  'compare_surrogacy_providers',
  'get_surrogacy_state_plan',
  'get_surrogacy_cost_assumptions'
]

function parseResponse(text) {
  const raw = String(text || '').trim()
  if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw)
  const data = raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n')
  return data ? JSON.parse(data) : null
}

let requestId = 0
async function request(method, params = {}) {
  requestId += 1
  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'x-pc-client': 'cursor-marketplace'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params })
  })
  const payload = parseResponse(await response.text())
  assert.equal(response.ok, true, `${method} returned HTTP ${response.status}`)
  assert.ok(payload, `${method} returned no JSON-RPC payload`)
  assert.equal(payload.error, undefined, payload.error?.message || `${method} returned an error`)
  return payload.result
}

async function callTool(name, args) {
  const result = await request('tools/call', { name, arguments: args })
  assert.notEqual(result?.isError, true, `${name} returned isError`)
  assert.ok(Array.isArray(result?.content), `${name} returned no content`)
  assert.ok(result.content.some((block) => block.type === 'text' && block.text?.trim()), `${name} returned no text`)
  return result
}

await request('initialize', {
  protocolVersion: '2025-03-26',
  capabilities: {},
  clientInfo: { name: 'patriot-conceptions-agent-plugin-smoke', version: '1.0.0' }
})

const listed = await request('tools/list')
assert.deepEqual(listed.tools.map((tool) => tool.name), expectedTools)

const board = await callTool('open_profile_preview_board', { limit: 2, page: 0 })
const cards = board.structuredContent?.board?.cards || []
assert.ok(cards.length >= 2, 'Profile Preview returned fewer than two authorized previews')
assert.equal(new URL(board.structuredContent.board.handoffUrl).searchParams.get('source'), 'cursor_marketplace')

await callTool('search_profile_previews', { limit: 1, page: 0 })
await callTool('compare_profile_previews', { cards: cards.slice(0, 2) })

const continuation = await callTool('continue_profile_shortlist', { selectedCount: 2 })
const continuationUrl = new URL(continuation.structuredContent.handoffUrl)
assert.equal(continuationUrl.searchParams.get('source'), 'cursor_marketplace')
for (const card of cards) {
  assert.equal(continuationUrl.toString().includes(card.candidateId), false, 'Continuation URL contains a candidate ID')
}

const intro = await callTool('get_profile_intro_handoff', { candidateId: cards[0].candidateId })
assert.equal(new URL(intro.structuredContent.profileUrl).searchParams.get('source'), 'cursor_marketplace')

const providers = await callTool('find_surrogacy_providers', { state: 'CA', limit: 4, page: 0 })
const providerRows = providers.structuredContent?.atlas?.providers || []
const providerIds = providerRows.map((provider) => provider.providerId).filter(Boolean)
assert.ok(providerIds.length >= 2, 'Atlas returned fewer than two California providers')

await callTool('get_surrogacy_provider', { providerId: providerIds[0] })
await callTool('compare_surrogacy_providers', { providerIds: providerIds.slice(0, 2) })
await callTool('get_surrogacy_state_plan', { state: 'CA' })
await callTool('get_surrogacy_cost_assumptions', {})

process.stdout.write(`${JSON.stringify({
  ok: true,
  endpoint: mcpUrl.origin,
  toolCount: listed.tools.length,
  toolsExercised: expectedTools.length,
  profilePreviewCount: cards.length,
  atlasProviderCount: providerRows.length,
  attribution: continuationUrl.searchParams.get('source'),
  candidateIdsInContinuationUrl: false
}, null, 2)}\n`)
