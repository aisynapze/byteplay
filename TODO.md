# BytePlay v0.1.1 gate ledger

Audited baseline `bb366d5102085477b7270d7982e60712cc23fb41` — main identical as of 2026-10-29.

- [ ] M0 — baseline and tests: NOT VERIFIED
- [ ] M1 — Phase 0 security: NOT VERIFIED
- [ ] M2 — Phase 1 session ownership: PARTIAL (infohash dedup/retention, owned reader cancellation, bounded purge/drain, graceful HTTP shutdown all unit/race CI-green; real seeded media and full acceptance pending)
- [ ] M3 — sequential torrent source: CI VERIFIED (local selected-file 206 range, >200 MiB seeded fixture at 20/100 Mbps with race); full streaming/HLS integration and buffer benchmark pending
- [ ] M4 — probe and route: CI VERIFIED (codec matrix, FFmpeg argv, finalized H264/AAC HLS from three synthetic local sources); torrent-backed HLS playback pending
- [ ] M5 — HLS generation: CORE CI VERIFIED (actual local seeded torrent → FFmpeg → finalized HLS, bounded 2/1 worker slots, 2-segment readiness, immutable generations). IDLE RETENTION + COMBINED CACHE WATERMARK UNIT/RACE VERIFIED (#41010209989): 15-min no-demand reaper, generation-specific cleanup, configurable 10 GiB torrent+HLS usage checks and preserved cache_full reason. OPEN: true concurrent disk reservations, crash-orphan recovery, active playback stress, startup/RSS benchmarks and full M5 acceptance.
- [ ] M6 — seek and lifecycle: CORE BACKEND CI VERIFIED (generation restart, forward/backward seek and audio selection, stale URLs, explicit pause/resume, 90s grace and no-demand semantics, absolute time adapter unit-tested); STILL OPEN: effective keyframe/PTS accuracy proof, 30-minute MKV/Video.js E2E, real pause/seek/subtitle sync, browser playback integration and resource stress.
- [ ] M7 — Midnight Current UI: CORE CHROME PLAYBACK VERIFIED (real seeded torrent → FFmpeg HLS → Video.js 8 on installed Google Chrome: ≥34 decoded frames and 1.21s time advance), branded home/watch, 11-size home and 5-size watch Chromium smoke, settings continuity, timeline/seek and subtitles. OPEN: Firefox/Safari browser playback, full viewport human review, 200% zoom, interactive multi-audio/subtitle and accessibility certification.
- [ ] M8 — release certification: PARTIAL — DOCKER + AUTH + CSS/FFMPEG + CHROME DECODE AND RETENTION/CACHE GATES CI-VERIFIED in 5/5 green #41010209989. OPEN: deployed environment, concurrent disk reservations, orphan recovery, CPU/RSS/peak/long-running cache tests, 30-min MKV PTS accuracy, cross-browser and accessibility, release approval/publication.

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
