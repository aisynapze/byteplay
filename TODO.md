# BytePlay v0.1.1 gate ledger

Audited baseline `bb366d5102085477b7270d7982e60712cc23fb41`. Evidence is scoped to the implementation branch. Last **fully passed** workflow at this ledger update: [#146](https://github.com/aisynapze/byteplay/actions/runs/41027689755), testing executable commit `08d2cd665446101e70e07cb973d67fc034823510` (all 5 jobs SUCCESS, including real Firefox decoded HLS).

- [ ] M0 — PARTIAL: fresh-checkout Go/Node/FFmpeg/Docker CI green; full legacy response characterization remains open.
- [ ] M1 — PARTIAL: loopback/auth, bounded requests, redacted settings and proxy diagnostics tested; SOCKS5 peer/tracker egress isolation, complete SSRF/security review and failure-injection remain open.
- [ ] M2 — PARTIAL: concurrent infohash dedup, session-owned cancellation, graceful shutdown and bounded purge/drain race tests pass; complete failure matrix and live-inflight metadata cancel certification remain open.
- [ ] M3 — CORE CI VERIFIED: seeded 20/100 Mbps HTTP 206 and selected-file partial data with race; remote swarm/peak buffer performance remains open.
- [ ] M4 — CORE CI VERIFIED: probe/copy/audio-transcode/video-transcode route and local finalized MPEG-TS H.264/AAC segments; full incompatible-codec browser matrix remains open.
- [ ] M5 — CORE CI VERIFIED: actual torrent→FFmpeg→Chrome HLS, two finalized segment readiness, generation guards, shared HLS/legacy FFmpeg process slots, HLS+classic torrent quota admission and cache ownership/recovery. Physical block-level disk accounting/eviction and sustained load remain open.
- [ ] M6 — CHROME LONG-MEDIA CORE VERIFIED: FFprobe copy-keyframe offset, 30-minute synthetic MKV 10-minute and reverse 2-minute Video.js timeline, two distinct audio indexes, generation restart, real pause and local SRT import. **OPEN:** ±1-second actual decoded PTS/audio-sync oracle, rapid concurrent seeks/orphan stress and full subtitle cue keyboard selection.
- [ ] M7 — PARTIAL: BytePlay branded responsive home/watch, settings label contrast, browser Played history/Resume/Replay, 11 original viewport checks and 720×450 @ DPR2 reflow proxy, keyboard submission, real Chrome **and Firefox** H.264/AAC playback green. **OPEN:** Safari/native-device real playback, actual browser zoom/manual accessibility and owner visual signoff.
- [ ] M8 — PARTIAL: #146 all five jobs green, locked Docker, release-quality workflow dependency, authenticated crash/recovery, 30s same-fixture FFmpeg copy-vs-x264 wall/CPU/RSS measurements. **OPEN:** sustained deployment-approved load, physical free space/quota, Safari/device matrix, security/accessibility certification and approved tag publication.

## BP-level acceptance — evidence state, not feature-claim percentages

- [ ] BP-001 — PARTIAL: magnet/infohash and .torrent conversion implemented; complete API+UI import matrix remains open.
- [ ] BP-002 — CORE CI VERIFIED on synthetic local seeded partial-file reads; remote swarms not certified.
- [ ] BP-003 — CORE CI VERIFIED for copy-mode route, HLS segments and real Chrome decoding.
- [ ] BP-004 — CORE CI VERIFIED for FFprobe-selected audio-only conversion fixture; browser-specific incompatible-audio fixture remains open.
- [ ] BP-005 — CORE CI VERIFIED for x264 ultrafast route and segments; real incompatible-codec browser playback remains open.
- [ ] BP-006 — CORE CI VERIFIED: two finalized segments, generation isolation, unlisted/tmp denial.
- [ ] BP-007 — PARTIAL: Chrome Video.js real HLS, pause/resume, seeking, audio switching and local subtitle import; Safari/device/control/keyboard matrix open (Firefox short HLS decode verified in #146).
- [ ] BP-008 — PARTIAL: measured torrent byte-delta speed and null before sample; complete live metric UI acceptance open.
- [ ] BP-009 — PARTIAL: responsive design and automated reflow proxy; manual WCAG/visual signoff open.
- [ ] BP-010 — PARTIAL: security/concurrency/cache safeguards pass focused tests; full proxy isolation/security certification open.
- [ ] BP-011 — CORE CI VERIFIED: Go/race/media/Chrome UI/Docker five-job gates; platform certification open.
- [ ] BP-012 — PARTIAL: documented legacy endpoints preserved; exhaustive legacy HTTP contract characterization open.

**No BP requirement is fully accepted until every applicable L3 test oracle is executed and recorded. No release/merge has been authorized.**
