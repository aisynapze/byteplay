# BytePlay v0.1.1 gate ledger

Audited baseline `bb366d5102085477b7270d7982e60712cc23fb41` — main identical as of 2026-10-29.

- [ ] M0 — baseline and tests: NOT VERIFIED
- [ ] M1 — Phase 0 security: NOT VERIFIED
- [ ] M2 — Phase 1 session ownership: PARTIAL (infohash dedup/retention, owned reader cancellation, bounded purge/drain, graceful HTTP shutdown all unit/race CI-green; real seeded media and full acceptance pending)
- [ ] M3 — sequential torrent source: CI VERIFIED (local selected-file 206 range, >200 MiB seeded fixture at 20/100 Mbps with race); full streaming/HLS integration and buffer benchmark pending
- [ ] M4 — probe and route: CI VERIFIED (codec matrix, FFmpeg argv, finalized H264/AAC HLS from three synthetic local sources); torrent-backed HLS playback pending
- [ ] M5 — HLS generation: IN PROGRESS (generation-1 async job/HTTP API and bounded worker drafted; CI and real torrent-to-HLS gate pending)
- [ ] M6 — seek and lifecycle: NOT VERIFIED
- [ ] M7 — Midnight Current UI: NOT VERIFIED
- [ ] M8 — release certification: NOT VERIFIED

- [ ] BP-001: NOT VERIFIED
- [ ] BP-002: NOT VERIFIED
- [ ] BP-003: NOT VERIFIED
- [ ] BP-004: NOT VERIFIED
- [ ] BP-005: NOT VERIFIED
- [ ] BP-006: NOT VERIFIED
- [ ] BP-007: NOT VERIFIED
- [ ] BP-008: NOT VERIFIED
- [ ] BP-009: NOT VERIFIED
- [ ] BP-010: NOT VERIFIED
- [ ] BP-011: NOT VERIFIED
- [ ] BP-012: NOT VERIFIED

Nothing is DONE without executed acceptance evidence.
