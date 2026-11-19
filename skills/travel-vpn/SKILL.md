---
name: travel-vpn
description: Set up, optimize, share, and tear down a fast Cloudflare-accelerated proxy relay (`sing-box` VLESS+WebSocket+h2mux over a QUIC `cloudflared` tunnel) to an owned macOS exit host behind NAT. Use when traveling behind restrictive networks (such as China) where commercial VPNs are blocked and Tailscale exit nodes fall back to slow TCP DERP relays.
---

# Travel VPN

Turn any SSH-reachable macOS host in a clean network (even behind symmetric NAT with no port forwarding) into a **15–25+ Mbps** low-latency travel relay over Cloudflare's Anycast backbone.

## Why this beats a Tailscale exit node behind the GFW

When direct UDP hole punching fails (symmetric office NAT and/or cross-border UDP filtering), Tailscale relays WireGuard over a single TCP DERP stream. Packet loss on the outer DERP stream causes TCP-over-TCP meltdown (often 0.05–1.4 Mbps and 1,000+ ms latency).

This skill routes around DERP:

`Travel Mac (Wi-Fi en0) -> Cloudflare Edge (e.g. HKG, TLS 1.3 + WS + h2mux) -> Cloudflare Backbone -> Office Mac (QUIC cloudflared + sing-box VLESS) -> Open Internet`

Key performance choices built into `scripts/travel-vpn`:
- **Direct Cloudflare Anycast IP selection (`bench-cf`)**: Benchmarks candidate Cloudflare IPs over the local Wi-Fi interface and pins the fastest reachable edge IP.
- **Zero double-encryption**: TLS 1.3 is terminated by Cloudflare Edge; VLESS runs with zero redundant crypto overhead.
- **WebSocket 0-RTT early data + `h2mux`**: Keeps 4 warm multiplexed sessions (`max_early_data: 2048`), cutting page TTFB by 2x+ and reaching near-line-rate throughput.
- **Explicit `bind_interface` to Wi-Fi (`en0`)**: Completely bypasses Tailscale `utun` so Tailscale exit node can stay on as a fallback for non-proxy-aware background daemons without creating a routing loop.
- **Proxy set on both `Wi-Fi` and `Tailscale` macOS services**: macOS `scutil --proxy` reads the active primary service; configuring both ensures browsers and apps use `127.0.0.1:7890` whether Tailscale exit node is on or off.
- **Automatic Cloudflare -> Tailscale failover (`urltest`)**: Stays on Cloudflare (`cf-proxy`) whenever reachable and automatically fails over to the Tailscale exit node (`ts-fallback`) during brief ISP/CN2 BGP flaps, then switches back once Cloudflare recovers.
- **IPv4-only DNS on the exit host (`--ipv4-only`, default)**: Prevents `no route to host` stalls on IPv4-only office networks.
- **China/LAN/Tailscale split-routing**: Domestic `.cn` sites, major Chinese apps, RFC1918 LANs, and `100.64.0.0/10` stay fast and direct over local Wi-Fi.

## Preconditions

1. An SSH-reachable macOS exit host (via standard SSH or `pc-ssh`) with Homebrew installed and sleep disabled (`pmset -g` -> `sleep 0`, `autorestart 1`).
2. Local macOS machine with `curl`, `python3`, `networksetup`, and `launchctl` (no local `sudo` required).
3. Optional: Tailscale CLI on both Macs if distributing to a second Mac via Taildrop (`share-peer --tailscale-peer`).

## Workflow

1. **Measure first** (prove the bottleneck before making changes):

   ```bash
   scripts/travel-vpn diagnose --host <ssh-target>
   # Or with pc-ssh:
   scripts/travel-vpn diagnose --ssh-cmd 'pc-ssh exec <server> --'
   ```

2. **Deploy the remote server & QUIC tunnel** (generates a fresh random UUID + WebSocket path, keeps existing `cloudflared` tunnels untouched, saves credentials privately in `~/.travel-vpn/creds.env` mode `600`):

   ```bash
   scripts/travel-vpn setup-server --host <ssh-target>
   # Or with pc-ssh:
   scripts/travel-vpn setup-server --ssh-cmd 'pc-ssh exec <server> --'
   ```

3. **Set up and enable the local Mac client** (downloads `sing-box` directly over Wi-Fi, benchmarks Cloudflare edge IPs, enables macOS Wi-Fi + Tailscale system proxies + `~/.zshrc` shell env, verifies exit IP and 10 MB speed):

   ```bash
   scripts/travel-vpn setup-client
   ```

4. **Share to a second Mac (e.g. a second laptop)** via Taildrop:

   ```bash
   scripts/travel-vpn share-peer --tailscale-peer <peer-tailscale-ip-or-name>
   ```

   Then on the second Mac run:

   ```bash
   bash ~/Downloads/install-peer.sh
   ```

5. **Daily operations**:

   ```bash
   scripts/travel-vpn status
   scripts/travel-vpn speedtest
   scripts/travel-vpn refresh    # Re-sync tunnel hostname if the office Mac rebooted
   scripts/travel-vpn off        # Disable proxies and stop client
   scripts/travel-vpn on         # Re-enable
   ```

6. **Clean teardown after traveling**:

   ```bash
   scripts/travel-vpn teardown-client
   scripts/travel-vpn teardown-server --host <ssh-target>
   ```

## Safety rules

- Never print, commit, or paste the generated UUID, WebSocket path, `creds.env`, `client.json`, `server.json`, or `install-peer.sh` into chat, logs, or git repositories.
- Keep `~/.travel-vpn/` and generated peer installers mode `600` and delete temporary `install-peer.sh` files after onboarding secondary Macs.
- Do not modify or stop existing `cloudflared` named tunnels or unrelated production services on the remote host (`--config /dev/null` isolates the travel tunnel).
- Verify `scutil --proxy` shows `HTTPEnable : 1` and `SOCKSEnable : 1` after `setup-client` or `on`; if another VPN (such as Surfshark) overrides the primary macOS service, disconnect it first.
- Tear down the remote server (`teardown-server`) after the trip so temporary Quick Tunnels are not left running indefinitely.
