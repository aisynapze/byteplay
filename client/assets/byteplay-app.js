import {
  MAX_TORRENT_BYTES, MAX_CAPTION_BYTES, validateTorrentFile, validateCaptionFile,
  readableError, videoFiles, captionFiles, formatBytes, formatTime, stateText, srtToVtt, isCurrentHLSStatus
} from "./byteplay-core.mjs";

const el = (id) => document.getElementById(id);
const ui = { session: null, files: [], videos: [], captions: [], selected: null, playback: null,
  status: null, player: null, poll: null, token: 0, wantPlay: true,
  browser: "waiting", attachedGeneration: 0, expectedGeneration: 0, trackURLs: [], lastKnownTime: 0,
  suppressEvents: false, probe: null, provider: null };

async function request(path, opts = {}) {
  let response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...opts });
  } catch (error) {
    throw new Error("BytePlay server is unreachable. Check the connection and retry.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(readableError(body, "Server returned HTTP " + response.status));
    error.status = response.status;
    error.code = body?.error?.code;
    throw error;
  }
  return body;
}
function putText(id, value) { el(id).textContent = value; }
function showError(id, message) {
  const target = el(id);
  target.textContent = message;
  target.hidden = false;
}
function clearError(id) { el(id).hidden = true; el(id).textContent = ""; }
function showWatch() {
  el("bp-home").hidden = true;
  el("bp-watch").hidden = false;
  document.title = "Watch · BytePlay";
  window.scrollTo({ top: 0, behavior: "instant" });
}
function showHome() {
  el("bp-home").hidden = false;
  el("bp-watch").hidden = true;
  document.title = "BytePlay — Your video, ready to stream";
}
function setOverlay(title, detail, visible = true) {
  el("bp-player-overlay").hidden = !visible;
  putText("bp-overlay-title", title);
  putText("bp-overlay-detail", detail);
}
function selectedVideoURL(file) {
  return "/api/v1/torrent/" + encodeURIComponent(ui.session) + "/stream/" + file.index;
}
function trackURL(file) {
  const root = selectedVideoURL(file);
  return /\.srt$/i.test(file.name) ? root + ".vtt?format=vtt" : root;
}
function setStage(status) {
  const state = stateText(status, ui.browser);
  putText("bp-stage", state.title);
  putText("bp-player-state", state.title);
  putText("bp-player-detail", state.detail);
  if (status?.peers != null) putText("bp-peers", String(status.peers));
  else putText("bp-peers", "—");
  putText("bp-speed", status?.downloadBytesPerSecond == null
    ? "—" : formatBytes(status.downloadBytesPerSecond) + "/s");
  const total = status?.selectedFileBytesTotal, downloaded = status?.selectedFileBytesCompleted;
  putText("bp-progress", total > 0 && downloaded != null
    ? Math.min(100, 100 * downloaded / total).toFixed(1) + "%" : "—");
  if (state.error) {
    showError("bp-watch-error", state.detail);
    el("bp-retry").hidden = false;
    setOverlay(state.title, state.detail, true);
  }
  if (!status?.playlistReady && !state.error) setOverlay(state.title, state.detail, true);
}
function renderInfo() {
  if (!ui.selected) return;
  const status = ui.status || {};
  const video = (ui.probe?.streams || []).find(stream => stream.type === "video");
  const audio = (ui.probe?.streams || []).filter(stream => stream.type === "audio");
  const values = [
    ["Filename", ui.selected.name],
    ["File size", formatBytes(ui.selected.size)],
    ["Duration", formatTime(status.durationSeconds ?? ui.probe?.duration)],
    ["Video codec", video?.codec || "Not yet available"],
    ["Audio codecs", audio.length ? audio.map(track => track.codec).join(", ") : "Not yet available"],
    ["HLS route", { copy: "Copy", "audio-transcode": "Audio conversion", "video-transcode": "Video conversion" }[status.mode] || "Not yet determined"],
    ["Peers", status.peers == null ? "Unknown" : String(status.peers)],
    ["Download progress", el("bp-progress").textContent],
    ["Error", status.error?.message || "None reported"]
  ];
  const list = el("bp-info-list");
  list.replaceChildren();
  for (const [key, value] of values) {
    const term = document.createElement("dt");
    term.textContent = key;
    const description = document.createElement("dd");
    description.textContent = String(value);
    const block = document.createElement("div");
    block.append(term, description);
    list.append(block);
  }
}
function renderAudio() {
  const tracks = (ui.probe?.streams || []).filter(s => s.type === "audio" && Number.isInteger(s.index));
  const wrap = el("bp-audio-wrap"), select = el("bp-audio");
  wrap.hidden = tracks.length <= 1;
  select.replaceChildren();
  for (const track of tracks) {
    const option = document.createElement("option");
    option.value = String(track.index);
    option.textContent = (track.language || "Audio") + " · " + track.codec + " (#" + track.index + ")";
    select.append(option);
  }
  if (tracks.length) {
    const selected = tracks.find(t => t.default) || tracks[0];
    select.value = String(selected.index);
  }
}
function prepareVideo() {
  if (ui.player) return;
  if (typeof window.videojs !== "function") {
    throw new Error("Video.js could not load. Check the bundled player assets.");
  }
  ui.player = window.videojs("bp-video", {
    controls: true, fluid: true, aspectRatio: "16:9", autoplay: false,
    preload: "auto", playbackRates: [0.75, 1, 1.25, 1.5, 2],
    html5: { nativeTextTracks: false },
    controlBar: { progressControl: false }
  });
  const player = ui.player;
  player.on("play", () => {
    ui.browser = "playing";
    ui.wantPlay = true;
    if (!ui.suppressEvents) sendControl("resume");
    setStage(ui.status);
  });
  player.on("pause", () => {
    ui.browser = "paused";
    if (!ui.suppressEvents) {
      ui.wantPlay = false;
      sendControl("pause");
    }
    setStage(ui.status);
  });
  player.on("waiting", () => { ui.browser = "buffering"; setStage(ui.status); });
  player.on("playing", () => { ui.browser = "playing"; setStage(ui.status); });
  player.on("timeupdate", () => {
    if (!ui.status?.durationSeconds) return;
    const absolute = window.BytePlayTimeline.absoluteSeconds(ui.status.startSeconds || 0, player.currentTime() || 0);
    ui.lastKnownTime = absolute;
    const field = el("bp-seek");
    if (document.activeElement !== field) field.value = String(Math.min(Number(field.max), absolute));
    putText("bp-time", formatTime(absolute) + " / " + formatTime(ui.status.durationSeconds));
  });
  player.on("error", () => {
    ui.browser = "error";
    const detail = player.error()?.message || "The browser cannot decode or load this HLS stream.";
    showError("bp-watch-error", detail);
    el("bp-retry").hidden = false;
    setOverlay("Playback error", detail, true);
  });
}
function updateSeekRange(status) {
  const duration = status?.durationSeconds;
  if (!Number.isFinite(duration) || duration <= 0) return;
  el("bp-timeline").hidden = false;
  el("bp-seek").max = String(Math.floor(duration));
  putText("bp-time", formatTime(ui.lastKnownTime) + " / " + formatTime(duration));
}
async function attachReady(status) {
  if (!status.playlistURL && !status.playlistUrl) return;
  const src = status.playlistURL || status.playlistUrl;
  if (ui.attachedGeneration === status.generation) return;
  prepareVideo();
  ui.attachedGeneration = status.generation;
  ui.status = status;
  ui.suppressEvents = true;
  ui.player.pause();
  ui.player.src({ src, type: "application/x-mpegURL" });
  ui.suppressEvents = false;
  setOverlay("Stream ready", "Press play to start watching.", false);
  updateSeekRange(status);
  installTorrentTracks();
  if (ui.wantPlay) {
    ui.player.play()?.catch(() => {
      ui.browser = "paused";
      setStage(status);
      putText("bp-player-detail", "Your browser requires a click to begin playback.");
    });
  } else {
    sendControl("pause");
  }
}
async function refreshProbe(token) {
  if (!ui.session || !ui.selected) return;
  try {
    const data = await request("/api/v1/torrent/" + encodeURIComponent(ui.session) + "/probe/" + ui.selected.index);
    if (token !== ui.token) return;
    ui.probe = data;
    renderAudio();
    renderInfo();
  } catch {
    // Probe can still be pending; playback status reports the authoritative HLS failure.
  }
}
async function pollStatus(token) {
  if (token !== ui.token || !ui.playback) return;
  try {
    const status = await request("/api/v1/hls/" + encodeURIComponent(ui.playback) + "/status");
    if (token !== ui.token) return;
    if (!isCurrentHLSStatus(status, ui.expectedGeneration)) {
      ui.poll = setTimeout(() => pollStatus(token), 300);
      return;
    }
    ui.expectedGeneration = status.generation;
    ui.status = status;
    setStage(status);
    updateSeekRange(status);
    renderInfo();
    if (status.playlistReady) await attachReady(status);
  } catch (error) {
    if (token !== ui.token) return;
    showError("bp-watch-error", error.message);
    setOverlay("Connection interrupted", error.message);
    el("bp-retry").hidden = false;
  }
  if (token === ui.token && ui.playback) {
    ui.poll = setTimeout(() => pollStatus(token), 1500);
  }
}
function stopPolling() {
  ui.token++;
  clearTimeout(ui.poll);
  ui.poll = null;
}
async function releasePlayback() {
  stopPolling();
  const id = ui.playback;
  ui.playback = null;
  ui.status = null;
  ui.attachedGeneration = 0;
  ui.expectedGeneration = 0;
  if (ui.player) {
    ui.suppressEvents = true;
    ui.player.dispose();
    ui.player = null;
    ui.suppressEvents = false;
    const surface = document.querySelector(".bp-player-surface");
    const video = document.createElement("video");
    video.id = "bp-video";
    video.className = "video-js vjs-big-play-centered";
    video.setAttribute("controls", "");
    video.setAttribute("playsinline", "");
    surface.replaceChildren(video);
  }
  for (const url of ui.trackURLs) URL.revokeObjectURL(url);
  ui.trackURLs = [];
  if (id) {
    await fetch("/api/v1/hls/" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin" }).catch(() => {});
  }
}
async function startFile(file) {
  await releasePlayback();
  ui.selected = file;
  ui.probe = null;
  ui.lastKnownTime = 0;
  ui.browser = "waiting";
  ui.wantPlay = true;
  clearError("bp-watch-error");
  el("bp-retry").hidden = true;
  el("bp-timeline").hidden = true;
  putText("bp-title", file.name);
  putText("bp-subtitle", formatBytes(file.size) + " · Torrent source");
  el("bp-download").href = selectedVideoURL(file);
  el("bp-download").setAttribute("download", file.name.split("/").pop() || "video");
  setOverlay("Preparing stream", "Checking the video and collecting needed torrent pieces.");
  const token = ui.token;
  try {
    const ticket = await request("/api/v1/hls/sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: ui.session, fileIndex: file.index })
    });
    if (token !== ui.token) {
      fetch("/api/v1/hls/" + ticket.playbackId, { method: "DELETE" }).catch(() => {});
      return;
    }
    ui.playback = ticket.playbackId;
    ui.expectedGeneration = ticket.generation || 1;
    ui.status = ticket;
    setStage(ticket);
    pollStatus(token);
    refreshProbe(token);
  } catch (error) {
    if (token !== ui.token) return;
    showError("bp-watch-error", error.message);
    setOverlay("Unable to prepare stream", error.message);
    el("bp-retry").hidden = false;
  }
}
function renderFileSelector() {
  const select = el("bp-video-select");
  select.replaceChildren();
  for (const file of ui.videos) {
    const option = document.createElement("option");
    option.value = String(file.index);
    option.textContent = file.name;
    select.append(option);
  }
  select.value = String(ui.selected.index);
  document.querySelector(".bp-file-choice").hidden = ui.videos.length < 2;
}
async function openMagnet(value) {
  const magnet = String(value || "").trim();
  if (!magnet) return showError("bp-home-error", "Enter a magnet link or a 40-character infohash.");
  clearError("bp-home-error");
  const button = el("bp-open");
  button.disabled = true;
  button.textContent = "Reading torrent metadata…";
  try {
    await releasePlayback();
    const ticket = await request("/api/v1/torrent/add", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ magnet })
    });
    ui.session = ticket.sessionId;
    const files = await request("/api/v1/torrent/" + encodeURIComponent(ui.session));
    ui.files = Array.isArray(files) ? files : [];
    ui.videos = videoFiles(ui.files);
    ui.captions = captionFiles(ui.files);
    if (!ui.videos.length) throw new Error("No supported video file was found in this torrent.");
    ui.selected = ui.videos[0];
    renderFileSelector();
    showWatch();
    await startFile(ui.selected);
  } catch (error) {
    showError("bp-home-error", error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Open video ↗";
  }
}
async function sendControl(action) {
  if (!ui.playback) return;
  try {
    await request("/api/v1/hls/" + ui.playback + "/control", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
  } catch (error) {
    if (error.code === "seek_required" && action === "resume") {
      await seekTo(ui.lastKnownTime);
    } else {
      showError("bp-watch-error", error.message);
    }
  }
}
async function seekTo(absolute, audioStream) {
  if (!ui.playback || !ui.status || !Number.isFinite(absolute)) return;
  const token = ui.token;
  // Preserve explicit browser play/pause intent across buffering and seek restarts.
  // A buffering player may be temporarily paused even when play was requested.
  setOverlay("Seeking video", "Starting the HLS stream at " + formatTime(absolute));
  clearError("bp-watch-error");
  try {
    const seekResult = await window.BytePlayTimeline.seekAbsolute({
      targetSeconds: absolute,
      generationStartSeconds: ui.status.startSeconds || 0,
      buffered: ui.player?.buffered(),
      audioStream,
      seekBuffered: (relative) => ui.player.currentTime(relative),
      restartGeneration: async (payload) => {
        const result = await request("/api/v1/hls/" + ui.playback + "/seek", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        return result;
      }
    });
    if (token !== ui.token) return;
    ui.lastKnownTime = absolute;
    if (seekResult.type === "buffered") {
      setOverlay("", "", false);
      return;
    }
    ui.expectedGeneration = seekResult.generation;
    ui.status = {
      ...ui.status, generation: seekResult.generation, state: "preparing",
      playlistReady: false, playlistUrl: null, playlistURL: null, startSeconds: absolute
    };
    // Never reattach an obsolete playlist while the generation is restarting.
    ui.attachedGeneration = 0;
    ui.suppressEvents = true;
    ui.player?.pause();
    ui.suppressEvents = false;
    putText("bp-player-state", "Preparing new generation");
  } catch (error) {
    if (token !== ui.token) return;
    showError("bp-watch-error", error.message);
    if (ui.status?.playlistReady) setOverlay("", "", false);
    el("bp-retry").hidden = false;
  }
}
function installTorrentTracks() {
  if (!ui.player) return;
  for (const file of ui.captions) {
    const track = { kind: "subtitles", src: trackURL(file), srclang: "en",
      label: file.name.split("/").pop() };
    ui.player.addRemoteTextTrack(track, false);
  }
}
async function loadCaptions(file) {
  const error = validateCaptionFile(file);
  if (error) return showError("bp-watch-error", error);
  if (!ui.player) return showError("bp-watch-error", "Start the video player before adding subtitles.");
  try {
    const raw = await file.text();
    const text = /\.srt$/i.test(file.name) ? srtToVtt(raw)
      : (/^\uFEFF?WEBVTT/.test(raw) ? raw.replace(/^\uFEFF/, "") : srtToVtt(raw));
    const url = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
    ui.trackURLs.push(url);
    const added = ui.player.addRemoteTextTrack({
      kind: "subtitles", src: url, srclang: "en", label: file.name
    }, false);
    const tracks = ui.player.textTracks();
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = tracks[i] === added.track ? "showing" : "disabled";
    }
    clearError("bp-watch-error");
    putText("bp-player-detail", "Subtitle file added: " + file.name);
  } catch (error) {
    showError("bp-watch-error", error.message);
  }
}
async function uploadTorrent(file) {
  const failure = validateTorrentFile(file);
  if (failure) return showError("bp-home-error", failure);
  clearError("bp-home-error");
  const form = new FormData();
  form.append("torrent", file);
  try {
    const converted = await request("/api/v1/torrent/convert", { method: "POST", body: form });
    el("bp-magnet").value = converted.magnet;
    await openMagnet(converted.magnet);
  } catch (error) {
    showError("bp-home-error", error.message);
  }
}
async function loadProvider() {
  try {
    const settings = await request("/api/v1/settings");
    ui.provider = settings.enableProwlarr ? "prowlarr" : settings.enableJackett ? "jackett" : null;
    el("bp-search-area").hidden = !ui.provider;
  } catch {
    el("bp-search-area").hidden = true;
  }
}
async function searchProvider(query) {
  if (!ui.provider || !query.trim()) return;
  const results = el("bp-results");
  const message = el("bp-search-message");
  results.replaceChildren();
  message.textContent = "Searching your connected indexer…";
  try {
    const data = await request("/api/v1/" + ui.provider + "/search?q=" + encodeURIComponent(query), {
      method: "POST", headers: { "Content-Type": "application/json" }
    });
    message.textContent = Array.isArray(data) ? String(data.length) + " results" : "No results";
    for (const item of (Array.isArray(data) ? data : []).slice(0, 30)) {
      const row = document.createElement("article");
      row.className = "bp-result";
      const left = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.title || "Untitled torrent";
      const details = document.createElement("small");
      details.textContent = [item.indexer, item.size, item.seeders == null ? "" : item.seeders + " seeders"].filter(Boolean).join(" · ");
      left.append(title, details);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Open";
      const magnet = item.downloadUrl || item.magnetUrl;
      button.disabled = !magnet;
      button.addEventListener("click", () => openMagnet(magnet));
      row.append(left, button);
      results.append(row);
    }
  } catch (error) {
    message.textContent = error.message;
  }
}
el("bp-open-form").addEventListener("submit", (event) => {
  event.preventDefault();
  openMagnet(el("bp-magnet").value);
});
el("bp-paste").addEventListener("click", async () => {
  try {
    el("bp-magnet").value = await navigator.clipboard.readText();
    el("bp-magnet").focus();
    clearError("bp-home-error");
  } catch { showError("bp-home-error", "Clipboard access is unavailable. Paste into the field instead."); }
});
el("bp-torrent-file").addEventListener("change", (event) => {
  if (event.target.files?.[0]) uploadTorrent(event.target.files[0]);
  event.target.value = "";
});
const drop = el("bp-drop");
for (const type of ["dragover", "dragenter"]) {
  drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add("dragover"); });
}
for (const type of ["dragleave", "drop"]) {
  drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.remove("dragover"); });
}
drop.addEventListener("drop", (event) => {
  if (event.dataTransfer?.files?.[0]) uploadTorrent(event.dataTransfer.files[0]);
});
el("bp-settings").addEventListener("click", () => el("settings-btn").click());
el("bp-new").addEventListener("click", async () => {
  await releasePlayback();
  ui.session = null;
  ui.files = [];
  showHome();
});
el("bp-video-select").addEventListener("change", () => {
  const file = ui.videos.find(f => f.index === Number(el("bp-video-select").value));
  if (file) startFile(file);
});
el("bp-info-toggle").addEventListener("click", () => {
  const panel = el("bp-info");
  panel.hidden = !panel.hidden;
  if (!panel.hidden) renderInfo();
});
el("bp-close-info").addEventListener("click", () => { el("bp-info").hidden = true; });
el("bp-retry").addEventListener("click", () => { if (ui.selected) startFile(ui.selected); });
el("bp-seek").addEventListener("change", () => seekTo(Number(el("bp-seek").value)));
el("bp-audio").addEventListener("change", () => seekTo(ui.lastKnownTime, Number(el("bp-audio").value)));
el("bp-captions").addEventListener("change", async (event) => {
  if (event.target.files?.[0]) await loadCaptions(event.target.files[0]);
  event.target.value = "";
});
el("bp-search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  searchProvider(el("bp-query").value);
});
const magnetParameter = new URLSearchParams(location.search).get("torrent");
if (magnetParameter) el("bp-magnet").value = magnetParameter;
loadProvider();
