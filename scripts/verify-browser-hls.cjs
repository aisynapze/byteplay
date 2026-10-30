// Playwright decodes real HLS from a loopback BitTorrent peer + FFmpeg.
// Unlike verify-ui.cjs, this test does NOT mock the torrent or HLS HTTP APIs.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const { chromium }=require("playwright");

const BASE=process.env.BYTEPLAY_E2E_URL || "http://127.0.0.1:3347";
const OUT=process.env.BYTEPLAY_SCREENSHOT_DIR || "/tmp/byteplay-browser-media";
fs.mkdirSync(OUT,{recursive:true});

async function run() {
  const browser=await chromium.launch({channel:"chrome",headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[], segments=[], playlists=[];
  page.on("pageerror",err=>errors.push(err.message));
  page.on("response",res=>{
    const url=res.url();
    if (/\/g\/[0-9]+\/segment-[0-9]{6}\.ts$/.test(url))segments.push({status:res.status(),url});
    if (/\/g\/[0-9]+\/index\.m3u8$/.test(url))playlists.push({status:res.status(),url});
  });
  try {
    const fixture=await page.request.get(BASE+"/__byteplay_browser_fixture");
    assert.equal(fixture.status(),200,"fixture server not running");
    const {sessionId}=await fixture.json();
    assert.match(sessionId,/^[0-9a-f]{40}$/);
    await page.goto(BASE,{waitUntil:"domcontentloaded"});
    const supportsAVC=await page.evaluate(()=>Boolean(window.MediaSource?.isTypeSupported?.('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')));
    assert.equal(supportsAVC,true,"Installed Chrome must support MSE H.264/AAC to run this decoding gate");
    await page.locator("#bp-magnet").fill("magnet:?xt=urn:btih:"+sessionId);
    await page.locator("#bp-open").click();
    await page.locator("#bp-watch").waitFor({state:"visible",timeout:20000});
    await page.waitForFunction(()=>{
      const stage=document.getElementById("bp-stage")?.textContent;
      const error=document.getElementById("bp-watch-error");
      if (error && !error.hidden) throw new Error("Playback status: "+error.textContent);
      return stage==="Ready to play" || stage==="Playing" || stage==="Buffering";
    },null,{timeout:55000});
    // Chromium can need a user gesture even when a source is ready.
    const playerVideo=page.locator(".bp-player-surface video");
    await playerVideo.waitFor({state:"attached"});
    await page.evaluate(()=>{
      const video=document.querySelector(".bp-player-surface video");
      if (!video) throw new Error("Video.js tech missing");
      // Do not await a play() promise before installing the bounded playback
      // oracle: MSE may leave it pending indefinitely during a stall.
      void video.play().catch(()=>{});
    });
    // Require decoded visual frames AND advancing media time. A 200 playlist
    // response, an HLS manifest, or a spinning player is not sufficient.
    await page.waitForFunction(()=>{
      const video=document.querySelector(".bp-player-surface video");
      if (!video) return false;
      const quality=video.getVideoPlaybackQuality?.();
      const decoded=quality?.totalVideoFrames??video.webkitDecodedFrameCount??0;
      return video.currentTime >= 1.2 && video.readyState >= 2 && decoded > 0;
    },null,{timeout:45000});
    const decoded=await page.evaluate(()=>{
      const v=document.querySelector(".bp-player-surface video");
      return {currentTime:v.currentTime,readyState:v.readyState,decodedFrames:v.getVideoPlaybackQuality?.()?.totalVideoFrames ?? v.webkitDecodedFrameCount ?? null,
        width:v.videoWidth,height:v.videoHeight,error:v.error?.message||null};
    });
    assert.ok(decoded.width>0 && decoded.height>0,"decoded dimensions missing");
    assert.ok(decoded.currentTime>=1.2,"no playback time advancement");
    assert.ok(decoded.decodedFrames>0,"no decoded video frames");
    assert.ok(playlists.some(x=>x.status===200),"browser did not fetch an HLS playlist");
    assert.ok(segments.some(x=>x.status===200),"browser did not fetch HLS TS segments");
    assert.deepEqual(errors,[],"unhandled browser JavaScript exception");
    await page.screenshot({path:path.join(OUT,"real-hls-playback-1440x900.png"),fullPage:true});
    console.log("BYTEPLAY_REAL_BROWSER_HLS_PASS "+JSON.stringify({
      decoded,playlist200:playlists.filter(x=>x.status===200).length,
      segments200:segments.filter(x=>x.status===200).length}));
  }catch(err){
    const state=await page.evaluate(()=>{
      const v=document.querySelector(".bp-player-surface video");
      const player=window.videojs?.getPlayer?.("bp-video");
      const src=player?.currentSource?.();
      const Html5=window.videojs?.getTech?.("Html5");
      const candidate={src:src?.src||"/test.m3u8",type:"application/x-mpegURL"};
      const mediaSupported={
        MediaSource:typeof window.MediaSource,
        isSupported:window.MediaSource?.isTypeSupported?.('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
        VHS:typeof window.videojs?.Vhs,
        hlsHtml5Play:Html5?.canPlaySource?.(candidate) || null,
        source:src,version:window.videojs?.VERSION
      };
      return {mediaSupported,stage:document.getElementById("bp-stage")?.textContent,
        error:document.getElementById("bp-watch-error")?.textContent,
        overlay:document.getElementById("bp-overlay-title")?.textContent,
        video:v?{readyState:v.readyState,currentTime:v.currentTime,error:v.error?.message}:null};
    }).catch(()=>({}));
    console.error("M7 browser-media diagnostics",JSON.stringify({state,errors,segments,playlists}));
    await page.screenshot({path:path.join(OUT,"real-hls-failure-1440x900.png"),fullPage:true}).catch(()=>{});
    throw err;
  }finally{
    await page.close();
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1});
