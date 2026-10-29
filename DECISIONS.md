# BytePlay decisions

1. Keep existing Go, anacrolix and /api/v1 legacy contracts; no rewrite or extra architecture.
2. Local-first, with explicit authorization for network-wide binding.
3. Use an ephemeral loopback internal header instead of embedding user Basic Auth in media process arguments.
4. Create fresh immutable HTTP transports; do not claim SOCKS5 proves anonymity or total peer/tracker isolation.
5. Use npm with existing package-lock.json, not the contradictory pnpm packageManager entry.
6. Work on isolated branch; no merge before required tests and media certification.

7. Runner policy updated by owner (2026-10-29): use GitHub-hosted `ubuntu-latest` for these quality checks now; consider self-hosted runners later if needed. This supersedes the earlier self-hosted-only constraint for current checks.

8. M6 playback seeks serialize cancel+Wait before publishing a new generation. Retain old generation files until explicit playback teardown but never serve superseded URLs. Keep pause intent from explicit client events, not playlist request frequency; the adapter lives outside Video.js internals. Effective copy-keyframe seek accuracy remains an explicit unverified acceptance gate.
