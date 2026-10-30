/* Browser smoke for M7: real BytePlay HTTP server, mock metadata only for
 * deterministic watch-state UI. Real torrent→FFmpeg tests run in Go CI.
 * Screenshots are artifacts for manual review, not automatic visual approval.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE = process.env.BYTEPLAY_E2E_URL || "http://127.0.0.1:3347";
const OUTPUT = process.env.BYTEPLAY_SCREENSHOT_DIR || "/tmp/byteplay-ui-shots";
const TORRENT = "a".repeat(40);
const PLAYBACK = "b".repeat(32);
fs.mkdirSync(OUTPUT, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
      { width: 320, height: 720 },
      { width: 844, height: 390 }
    ]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      page.on("pageerror", error => errors.push(viewport.width + ": " + error.message));
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.locator("#bp-hero-title").waitFor({ state: "visible" });
      assert.match(await page.locator("#bp-hero-title").innerText(), /Your video/);
      assert.equal(await page.locator("#legacy-main").isVisible(), false);
      assert.equal(await page.locator("#bp-open").isVisible(), true);
      assert.equal(await page.locator("#bp-torrent-file").count(), 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 2, viewport.width + " home horizontally overflows by " + overflow + "px");
      await page.screenshot({ path: path.join(OUTPUT, "home-" + viewport.width + "x" + viewport.height + ".png"), fullPage: true });
      await page.locator("#bp-open").click();
      assert.match(await page.locator("#bp-home-error").innerText(), /Enter a magnet link/);
      await page.locator("#bp-settings").click();
      assert.equal(await page.locator("#settings-model").isVisible(), true, "legacy settings dialog must remain functional");
      await page.locator(".close-settings").first().click({ position: { x: 5, y: 5 } });
      assert.equal(await page.locator("#settings-model").isVisible(), false);
      if (viewport.width === 1920 || viewport.width === 390) {
        await page.route("**/api/v1/torrent/add", route => route.fulfill({
          status: 200, contentType: "application/json", body: JSON.stringify({ sessionId: TORRENT })
        }));
        await page.route("**/api/v1/torrent/" + TORRENT, route => route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify([{ index: 0, name: "Legal synthetic sample (H.264).mkv", size: 12345678 },
            { index: 1, name: "English.srt", size: 1200 }])
        }));
        await page.route("**/api/v1/hls/sessions", route => route.fulfill({
          status: 201, contentType: "application/json",
          body: JSON.stringify({ playbackId: PLAYBACK, state: "queued", generation: 1,
            playlistReady: false, statusUrl: "/api/v1/hls/" + PLAYBACK + "/status", segmentsReady: 0 })
        }));
        await page.route("**/api/v1/hls/" + PLAYBACK + "/status", route => route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ playbackId: PLAYBACK, state: "preparing", generation: 1, mode: "copy",
            playlistReady: false, statusUrl: "/api/v1/hls/" + PLAYBACK + "/status",
            peers: 2, downloadBytesPerSecond: null, selectedFileBytesTotal: 12345678,
            selectedFileBytesCompleted: 1572864, segmentsReady: 0 })
        }));
        await page.route("**/api/v1/torrent/" + TORRENT + "/probe/0", route => route.fulfill({
          status: 200, contentType: "application/json", body: JSON.stringify({ duration: 60,
            streams: [{ type: "video", index: 0, codec: "h264" },
              { type: "audio", index: 1, codec: "aac", language: "en" }] })
        }));
        await page.locator("#bp-magnet").fill("magnet:?xt=urn:btih:" + TORRENT);
        await page.locator("#bp-open").click();
        await page.locator("#bp-watch").waitFor({ state: "visible" });
        await page.locator("#bp-stage").getByText("Preparing stream").waitFor();
        assert.equal(await page.locator("#bp-title").innerText(), "Legal synthetic sample (H.264).mkv");
        assert.equal(await page.locator("#bp-peers").innerText(), "2");
        assert.equal(await page.locator("#bp-speed").innerText(), "—", "speed must not be invented");
        await page.locator("#bp-info-toggle").click();
        assert.equal(await page.locator("#bp-info").isVisible(), true);
        const watchOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(watchOverflow <= 2, viewport.width + " watch horizontally overflows by " + watchOverflow + "px");
        await page.screenshot({ path: path.join(OUTPUT, "watch-" + viewport.width + "x" + viewport.height + ".png"), fullPage: true });
        await page.locator("#bp-new").click();
        await page.locator("#bp-home").waitFor({ state: "visible" });
      }
      await page.close();
    }
    assert.deepEqual(errors, [], "uncaught frontend exceptions");
    console.log("BYTEPLAY_M7_BROWSER_SMOKE_PASS");
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
