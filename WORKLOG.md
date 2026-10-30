# BytePlay worklog

## 2026-10-29

- Verified main HEAD `bb366d5102085477b7270d7982e60712cc23fb41` exactly matches audited baseline; no drift.
- Created implementation branch. Inspected existing Go server, anacrolix/torrent, FFprobe/remux, vanilla JS, Docker and npm lockfile.
- Added first Phase 0 security changes and regression tests; these are not fully validated.
- Added self-hosted Linux/x64 CI workflow. GitHub Actions query currently shows zero runs; runner labels/capabilities cannot be verified with available permissions.
- Runtime Go 1.26.6, seeded torrent, FFmpeg integration and browser checks have NOT been executed.
- M1 remains incomplete; P0 proxy peer/tracker egress and complete security/error tests are outstanding.
- Next action: run CI on the branch, fix observed build/test regressions, complete M1, then M2–M8.

- Latest observed CI run: https://github.com/aisynapze/byteplay/actions/runs/40951000330 — QUEUED, not passed. No runner binding verified. Tests and formatting still require execution.

- Owner-approved temporary CI policy update: use GitHub-hosted `ubuntu-latest` for BytePlay quality jobs; retain self-hosted runners as a later option. Commit `76c5da86c12f1bff112bae0cfbe6b953018c2151`. Run #40951738080 started on GitHub-hosted infrastructure; full result not yet verified.

## 2026-10-29 — dependency download audit

- CI run #40951738080 failed in explicit `go mod download` after ~195 seconds with HTTP/2 proxy errors for Pion datachannel/DTLS and zombiezen sqlite.
- Removed eager `go mod download` from .github/workflows/ci.yml, using `go build ./...` to fetch only imported build dependencies under `GOFLAGS=-mod=readonly` and preserving setup-go caching.
- CI run #40953063735: gofmt, go build, go mod verify and go vet PASS on a cold GitHub-hosted runner; build fetched 73 modules. Pion datachannel and DTLS were fetched by build; zombiezen.com/go/sqlite was not.
- Dockerfile also had eager download; replaced it with BuildKit Go module/build cache mounts and lazy build with readonly module manifest.
- Unit test T-003 failed because oversized request content length was not checked before invalid multipart parsing; added early 413 ContentLength check while retaining MaxBytesReader for streaming/unknown-length bodies.
- No dependency versions changed; no `go mod tidy` or removal of transitive dependencies without import graph evidence.
- New CI run for latest branch must still complete before full gate status can be recorded.

## 2026-10-29 — GitHub-hosted CI repair verified

- Run #40953448643: all Go/frontend gates passed, FFmpeg availability failed because the GitHub-hosted Ubuntu runner had no ffmpeg binary (`ffmpeg: command not found`).
- Installed ffmpeg/ffprobe using apt in `.github/workflows/ci.yml` before the codec availability checks. Commit: `116132bbae1626a7fe2358736d20349a31a7b31b`.
- Run #40955652051 on that commit: **success** (https://github.com/aisynapze/byteplay/actions/runs/40955652051). Go build/vet/test/race, module verification, gofmt, JS syntax, CSS, ffmpeg install and libx264/AAC/ffprobe checks all passed.
- This is a green CI quality workflow, not full M0-M8 media, security, HLS, or UI release certification.

## 2026-10-29 — M2 session lifecycle initial batch

- Starting from last confirmed green CI, addressed concurrent-add duplicate creation and unsynchronized LastUsed/cleanup issues. Implemented per-infohash flight, retained handler guard, idle-only reap and active-purge denial with tests.
- M2 P1-03/P1-06 cancellation-and-drain/P1-07 SIGTERM still pending; CI for this commit pending.

- M2 P1-07 initial implementation: SIGTERM/SIGINT graceful HTTP drain and bounded timeout; CI/race proof pending. No claim of full FFmpeg teardown proof.

## 2026-10-29 verified CI / outstanding acceptance

- GitHub-hosted [CI #40957319988](https://github.com/aisynapze/byteplay/actions/runs/40957319988) at `522c3f7093ff4c0b026496333f16eb2ae1c5e06c`: **success**, including concurrent infohash add, retention, cleanup and active purge denial tests; `go test -race` passed.
- GitHub-hosted [CI #40957933859](https://github.com/aisynapze/byteplay/actions/runs/40957933859) at `ee2b5084d2775d02db3b6b02b6253bebaf963221`: **success**; synchronous listen, graceful SIGTERM/SIGINT with bounded HTTP Shutdown and fallback Close tested; entire configured Go/frontend/FFmpeg workflow passed.
- P1-01/02 code paths now have unit/race evidence. P1-07 HTTP layer has tests, but real container signal and media shutdown are not certified. Full P1-03 media cancellation, full P1-06 active purge cancellation/drain, crash-safe settings and real seeded torrent integration remain **OPEN**.
- Keep M2 **PARTIAL**, do not mark BP-001..BP-012 fully accepted.

- M2 P1-03/P1-06 follow-on: added session-owned context for Reader.SetContext, FFprobe and FFmpeg; purge cancels and waits up to 10s, retains cache on timeout. In-flight metadata fetch returns 409. Pending runtime CI and seeded-media evidence.

## GitHub-hosted CI evidence — M2 cancellation, 2026-10-29

- [Actions #40958991450](https://github.com/aisynapze/byteplay/actions/runs/40958991450) on commit `2667a4688abf15223af23b954baa520d0c31fd4d`: **completed SUCCESS**.
- Passed Go 1.26.6 compilation, gofmt, `go mod verify`, `go vet ./...`, `go test ./...`, `go test -race ./...`, JavaScript syntax, npm CSS build and FFmpeg/FFprobe encoder checks.
- Implemented: P1-01 synchronized LastUsed and retained handlers; P1-02 in-flight deduplication; P1-03 session-owned reader/probe/remux contexts; P1-06 cancel+drain before cache deletion with bounded 409-preserve behavior; P1-07 signal-triggered, bounded HTTP shutdown.
- Still NOT certified: an actual seeded torrent/FFmpeg cancellation integration run, cancellation of in-flight metadata fetches (currently 409), failure-injection for settings writes, and complete P1-08 status/code matrix. M2 remains PARTIAL, M3–M8 remain OPEN.

## 2026-10-29 — verified M3 local seed and selected-file range

- [GitHub Actions #40960730318](https://github.com/aisynapze/byteplay/actions/runs/40960730318) at 5fbc08ccf1a5f6e6de96ecf5352a109e4188ef45: SUCCESS. Two jobs, including offline local seeder on synthetic 60-second H264/AAC test-pattern clip.
- HTTP status 206 and exact clip bytes 1024–8191 validated at 20 and 100 Mbps rate-limited client configurations; torrent completed only 360448/74780311 and 393216/74780311 bytes, respectively.
- Improved assertions to require selected-file completion below 100%, and expanded sparse sibling padding to 220 MiB to match L3 M3 fixture-size gate. First-byte latency is now reported as a numeric millisecond value. A race-enabled local seed run was added; pending confirmation.
- These prove range reads before full completion; they do NOT certify 2 playable HLS segments, a true 1-minute startup budget, peak buffer or real-web peer behavior.

## 2026-10-29 — M4 route planning code

- Added typed MediaProfileFromProbe and ChooseHLSRoute with H264/AAC copy candidate, AAC-only conversion for AC3/Opus/etc, software x264 route for HEVC/VP9/AV1/high-bit-depth, explicit audio-track selection and bounded video input.
- Extended FFprobe stream metadata (pix_fmt, width, height, avg frame rate). Deterministic matrix tests were added for H264/AAC, H264/AC3, HEVC/AAC, VP9/Opus, high bit depth, invalid source, missing video and absolute audio indexes.
- CI status pending on this code. These route decisions are not actual MPEG-TS HLS output and do not certify playback.

## M4 FFmpeg executable integration additions — 2026-10-29

- A single BuildHLSFFmpegArgs implementation emits deterministic argv for `copy`, `audio-transcode` and `video-transcode`. Copy path omits all x264 encoding options; audio-only conversion preserves H.264. Video conversion uses explicit libx264 ultrafast, 8-bit 420, bounded profile and 4s keyframe cadence.
- CI now creates short synthetic H264/AC3 and MPEG4/AAC MKV fixtures in addition to the H264/AAC MP4. Tagged integration runs FFprobe → route selection → FFmpeg HLS output and verifies ENDLIST, at least two finalized TS segments, and H264/AAC in first segment. Results pending.
- This only validates *local file* media routing; on-demand torrent-backed HLS sessions and generation-aware APIs remain in M5/M6.

## 2026-10-29 — M3/M4 green GitHub-hosted CI evidence

- [CI #40962687772](https://github.com/aisynapze/byteplay/actions/runs/40962687772), source commit `1869c8609734ed7e79aee759b86f98ebb18ee3cd`: **SUCCESS**, both `validate` and `media-source` jobs completed successfully.
- Go 1.26.6: build, verify, vet, unit tests, race detector, frontend syntax/CSS, gofmt, FFmpeg availability all PASS.
- Offline seeded BitTorrent fixture: 244,451,667-byte torrent; validated exact 206 range with only 507,904 bytes completed (20 Mbps) and 458,752 bytes completed (100 Mbps) in non-race run. Selected-file bytes also remained below full size. First-byte latency measured 109 ms / 22 ms for non-race run (one observation, not production promise).
- Race-enabled repeat of M3 partial streaming test PASS; transport throttles are configured local client limits, not field-network benchmarks.
- FFprobe route selection and FFmpeg MPEG-TS HLS: local H264/AAC copy = 6 finalized segments, local H264/AC3 audio transcode = 2 finalized segments, local MPEG4/AAC x264 ultrafast = 5 finalized segments. Playlists contained ENDLIST, segments probe as H264/AAC, and zero temporary outputs remained. Both normal and race-enabled CI executions PASS.
- **Not demonstrated:** live torrent-to-FFmpeg/HLS generation before 100% of selected bytes, generation-qualified HLS serving APIs, browser playback, peak memory/cache accounting, PTS-aligned seeks, or mobile UI. M3 and M4 tests are green; release gate is NOT green.

## 2026-10-29 — M5 async playback manager initial implementation

- Added POST /api/v1/hls/sessions async create, GET /{id}/status, GET/HEAD generation=1 immutable playlists and numbered segments and idempotent DELETE.
- Playback session owns a retained torrent session, context-cancellable FFprobe/FFmpeg, 2 concurrent FFmpeg slots and 1 video transcode slot; caller no longer blocks on metadata or probe.
- Playback ID is cryptographically random 128-bit; output dir 0700. Finalized manifest must contain >=2 referenced non-empty TS files before ready. Strict segment-name check rejects traversal/tmp/unlisted paths. Status and creation responses use typed error/state contracts; no user auth tokens in URLs.
- Added bounded HTTP graceful shutdown cleanup and separate in-memory quota caps (10GiB HLS root, 2GiB playback). Torrent cache aggregate disk quota not yet enforced; generation=1 only and no seek/control endpoints.
- Unit/real seeded end-to-end CI evidence pending; do not mark M5 complete before these pass.

## 2026-10-29 — M5 core real-torrent HLS verification

- Verified source commit: `eb19ec1f7c8cff061dd0562928f7ecc024813ed5`. [GitHub Actions #40964985979](https://github.com/aisynapze/byteplay/actions/runs/40964985979): **completed SUCCESS**, both Go/security/frontend and local seeded media jobs.
- The end-to-end tagged test `TestTorrentBackedHLSReadyBeforeWholeTorrentCompletion` started a local-only seeder, selected the MP4 source via real `/api/v1/torrent/{id}/stream/{fileIndex}`, created the asynchronous playback by POST, polled status until `playlistReady`, fetched the generated immutable generation-1 manifest and two finalized MPEG-TS assets, and asserted torrent-wide completion below total. Normal and `-race` runs passed.
- Observed in previous green run #40964481318: 6 finalized HLS TS segments on the MP4 fixture; at status readiness, torrent-wide completion was 112,197,632 / 244,451,667 bytes in normal run and 92,274,688 / 244,451,667 bytes in race-enabled run. These are **fixture observations**, not buffered bytes, real-network performance, or evidence that the selected media file was incomplete at readiness.
- New `hls_service.go` owns playback IDs (128-bit CSPRNG), 0700 directories, cancellable FFprobe/FFmpeg children, bounded 2 global FFmpeg jobs/1 video transcode, state snapshots and machine-readable error codes. A manifest is withheld until at least two declared, finalized, non-empty TS files exist. Unlisted, temporary, invalid and superseded-generation content is denied. Existing Basic Auth middleware protects the new routes.
- Unit coverage: readiness gating with missing/.tmp segments, GET/HEAD assets, 425 before ready, 410 wrong generation, 404 unknown/unlisted resources, 405 wrong method, 413 body limit, DELETE idempotence, shutdown cancellation, null unmeasured metrics. `go test -race ./...` succeeded.
- **M5 stays PARTIAL**: only generation=1 is implemented. Need bounded source-specific prefetch/codec startup measurements, active worker and completed-playback TTL eviction, full shared-cache accounting (currently HLS-only 10 GiB + per playback 2 GiB), reproducible forced cancellation/orphan process stress, multi-playback/eviction integration, and readiness before entire *selected file* completion. M6 seek/control/pause/audio, M7 UI and M8 production certification are not implemented. Do NOT label BytePlay release-ready.

## 2026-10-29 — M6 implementation and GitHub Actions evidence

**Verified GitHub-hosted run:** [#40966823877](https://github.com/aisynapze/byteplay/actions/runs/40966823877), code commit `b917965d1254be08017f8b52106f9849efe5e6d1` — **SUCCESS**, both standard Go/security/frontend checks and seeded-torrent/FFmpeg integration. `go test -race ./...` passed. The independent Node 22 absolute timeline adapter suite passed **5/5** cases.

**Backend changes:**
- `POST /api/v1/hls/{id}/seek` validates absolute seconds, duration and optional absolute FFprobe audio index BEFORE canceling the current job. It serializes generation restart with an exclusive manager lock, cancels and waits for the old FFmpeg process, retains a torrent session, creates a new generation directory and returns `202 {playbackId,generation,state:"preparing",statusUrl}`. Only the new `playlistUrl` from ready status is published. Old-generation manifests/segments return **410**; stale pointers are rejected under a read lock.
- `POST /api/v1/hls/{id}/control` accepts only idempotent `pause`/`resume`, uses a default 90-second explicit pause grace before cancel + Wait, and responds with `409 seek_required` after a stopped worker instead of guessing a playhead.
- The independent no-demand timeout is 2 minutes and counts HLS segment and explicit control access; manifest-only polling does not reset it. Source-relative FFmpeg `-ss` is generated by the existing bounded argv builder.
- `client/assets/player-timeline.js` implements absolute position mapping, buffered-range-only local seeking and server restart when an absolute target is not buffered (or audio changes). It is standalone, without modifying undocumented Video.js internals.

**Executed evidence:** `TestTorrentBackedHLSReadyBeforeWholeTorrentCompletion` now covers multiple generation restarts, backward and forward absolute seeks on a 60-second synthetic fixture, explicit audio selection, invalid audio rejection without supersession, stale `410` URLs and idempotent controls. Normal and race-enabled tagged integration tests passed. Go unit tests verify paused worker drain despite manifest polling, grace cancellation by resume, invalid seek rejection without state mutation, no-demand accounting and stale pointer denial.

**Acceptance boundaries — M6 remains PARTIAL:** Current `startSeconds` carries the requested offset and **has not been demonstrated to equal the effective source keyframe/first audible PTS**. No claim of ±1s accurate seek or GOP-accurate stream-copy seek is made. The mandatory 30-minute MKV time-marker forward/backward seek, multiple audio-track selection rather than respecifying the same AAC track, subtitle synchronization, three rapid concurrent-seek stress/no-orphan-process assertions, Video.js pause intent integration and touch/browser E2E remain OPEN. The adapter is **not yet wired into the production watch UI**. Do not mark M6 or the release complete.

## 2026-10-30 — M7 branded home/watch UI and Chromium gates

- Built original BytePlay Midnight Current interface in client/index.html, client/assets/byteplay.css, byteplay-app.js, byteplay-core.mjs and original SVG favicon, retaining the old DOM and settings/indexer handlers for backward compatibility.
- Connected home magnet/infohash and .torrent conversion; conditional provider search; file chooser; watch status/progress; generation-aware Video.js HLS source; absolute player timeline; video/audio selection, local and torrent subtitles, ranged original download and file info.
- Added JS file/status/SRT tests, generation snapshot fencing (no obsolete HLS playlist after seek), reduced-motion/responsive CSS, and Node-based timeline tests. Video.js remains pinned in vendored comment at 8.24.0.
- Added scripts/verify-ui.cjs rendered Chromium test with real loopback BytePlay server, deterministic mocked watch metadata, archived six full-page screenshots. Inspected desktop/mobile/landscape images for hierarchy, contrast, no clipping and alignment; manual independent UI sign-off pending.
- Observed sporadic disconnected local loopback peer on one 100Mbps race subtest (#41006463850); added narrow test-only reconnection while ActivePeers=0 rather than weakening byte assertions. Last two runs green.
- Latest CI [#41007070375](https://github.com/aisynapze/byteplay/actions/runs/41007070375) **SUCCESS**: Go/frontend, seeded media/race, and Chromium UI jobs.
- M7 is PARTIAL, not release-ready; real browser HLS playback, cross-browser, zoom and human interaction tests remain open.

## 2026-10-30 — Chrome real playback and Docker CI milestone

- Added CI-only fixture host and Playwright real video decoding gate. Earlier run on stripped Chromium headless shell rejected H.264 MSE codec (no playlist fetched). Corrected test to installed Google Chrome and bounded the video.play wait. [#41008831042](https://github.com/aisynapze/byteplay/actions/runs/41008831042): 5/5 SUCCESS. Real H.264/AAC playback observed 34 frames/1.208469 seconds, 640x360 and 4 TS responses.
- Added locked npm CSS multi-stage Docker build and Docker smoke for Basic Auth (401 anonymous), valid FFmpeg/FFprobe/libx264/AAC and shipped CSS. All green.
- Updated README operator steps to byteplay fork, `go run .`, safe listener/auth requirements and local Docker build; avoided implying an unapproved published image.
- Enlarged responsive Chromium smoke viewport matrix: code committed, full new matrix rerun in progress; do not claim newly added viewport checks passed until that run finishes.
- M7 and M8 remain partial, with cross-browser, seek timestamp, resources, eviction, accessibility and release gates not certified.

## 2026-10-30 — Responsive viewport coverage

- [CI #41009203394](https://github.com/aisynapze/byteplay/actions/runs/41009203394) SUCCESS all five jobs. Browser smoke home 11 spec sizes, watch 5 sizes; actual Google Chrome HLS decoding separately green. Preliminary screenshot audit of 375 phone, 834 tablet, 1024 watch and 844 landscape showed no evident clipping. More M7/M8 acceptance remains OPEN.

## 2026-10-30 — Combined disk watermark and playback lifecycle

- Implemented 15-minute no-demand HLS session reaper and periodic minute sweep. Reclaims map slots, cancels/joins owned worker before deleting its generated HLS directory. Recent sessions are preserved.
- Fixed generation-1 directory ancestry bug found via seeded integration: all generations now use `hls-cache/{id}/g/{n}`, with distinct directories and cleanup of superseded generations.
- Added `BITPLAY_CACHE_MAX_BYTES` positive-integer configuration, default 10 GiB, accounting for both downloaded torrent data and HLS output. Fail closed on invalid config; `cache_full` persists after worker cancellation.
- Initial CI red due to expected gofmt/unused import and a real nested-generation deletion failure; corrected with tests. Latest [#41010209989](https://github.com/aisynapze/byteplay/actions/runs/41010209989): 5/5 green including real seeded HLS, normal/race tests and Chrome decoding.
- Atomic reservations, crash-orphan recovery, true disk eviction and stress acceptance remain open; no release tag or merge.
