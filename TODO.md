# BytePlay v0.1.1 gate ledger

Audited baseline `bb366d5102085477b7270d7982e60712cc23fb41` — main identical as of 2026-10-29.

- [ ] M0 — baseline and tests: NOT VERIFIED
- [ ] M1 — Phase 0 security: NOT VERIFIED
- [ ] M2 — Phase 1 session ownership: PARTIAL (infohash dedup/retention, owned reader cancellation, bounded purge/drain, graceful HTTP shutdown all unit/race CI-green; real seeded media and full acceptance pending)
- [ ] M3 — sequential torrent source: CI VERIFIED (local selected-file 206 range, >200 MiB seeded fixture at 20/100 Mbps with race); full streaming/HLS integration and buffer benchmark pending
- [ ] M4 — probe and route: CI VERIFIED (codec matrix, FFmpeg argv, finalized H264/AAC HLS from three synthetic local sources); torrent-backed HLS playback pending
- [ ] M5 — HLS generation: CORE CI VERIFIED (torrent→FFmpeg→Chrome HLS, 2-segment readiness, limited workers, lifecycle). M8 file I/O improved: classic sparse writes are optional for Go and default in Docker; quota guard projects actual piece growth, while default mmap remains conservatively full-file. OPEN: free-space/block-level quota, far-offset long-video testing, RSS/CPU/seek latency and complete acceptance.
- [ ] M6 — seek and lifecycle: CORE BACKEND CI VERIFIED (generation restart, forward/backward seek and audio selection, stale URLs, explicit pause/resume, 90s grace and no-demand semantics, absolute time adapter unit-tested); STILL OPEN: effective keyframe/PTS accuracy proof, 30-minute MKV/Video.js E2E, real pause/seek/subtitle sync, browser playback integration and resource stress.
- [ ] M7 — Midnight Current UI: CHROME PLAYBACK AND PLAYED HISTORY GREEN (#41017266001): dark settings modal tab/test/save labels verified WCAG 4.5:1 computed contrast, browser-only bounded 30-entry Played list, actual-playback-triggered persistence across reload, Resume HLS generation seek, Replay from 0, remove/clear, mobile responsive layout, real Chrome H264/AAC streaming. OPEN: Firefox/Safari real playback, full viewport human review/zoom, caption and multi-audio interaction, accessibility certification.
- [ ] M8 — release certification: PARTIAL — GitHub-hosted CI #41018622199 GREEN 5/5. Verified settings tab/test/save button contrast, browser Played history/Resume/Replay, mmap full-file safety and Docker-default classic sparse file growth with separate Go race tests, actual Chrome HLS decoding, 20/100 Mbps seeded media, authenticated Docker crash/lock validation. OPEN: OS physical disk quota/free-space, 30-minute MKV PTS seek, sustained CPU/RSS/streaming benchmarks, Firefox/Safari/device testing, accessibility, approved deployment and release.

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
