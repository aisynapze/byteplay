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
