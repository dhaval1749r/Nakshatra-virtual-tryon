/* Virtual try-on for earrings, necklaces and bracelets. Detection runs in the browser (MediaPipe) and, inside the
   Claude preview where those files cannot be loaded, Claude finds the points from the photo. */
(function () {
  'use strict';
  var D = window.TRYON || {};
  var isNum = function (v) { return typeof v === 'number' && isFinite(v); };
  var imgCache = {};
  function loadImg(src) {
    if (!imgCache[src]) imgCache[src] = new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('image ' + src)); }; i.src = src; });
    return imgCache[src];
  }
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); });
  }

  /* ---------- Claude as the fallback finder ---------- */
  async function claudeJSON(prompt, blob) {
    var c = window.claude; if (!c || !c.use || !blob) return null;
    var ai = await c.use('sample'); if (!ai) return null;
    var lim = await ai.limits(); if (!lim || !lim.images) return null;
    return ai.json(prompt, { images: blob });
  }
  var okPt = function (p) { return p && isNum(p.x) && isNum(p.y) && p.x > -0.05 && p.x < 1.05 && p.y > -0.05 && p.y < 1.05; };

  /* ---------- face ---------- */
  var faceLib = null, faceResolve = null;
  async function getFace() {
    if (faceLib) return faceLib;
    await window.njPrep('vendor/face_mesh/', ['face_mesh_solution_packed_assets.data', 'face_mesh.binarypb']);
    await loadScript('vendor/face_mesh/face_mesh.js');
    var f = new window.FaceMesh({ locateFile: function (n) { return window.njLoc('vendor/face_mesh/', n); } });
    f.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.3, minTrackingConfidence: 0.3 });
    f.onResults(function (r) { if (faceResolve) { var g = faceResolve; faceResolve = null; g(r); } });
    await f.initialize(); faceLib = f; return f;
  }
  /* returns pixel points: lobeL/lobeR (viewer's left/right earlobe), fw (face width px), roll (radians), yaw (-1..1), chin */
  async function faceMP(canvas, W, H) {
    var f = await getFace();
    var r = await new Promise(function (resolve, reject) {
      faceResolve = resolve; f.send({ image: canvas }).catch(reject);
      setTimeout(function () { if (faceResolve) { faceResolve = null; reject(new Error('timeout')); } }, 60000);
    });
    var lm = r && r.multiFaceLandmarks && r.multiFaceLandmarks[0]; if (!lm) return null;
    var P = function (i) { return { x: lm[i].x * W, y: lm[i].y * H }; };
    var a = P(234), b = P(454), j1 = P(132), j2 = P(361), chin = P(152), nose = P(1), top = P(10);
    var fw = Math.hypot(b.x - a.x, b.y - a.y), roll = Math.atan2(b.y - a.y, b.x - a.x);
    var rx = Math.cos(roll), ry = Math.sin(roll);
    var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    var yaw = ((nose.x - mid.x) * rx + (nose.y - mid.y) * ry) / fw;
    var lobeL = { x: a.x + 0.7 * (j1.x - a.x) - 0.04 * fw * rx, y: a.y + 0.7 * (j1.y - a.y) - 0.04 * fw * ry };
    var lobeR = { x: b.x + 0.7 * (j2.x - b.x) + 0.04 * fw * rx, y: b.y + 0.7 * (j2.y - b.y) + 0.04 * fw * ry };
    return { lobeL: lobeL, lobeR: lobeR, fw: fw, roll: roll, yaw: yaw, chin: chin, top: top, src: 'mp' };
  }
  var FACE_PROMPT = 'This photo shows a person face. Find where earrings would hang. Reply with only one JSON object: ' +
    '{"found":true,"left_lobe":{"x":0.0,"y":0.0},"right_lobe":{"x":0.0,"y":0.0},"left_visible":true,"right_visible":true,"chin":{"x":0.0,"y":0.0},"face_width":0.0,"roll_deg":0.0}. ' +
    '"left_lobe" and "right_lobe" are on the left and right of the IMAGE: the lowest soft part of each earlobe, in the middle of the lobe. "visible" is false if that ear is hidden by hair or the head is turned away. ' +
    '"chin" is the bottom of the chin. "face_width" is the width of the face between the two ears as a fraction of the image width. "roll_deg" is the head tilt in degrees (0 when upright, positive when the head tilts to the image right). ' +
    'All x and y are fractions from 0 to 1 of the image width and height from the top-left. If no face is clearly visible reply {"found":false}.';
  async function faceClaude(blob, W, H) {
    var r = await claudeJSON(FACE_PROMPT, blob);
    if (!r || r.found === false || !okPt(r.left_lobe) || !okPt(r.right_lobe) || !okPt(r.chin) || !isNum(r.face_width)) return null;
    var L = { x: r.left_lobe.x * W, y: r.left_lobe.y * H }, R = { x: r.right_lobe.x * W, y: r.right_lobe.y * H };
    var fw = r.face_width * W * 0.98, roll = ((isNum(r.roll_deg) ? r.roll_deg : 0)) * Math.PI / 180;
    return { lobeL: L, lobeR: R, fw: fw, roll: roll, yaw: 0, hideL: r.left_visible === false, hideR: r.right_visible === false, chin: { x: r.chin.x * W, y: r.chin.y * H }, src: 'claude' };
  }
  async function findFace(canvas, blob, W, H) {
    var f = null;
    try { f = await faceMP(canvas, W, H); } catch (e) { f = null; }
    if (!f) { try { f = await faceClaude(blob, W, H); } catch (e) { f = null; } }
    return f;
  }

  /* ---------- light and shadow helpers ---------- */
  function lightAt(ctx, x, y, r) {
    try {
      var s = Math.max(4, Math.round(r)), x0 = Math.max(0, Math.round(x - s)), y0 = Math.max(0, Math.round(y - s));
      var w = Math.min(ctx.canvas.width - x0, 2 * s), h = Math.min(ctx.canvas.height - y0, 2 * s); if (w < 2 || h < 2) return 150;
      var d = ctx.getImageData(x0, y0, w, h).data, t = 0, n = 0;
      for (var i = 0; i < d.length; i += 16) { t += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; n++; }
      return n ? t / n : 150;
    } catch (e) { return 150; }
  }

  /* ---------- earrings ---------- */
  async function earrings(item, cfg, photo, W, H, blob, faceIn) {
    var face = faceIn || await findFace(photo, blob, W, H);
    if (!face) throw new Error('I could not find a face. Please use a clear photo where your face and ears are visible.');
    var imgs = await Promise.all(cfg.files.map(loadImg));
    var pxmm = face.fw / 142;                       // face width between the ears is about 142 mm
    var hpx = cfg.mm * pxmm, sctx = photo.getContext('2d');
    var jobs = [
      { lobe: face.lobeL, img: imgs[0], hide: face.hideL || face.yaw < -0.16, sign: -1 },
      { lobe: face.lobeR, img: imgs[1] || imgs[0], hide: face.hideR || face.yaw > 0.16, sign: 1 }
    ];
    jobs.forEach(function (j) { j.light = lightAt(sctx, j.lobe.x, j.lobe.y, face.fw * 0.12); });
    var any = jobs.some(function (j) { return !j.hide; });
    if (!any) throw new Error('Both ears are hidden in this photo. Please use a photo that shows your ears.');
    return {
      draw: function (ctx) {
        jobs.forEach(function (j) {
          if (j.hide) return;
          var iw = j.img.naturalWidth, ih = j.img.naturalHeight, h = hpx, w = h * iw / ih;
          var yawS = 1 - 0.18 * Math.min(1, Math.abs(face.yaw) * 3);
          var br = Math.max(0.78, Math.min(1.08, 0.55 + j.light / 255 * 0.62));
          ctx.save(); ctx.translate(j.lobe.x, j.lobe.y); ctx.rotate(face.roll * 0.9);
          ctx.scale(yawS, 1);
          // soft contact shadow on the skin and a wider soft one
          var m = pxmm;
          ctx.shadowColor = 'rgba(30,12,6,.34)'; ctx.shadowBlur = 1.1 * m; ctx.shadowOffsetX = 0.5 * m; ctx.shadowOffsetY = 0.9 * m;
          ctx.filter = 'brightness(' + br.toFixed(3) + ') contrast(.98)';
          ctx.drawImage(j.img, -cfg.anchor.x * w, -cfg.anchor.y * h, w, h);
          ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 3.4 * m; ctx.shadowOffsetY = 1.8 * m;
          ctx.drawImage(j.img, -cfg.anchor.x * w, -cfg.anchor.y * h, w, h);
          ctx.restore();
        });
      }
    };
  }

  /* ---------- necklace (and the earrings of a set) ---------- */
  async function necklaceDrawer(cfg, photo, W, H, face) {
    var img = await loadImg(cfg.file), iw = img.naturalWidth, ih = img.naturalHeight, sctx = photo.getContext('2d');
    var neckPx = 0.76 * face.fw;                                  // width of the neck where a necklace sits
    var s = neckPx / ((cfg.x1 - cfg.x0) * iw), w = iw * s, h = ih * s, pxmm = face.fw / 142;
    var cx = (face.lobeL.x + face.lobeR.x) / 2 + Math.sin(face.roll) * 0 , top = face.chin.y + (cfg.drop || 0.25) * face.fw;
    var ncx = (face.chin.x + cx) / 2;
    var light = lightAt(sctx, ncx, top + h * 0.35, face.fw * 0.25);
    var br = Math.max(0.8, Math.min(1.08, 0.55 + light / 255 * 0.62));
    return function (ctx) {
      ctx.save();
      ctx.translate(ncx, top); ctx.rotate(face.roll * 0.45);
      var ox = -((cfg.x0 + cfg.x1) / 2) * w, oy = -cfg.ay * h;
      ctx.shadowColor = 'rgba(30,12,6,.38)'; ctx.shadowBlur = 1.6 * pxmm; ctx.shadowOffsetX = 0.4 * pxmm; ctx.shadowOffsetY = 1.3 * pxmm;
      ctx.filter = 'brightness(' + br.toFixed(3) + ') contrast(.98)';
      ctx.drawImage(img, ox, oy, w, h);
      ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 5 * pxmm; ctx.shadowOffsetY = 3 * pxmm;
      ctx.drawImage(img, ox, oy, w, h);
      ctx.restore();
    };
  }
  async function necklace(item, cfg, photo, W, H, blob) {
    var face = await findFace(photo, blob, W, H);
    if (!face) throw new Error('I could not find your face. Please use a photo showing your face and neck clearly.');
    var d = await necklaceDrawer(cfg.neck, photo, W, H, face);
    var e = null;
    if (cfg.ear) { try { e = await earrings(item, cfg.ear, photo, W, H, blob, face); } catch (err) { e = null; } }
    return { draw: function (ctx) { d(ctx); if (e) e.draw(ctx); } };
  }

  /* ---------- wrist (bracelets) ---------- */
  var handLib = null, handResolve = null;
  async function getHand() {
    if (handLib) return handLib;
    await window.njPrep('vendor/hands/', ['hands_solution_packed_assets.data', 'hand_landmark_full.tflite', 'hands.binarypb']);
    await loadScript('vendor/hands/hands.js');
    var h = new window.Hands({ locateFile: function (n) { return window.njLoc('vendor/hands/', n); } });
    h.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.25, minTrackingConfidence: 0.25 });
    h.onResults(function (r) { if (handResolve) { var g = handResolve; handResolve = null; g(r); } });
    await h.initialize(); handLib = h; return h;
  }
  async function wristMP(canvas, W, H) {
    var h = await getHand();
    var r = await new Promise(function (resolve, reject) {
      handResolve = resolve; h.send({ image: canvas }).catch(reject);
      setTimeout(function () { if (handResolve) { handResolve = null; reject(new Error('timeout')); } }, 60000);
    });
    var hs = (r && r.multiHandLandmarks) || []; if (!hs.length) return null;
    var best = null, bw = 0;
    hs.forEach(function (lm) { var w = Math.hypot((lm[5].x - lm[17].x) * W, (lm[5].y - lm[17].y) * H); if (w > bw) { bw = w; best = lm; } });
    var P = function (i) { return { x: best[i].x * W, y: best[i].y * H }; };
    var w0 = P(0), m9 = P(9), plen = Math.hypot(w0.x - m9.x, w0.y - m9.y);
    var fx = (w0.x - m9.x) / plen, fy = (w0.y - m9.y) / plen;
    var width = 0.8 * bw;                                         // wrist width is about 0.8 of the knuckle width
    return { c: { x: w0.x + fx * 0.24 * plen, y: w0.y + fy * 0.24 * plen }, fx: fx, fy: fy, width: width, pxmm: bw / 72, src: 'mp' };
  }
  var WRIST_PROMPT = 'This photo shows a hand and wrist. Find where a bracelet is worn. Reply with only one JSON object: ' +
    '{"found":true,"wrist":{"x":0.0,"y":0.0},"forearm":{"x":0.0,"y":0.0},"width":0.0}. ' +
    '"wrist" is the centre of the wrist just above the wrist bone, where a bracelet sits (in the middle of the arm, not at the edge). "forearm" is a point on the middle of the forearm one wrist-width further away from the hand. ' +
    '"width" is the width of the wrist at that place as a fraction of the image width. All x and y are fractions from 0 to 1 of the image width and height from the top-left. If no wrist is clearly visible reply {"found":false}.';
  async function wristClaude(blob, W, H) {
    var r = await claudeJSON(WRIST_PROMPT, blob);
    if (!r || r.found === false || !okPt(r.wrist) || !okPt(r.forearm) || !isNum(r.width) || r.width <= 0.02 || r.width > 0.7) return null;
    var dx = (r.forearm.x - r.wrist.x) * W, dy = (r.forearm.y - r.wrist.y) * H, l = Math.hypot(dx, dy); if (l < 5) return null;
    var width = r.width * W;
    return { c: { x: r.wrist.x * W, y: r.wrist.y * H }, fx: dx / l, fy: dy / l, width: width, pxmm: width / 56, src: 'claude' };
  }
  /* measure the real width of the wrist/forearm from the pixels: walk sideways from the centre until the skin ends */
  function measureArm(canvas, w, W, H) {
    var g; try { g = canvas.getContext('2d'); } catch (e) { return w; }
    var px = -w.fy, py = w.fx, R0 = w.width / 2, best = null;
    function line(cx, cy) {
      var N = Math.round(R0 * 2.4), arr = [];
      for (var t = -N; t <= N; t++) {
        var r = 0, gg = 0, b = 0, n = 0;
        for (var k = -4; k <= 4; k += 2) {
          var x = Math.round(cx + px * t + w.fx * k), y = Math.round(cy + py * t + w.fy * k);
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          var d = g.getImageData(x, y, 1, 1).data; r += d[0]; gg += d[1]; b += d[2]; n++;
        }
        arr.push(n ? [r / n, gg / n, b / n] : null);
      }
      var m = [0, 0, 0], c = 0;
      for (var i = N - Math.round(R0 * 0.25); i <= N + Math.round(R0 * 0.25); i++) if (arr[i]) { m[0] += arr[i][0]; m[1] += arr[i][1]; m[2] += arr[i][2]; c++; }
      if (!c) return null; m = [m[0] / c, m[1] / c, m[2] / c];
      function edge(dir) {
        var run = 0, lastOk = 0;
        for (var j = 1; j <= N; j++) {
          var p = arr[N + dir * j]; if (!p) break;
          var diff = Math.abs(p[0] - m[0]) + Math.abs(p[1] - m[1]) + Math.abs(p[2] - m[2]);
          if (diff > 70) { run++; if (run >= 5) return j - 5; } else { run = 0; lastOk = j; }
        }
        return lastOk;
      }
      return { l: edge(-1), r: edge(1) };
    }
    // measure where the skin is plain (a little towards the hand and further along the forearm), because a bangle or thread at the wrist itself would fool the edge search
    var got = [];
    [-0.55, 0.8, 1.1, 1.4].forEach(function (o) {
      var e = line(w.c.x + w.fx * o * R0 * 2 * 0.5, w.c.y + w.fy * o * R0 * 2 * 0.5);
      if (e && e.l + e.r > R0 * 1.3 && e.l + e.r < R0 * 3.6) got.push(e);
    });
    if (!got.length) return w;
    var ws = got.map(function (e) { return e.l + e.r; }).sort(function (x, y) { return x - y; }), med = ws[Math.floor(ws.length / 2)];
    var sh = got.map(function (e) { return (e.r - e.l) / 2; }).sort(function (x, y) { return x - y; })[Math.floor(got.length / 2)];
    var width = med * 0.95, shift = Math.max(-R0 * 0.4, Math.min(R0 * 0.4, sh));
    return { c: { x: w.c.x + px * shift, y: w.c.y + py * shift }, fx: w.fx, fy: w.fy, width: width, pxmm: width / 58, src: w.src + '+px' };
  }
  async function findWrist(canvas, blob, W, H) {
    var w = null;
    try { w = await wristMP(canvas, W, H); } catch (e) { w = null; }
    if (!w) { try { w = await wristClaude(blob, W, H); } catch (e) { w = null; } }
    if (w) { try { w = measureArm(canvas, w, W, H); } catch (e) { /* keep the estimate */ } }
    return w;
  }
  async function bracelet(item, cfg, photo, W, H, blob) {
    var wr = await findWrist(photo, blob, W, H);
    if (!wr) throw new Error('I could not find your wrist. Please use a clear photo of your hand and wrist, with the back of the hand towards the camera.');
    var img = await loadImg(cfg.file), iw = img.naturalWidth, ih = img.naturalHeight;
    var sctx = photo.getContext('2d'), R = wr.width / 2, pxmm = wr.pxmm;
    var spm = iw / cfg.mmLen;                                      // strip pixels per mm
    var thick = ih / spm * pxmm;                                   // thickness of the strip on screen
    var light = lightAt(sctx, wr.c.x, wr.c.y, R * 0.8), br = Math.max(0.8, Math.min(1.08, 0.55 + light / 255 * 0.62));
    var ang = Math.atan2(wr.fy, wr.fx);                            // local y axis points along the forearm
    var Rmm = R / pxmm, cols = Math.max(24, Math.round(2 * R)), sag = R * 0.16;
    function paint(ctx, dark) {
      ctx.save(); ctx.translate(wr.c.x, wr.c.y); ctx.rotate(ang - Math.PI / 2);
      var maxT = Math.PI / 2 * 0.985;
      for (var i = 0; i < cols; i++) {
        var x0 = -R + (2 * R) * i / cols, x1 = -R + (2 * R) * (i + 1) / cols, xm = (x0 + x1) / 2;
        var t0 = Math.asin(Math.max(-1, Math.min(1, x0 / R))), t1 = Math.asin(Math.max(-1, Math.min(1, x1 / R))), tm = Math.asin(Math.max(-1, Math.min(1, xm / R)));
        if (Math.abs(tm) > maxT) continue;
        var u0 = iw / 2 + t0 * Rmm * spm, u1 = iw / 2 + t1 * Rmm * spm;
        if (u0 < 0 || u1 > iw) continue;
        var cs = Math.cos(tm), dy = sag * (1 - cs);
        ctx.globalAlpha = dark ? 1 : Math.min(1, 0.35 + cs * 0.9);
        ctx.drawImage(img, Math.min(u0, u1), 0, Math.max(0.5, Math.abs(u1 - u0)), ih, x0, dy - thick / 2, (x1 - x0) + 0.7, thick);
      }
      ctx.restore();
    }
    return {
      draw: function (ctx) {
        // soft shadow on the skin below the chain
        var oc = document.createElement('canvas'); oc.width = ctx.canvas.width; oc.height = ctx.canvas.height; var o = oc.getContext('2d');
        paint(o, false);
        ctx.save(); ctx.shadowColor = 'rgba(30,12,6,.4)'; ctx.shadowBlur = 1.5 * pxmm; ctx.shadowOffsetX = 0.5 * pxmm; ctx.shadowOffsetY = 1.2 * pxmm;
        ctx.filter = 'brightness(' + br.toFixed(3) + ') contrast(.98)'; ctx.drawImage(oc, 0, 0);
        ctx.restore();
      }
    };
  }

  /* ---------- chains: the chain texture from the photo is laid along a curve round the neck ---------- */
  async function chain(item, cfg, photo, W, H, blob) {
    var face = await findFace(photo, blob, W, H);
    if (!face) throw new Error('I could not find your face. Please use a photo showing your face and neck clearly.');
    var img = await loadImg(cfg.file), tw = img.naturalWidth, th = img.naturalHeight, sctx = photo.getContext('2d');
    var pxmm = face.fw / 142, cx = (face.chin.x + (face.lobeL.x + face.lobeR.x) / 2) / 2;
    var a = 0.33 * face.fw, yTop = face.chin.y + 0.3 * face.fw, front = cfg.lenMm * pxmm * 0.4;
    function arc(sag, n) { var L = 0, px = -a, py = 0; for (var i = 1; i <= n; i++) { var x = -a + 2 * a * i / n, y = sag * (1 - (x / a) * (x / a)); L += Math.hypot(x - px, y - py); px = x; py = y; } return L; }
    var lo = 0, hi = 3 * face.fw; for (var k = 0; k < 40; k++) { var mid = (lo + hi) / 2; if (arc(mid, 80) < front) lo = mid; else hi = mid; }
    var sag = Math.min(lo, 1.0 * face.fw);
    var wd = cfg.mm * pxmm, scale = wd / cfg.sw, light = lightAt(sctx, cx, yTop + sag * 0.5, face.fw * 0.25), br = Math.max(0.82, Math.min(1.08, 0.55 + light / 255 * 0.62));
    function paint(o) {
      var N = 400, pts = [];
      for (var i = 0; i <= N; i++) { var x = -a + 2 * a * i / N; pts.push({ x: x, y: sag * (1 - (x / a) * (x / a)) }); }
      o.save(); o.translate(cx, yTop); o.rotate(face.roll * 0.45);
      var s0 = 0, v = 0;
      for (var j = 1; j <= N; j++) {
        var p0 = pts[j - 1], p1 = pts[j], dx = p1.x - p0.x, dy = p1.y - p0.y, ds = Math.hypot(dx, dy), t = Math.atan2(dy, dx), f = j / N;
        var edge = Math.min(1, f / 0.07, (1 - f) / 0.07);
        var hs = ds / scale;
        o.save(); o.translate(p0.x, p0.y); o.rotate(t - Math.PI / 2); o.globalAlpha = Math.max(0, edge);
        var vv = v % th, h1 = Math.min(hs, th - vv);
        o.drawImage(img, 0, vv, tw, h1, -wd * tw / cfg.sw / 2, 0, wd * tw / cfg.sw, h1 * scale + 0.9);
        if (h1 < hs) o.drawImage(img, 0, 0, tw, hs - h1, -wd * tw / cfg.sw / 2, h1 * scale, wd * tw / cfg.sw, (hs - h1) * scale + 0.9);
        o.restore(); v += hs;
      }
      o.restore();
    }
    return {
      draw: function (ctx) {
        var oc = document.createElement('canvas'); oc.width = ctx.canvas.width; oc.height = ctx.canvas.height; paint(oc.getContext('2d'));
        ctx.save(); ctx.shadowColor = 'rgba(30,12,6,.4)'; ctx.shadowBlur = 1.4 * pxmm; ctx.shadowOffsetX = 0.4 * pxmm; ctx.shadowOffsetY = 1.1 * pxmm;
        ctx.filter = 'brightness(' + br.toFixed(3) + ') contrast(1.02)'; ctx.drawImage(oc, 0, 0); ctx.restore();
      }
    };
  }

  var KINDS = { earring: earrings, set: necklace, necklace: necklace, bracelet: bracelet, chain: chain };
  window.NJTry = {
    has: function (id) { return !!D[id]; },
    kind: function (id) { return D[id] && D[id].kind; },
    run: function (id, photo, W, H, blob) { var c = D[id]; if (!c || !KINDS[c.kind]) return Promise.reject(new Error('no try-on')); return KINDS[c.kind](id, c, photo, W, H, blob); }
  };
})();
