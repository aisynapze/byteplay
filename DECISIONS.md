# BytePlay decisions

1. Keep existing Go, anacrolix and /api/v1 legacy contracts; no rewrite or extra architecture.
2. Local-first, with explicit authorization for network-wide binding.
3. Use an ephemeral loopback internal header instead of embedding user Basic Auth in media process arguments.
4. Create fresh immutable HTTP transports; do not claim SOCKS5 proves anonymity or total peer/tracker isolation.
5. Use npm with existing package-lock.json, not the contradictory pnpm packageManager entry.
6. Work on isolated branch; no merge before required tests and media certification.
