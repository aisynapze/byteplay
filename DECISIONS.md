# BytePlay decisions

1. Keep existing Go, anacrolix and /api/v1 legacy contracts; no rewrite or extra architecture.
2. Local-first, with explicit authorization for network-wide binding.
3. Use an ephemeral loopback internal header instead of embedding user Basic Auth in media process arguments.
4. Create fresh immutable HTTP transports; do not claim SOCKS5 proves anonymity or total peer/tracker isolation.
5. Use npm with existing package-lock.json, not the contradictory pnpm packageManager entry.
6. Work on isolated branch; no merge before required tests and media certification.

7. Runner policy updated by owner (2026-10-29): use GitHub-hosted `ubuntu-latest` for these quality checks now; consider self-hosted runners later if needed. This supersedes the earlier self-hosted-only constraint for current checks.

8. M6 playback seeks serialize cancel+Wait before publishing a new generation. Retain old generation files until explicit playback teardown but never serve superseded URLs. Keep pause intent from explicit client events, not playlist request frequency; the adapter lives outside Video.js internals. Effective copy-keyframe seek accuracy remains an explicit unverified acceptance gate.

9. M7 keeps the existing settings/proxy/indexer DOM hidden behind the new branded shell until UI parity is verified. New UI is vanilla JS + existing Tailwind and Video.js 8.24.0. Browser smoke metadata/status may be mocked only for deterministic layout checks; real seeded media tests remain separate and required. No new production JS runtime dependency.

10. M8 browser H264/AAC decoding proof uses installed Google Chrome because Playwright's stripped Chromium headless shell did not support AVC via MediaSource, even though Video.js 8.24.0/VHS was bundled. Keep responsive UI smoke on Chromium; require actual decoded frames and playback progression for media acceptance. Do not confuse missing test-browser codecs with a torrent or FFmpeg regression.
11. Docker must rebuild Tailwind from package-lock.json in a separate Node stage, retain a small Go/FFmpeg runtime, and fail CI unless explicit Basic Auth and media encoders work. Do not advertise an unpublished GHCR tag.
