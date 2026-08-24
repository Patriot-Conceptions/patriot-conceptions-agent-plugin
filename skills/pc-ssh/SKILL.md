---
name: pc-ssh
description: Connect to Patriot Conceptions remote Macs and servers over Tailscale by resolving SSH connection metadata and private-key attachments from the authenticated Zoho Vault CLI (`zv`). Use when an agent needs to find, test, connect to, or run a command on a PC remote server without copying SSH keys into source, prompts, logs, or chat.
---

# PC SSH

Use `scripts/pc-ssh` as the only credential retrieval path. Keep Zoho Vault as the write authority for SSH connection metadata and key attachments.

## Preconditions

1. Require `zv`, `python3`, `ssh`, and `ssh-keygen` on the operator's machine.
2. Require an authenticated and unlocked Zoho Vault session. If retrieval fails because Vault is locked or signed out, ask the operator to run `zv login --dc us` and `zv unlock` interactively. Never request, capture, or pass the Vault master password.
3. Require each Vault record to contain:
   - a name ending in `Remote SSH key`;
   - an `ssh://user@host` URL;
   - the SSH user name;
   - exactly one private-key attachment;
   - the tags `ssh,remote` plus a host tag.

## Workflow

1. List matching servers without downloading keys:

   ```bash
   scripts/pc-ssh list [query]
   ```

2. Verify public-key authentication and remote identity:

   ```bash
   scripts/pc-ssh check <server-name-or-host>
   ```

3. Open an interactive SSH session only when requested:

   ```bash
   scripts/pc-ssh connect <server-name-or-host>
   ```

4. Run a bounded remote command when the requested work does not need an interactive shell:

   ```bash
   scripts/pc-ssh exec <server-name-or-host> -- <command> [args...]
   ```

Prefer `check` before `connect` or `exec` when the record is new or changed. Report source retrieval, authentication, and remote readback as separate claims.

## Safety rules

- Never use `zv get --not-safe`, print an attachment, or expose key bytes, tokens, cookies, or Vault exports.
- Download the selected attachment only into a mode-`700` temporary directory. The helper removes it on exit.
- Validate the attachment with `ssh-keygen` before invoking SSH.
- Use public-key-only authentication with `IdentitiesOnly=yes`; do not fall back to passwords or keyboard-interactive authentication.
- Preserve normal SSH host-key verification. Never add `StrictHostKeyChecking=no`.
- Resolve a single unambiguous Vault record. If multiple records match, stop and show only their non-secret names and SSH URLs.
- Do not copy remote keys into a repository, agent history, issue tracker, Slack, or screenshots.
- Treat a reachable host, successful SSH authentication, and successful requested remote work as separate outcomes.
- Do not modify the remote host unless the user's request authorizes that specific change.

## Vault record maintenance

When asked to add or rotate a server, update the one corresponding Zoho Vault record and attach the replacement private key there. Do not create a second writable server registry in this skill or in a repository. After rotation, run `check` and report the remote `whoami`, `hostname`, and home directory without disclosing the key.
