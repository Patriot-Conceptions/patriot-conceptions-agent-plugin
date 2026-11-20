---
name: travel-vpn
description: Set up, optimize, share, and tear down a fast Cloudflare-accelerated proxy relay (`sing-box` VLESS+WebSocket+smux over a QUIC `cloudflared` tunnel) to an owned macOS exit host behind NAT. Use when traveling behind restrictive networks (such as China) where commercial VPNs are blocked and Tailscale exit nodes fall back to slow TCP DERP relays.
---

# Travel VPN

Turn any SSH-reachable macOS host in a clean network (even behind symmetric NAT with no port forwarding) into a **15–30+ Mbps** low-latency travel relay over Cloudflare's Anycast backbone.

## Why this beats a Tailscale exit node behind the GFW

When direct UDP hole punching fails (symmetric office NAT and/or cross-border UDP filtering), Tailscale relays WireGuard over a single TCP DERP stream. Packet loss on the outer DERP stream causes TCP-over-TCP meltdown (often 0.05–4.5 Mbps and 1,000+ ms latency).

This skill routes around DERP:

`Travel Mac (Wi-Fi en0) -> Cloudflare Edge (e.g. NRT Tokyo / HKG, TLS 1.3 + WS + smux) -> Cloudflare Backbone -> Office Mac (QUIC cloudflared + sing-box VLESS) -> Open Internet`

Key performance choices built into `scripts/travel-vpn`:
- **Multi-colo Cloudflare Anycast IP selection (`bench-cf` + `urltest`)**: Benchmarks candidate Cloudflare IPs across regions (including `108.162.198.x` Tokyo `NRT` ~93 ms on China Unicom, `FRA`, `SIN`, `LAX`) weighted by throughput and TCP RTT, and wires the top 5 into a `urltest` group (`interval: 1m`, `tolerance: 60`) so `sing-box` automatically steers around congested or jittery edges instead of pinning a single IP.
- **Zero double-encryption**: TLS 1.3 is terminated by Cloudflare Edge; VLESS runs with zero redundant crypto overhead.
- **WebSocket 0-RTT early data + tuned `smux` (instead of `h2mux`)**: Uses `smux` (`max_connections: 8, min_streams: 2, max_streams: 8`, `max_early_data: 2048`). In China, long-lived `h2mux` WebSockets frequently suffer HTTP/2 `ClientConn.Close` bursts and get throttled down to ~20 KB/s while trapping new browser streams on the same degraded socket. Spreading capped streams across up to 8 `smux` sessions preserves ~0.5s TTFB while reaching 20–26+ Mbps down and 10–16+ Mbps up.
- **Explicit `bind_interface` to Wi-Fi (`en0`)**: Completely bypasses Tailscale `utun` so Tailscale can stay connected for SSH/Taildrop without routing loops.
- **Disable Tailscale Exit Node once `travel-vpn` is active (`tailscale set --exit-node=`)**: Leaving a Tailscale exit node active causes macOS system DNS (`100.100.100.100`) to add ~275 ms per lookup over DERP, resolves Chinese sites to overseas IPs, and forces non-proxy apps (WeChat, OneDrive, iCloud, native CLIs) through slow TCP DERP. Keep Tailscale on for Tailnet/SSH/Taildrop, just unset the exit node.
- **Proxy set on both `Wi-Fi` and `Tailscale` macOS services**: macOS `scutil --proxy` reads the active primary service; configuring both ensures browsers and apps use `127.0.0.1:7890` whether Tailscale exit node is on or off.
- **IPv4-only DNS on both client and exit host (`--ipv4-only`, default)**: Prevents AAAA lookup overhead and `no route to host` stalls on IPv4-only networks.
- **Domain-first China/LAN/Tailscale split-routing**: Domestic `.cn` sites and major Chinese apps match `domain_suffix` rules *before* `ip_is_private` / `ip_cidr` rules so domestic domains stay fast (~40–80 ms) and direct over local Wi-Fi without extra DNS resolution.

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

## Troubleshooting slowness

If browsing or downloads feel slow while `travel-vpn` is running:
1. **Check for an active Tailscale Exit Node**: Run `tailscale debug prefs | grep ExitNodeID`. If set, run `tailscale set --exit-node=` so system DNS and non-proxy apps stop crawling over DERP.
2. **Compare direct Wi-Fi vs. live proxy on the same Cloudflare IP**: If direct `en0` gets 15–30 Mbps while `127.0.0.1:7890` drops to <1 Mbps, check `~/.travel-vpn/client.err.log` for `http2: client connection force closed` (upgrade from `h2mux` to `smux` with `max_connections: 8, min_streams: 2, max_streams: 8`).
3. **Re-benchmark Cloudflare edge IPs (`scripts/travel-vpn bench-cf --top 5`)**: On China Unicom/Telecom, `108.162.198.x` (Tokyo `NRT`, ~93 ms) often sits directly on the great-circle path to US West exit hosts and avoids Singapore (`SIN`) detours.
4. **If you need <150 ms latency or 50–150+ Mbps**: An exit host in California has a physical ~500 ms TTFB floor from China; deploy `sing-box` (`VLESS + Reality` or `Hysteria2`) on a closer HK/Tokyo/LA CN2 GIA VPS instead.

## Field pitfalls (verified)

- **Never stop the client from the machine that is using it.** Applying `setup-client` sets `http_proxy=127.0.0.1:7890` for the whole shell/app environment; anything that stops or replaces the client before the replacement is listening severs the agent's own API traffic (`proxyconnect tcp: dial tcp 127.0.0.1:7890: connect: connection refused`). Bring the new client up before retiring the old one, or do the cutover from a shell outside the proxied process.
- **A rotated Quick Tunnel silently degrades to `ts-fallback`.** Any `cloudflared` restart on the exit host issues a new `trycloudflare.com` hostname. The pinned client then gets Cloudflare **530** at the edge, every `cf-*` outbound times out (`i/o timeout`), and `urltest` falls back to a Tailscale exit node (~1.4 Mbps) instead of erroring loudly. Diagnose with `curl --resolve "<host>:443:<cf-ip>" https://<host>/` — `530` = tunnel gone, `404` = tunnel healthy (the VLESS path is not a web route). Fix with `refresh`; if the exit host still runs the legacy `~/.fastvpn` layout, `refresh` cannot find `~/.travel-vpn/tunnel.err.log` and you must re-run `setup-server` (fresh UUID/path/tunnel) instead.
- **The ceiling is the exit host's upload, not the client's downlink.** Measure both before promising numbers: relay download ≈ exit-host upload. A host with 7.4 MB/s down / 2.1 MB/s up caps the tunnel at ~17 Mbps, and ~13–14 Mbps is normal at ~78% of that ceiling. Benchmark the exit host's uplink first; 25–30+ Mbps requires an exit host with ≥30 Mbps upload.
- **`creds.env` is sourced, so every value must survive `bash` word-splitting.** `TRAVEL_VPN_REMOTE_SSH_CMD=pc-ssh exec host --` executes `exec` at source time. Quote `REMOTE_HOST` and `REMOTE_SSH_CMD` when writing the file.

## Safety rules

- Never print, commit, or paste the generated UUID, WebSocket path, `creds.env`, `client.json`, `server.json`, or `install-peer.sh` into chat, logs, or git repositories.
- Keep `~/.travel-vpn/` and generated peer installers mode `600` and delete temporary `install-peer.sh` files after onboarding secondary Macs.
- Do not modify or stop existing `cloudflared` named tunnels or unrelated production services on the remote host (`--config /dev/null` isolates the travel tunnel).
- Verify `scutil --proxy` shows `HTTPEnable : 1` and `SOCKSEnable : 1` after `setup-client` or `on`; if another VPN (such as Surfshark) overrides the primary macOS service, disconnect it first.
- Tear down the remote server (`teardown-server`) after the trip so temporary Quick Tunnels are not left running indefinitely.
