(function () {
  'use strict';
  var P = window.PRODUCTS || [];
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var byId = {}; P.forEach(function (p) { byId[p.id] = p; });

  /* ---------- shop page ---------- */
  $('#grid').innerHTML = P.map(function (p) {
    return '<article class="card"><img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" loading="lazy">' +
      '<h3>' + esc(p.name) + '</h3><p class="meta">' + esc(p.material) + ' · ' + esc(p.stone) + '</p>' +
      '<p>' + esc(p.desc) + '</p>' +
      '<div class="row"><button class="btn" type="button" data-try="' + p.id + '">Try on</button>' +
      '<button class="btn line" type="button" data-ask="' + p.id + '">Ask price</button></div></article>';
  }).join('');
  $('#grid').addEventListener('click', function (e) {
    var t = e.target.closest('[data-try]'), a = e.target.closest('[data-ask]');
    if (t) { choose(t.dataset.try); $('#tryon').scrollIntoView(); }
    if (a) { openChat(); ask('What is the price of the ' + byId[a.dataset.ask].name + '?'); }
  });

  /* ---------- try-on ---------- */
  var CFG = window.NAKSHATRA_TRYON || {};
  var SPACE = CFG.space || '', API = String(CFG.api || '').trim().replace(/\/+$/, '');
  var GRADIO = 'https://cdn.jsdelivr.net/npm/@gradio/client@1.19.1/+esm';
  var cv = $('#cv'), ctx = cv.getContext('2d'), statusEl = $('#status');
  var sel = P[0], photo = null, photoBlob = null, W = 800, H = 600;
  var hand = null, ppm = 0, ring = { x: 0, y: 0, heading: 0 }, placed = false, manual = false;
  var generating = false, openUrl = null;
  var cuts = {};
  P.forEach(function (p) { var i = new Image(); i.onload = draw; i.src = p.cut; cuts[p.id] = i; });
  var RING_FINGER = 13, FINGER_MM = 16;   // MediaPipe landmark of the ring finger knuckle; typical ring finger width in mm

  function setStatus(t, err) { statusEl.textContent = t; statusEl.classList.toggle('err', !!err); }
  function setBusy(on, text) { $('#busy').hidden = !on; if (text) $('#busyTxt').textContent = text; }

  $('#picks').innerHTML = P.map(function (p) {
    return '<button class="pick" type="button" data-id="' + p.id + '" aria-pressed="false"><img src="' + esc(p.cut) + '" alt="">' + esc(p.name) + '</button>';
  }).join('');
  function choose(id) {
    sel = byId[id];
    document.querySelectorAll('.pick').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === id)); });
    if (photo) {                       // a new ring: show the photo again until the customer presses Generate
      placed = false; manual = false; openUrl = null; $('#generate').textContent = 'Generate try-on'; draw();
      setStatus(sel.name + ' selected. Press Generate try-on.');
    }
  }
  $('#picks').addEventListener('click', function (e) { var b = e.target.closest('.pick'); if (b) choose(b.dataset.id); });
  choose(P[0].id);

  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!photo) {
      ctx.fillStyle = '#f7f5f0'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#666'; ctx.font = '22px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Your photo will appear here', cv.width / 2, cv.height / 2);
      return;
    }
    ctx.drawImage(photo, 0, 0, W, H);
    var img = cuts[sel.id];
    if (!placed || !img || !img.complete) return;
    var mm = ppm || W * 0.0095, s = sel.widthMm * mm / sel.cw;
    ctx.save();
    ctx.translate(ring.x, ring.y);
    ctx.rotate(ring.heading * Math.PI / 180);
    drawBand(mm);
    ctx.scale(s, s);
    ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 3.5 * mm / s; ctx.shadowOffsetY = 1.2 * mm / s;
    ctx.drawImage(img, -sel.cw / 2, -sel.ch / 2);
    ctx.restore();
  }

  /* The silver band that goes round the finger. It sits under the stone, is darker where it turns away
     at the sides of the finger, and throws a soft shadow on the skin, so the ring looks worn. */
  function drawBand(mm) {
    var fw = FINGER_MM * mm * 1.1, t = Math.max(2, 1.7 * mm), cx = fw / 2;
    var g = ctx.createLinearGradient(-cx, 0, cx, 0);
    g.addColorStop(0, 'rgba(110,114,122,0)'); g.addColorStop(0.07, 'rgba(110,114,122,.95)'); g.addColorStop(0.22, '#bfc3ca');
    g.addColorStop(0.5, '#fbfbfc'); g.addColorStop(0.78, '#bfc3ca'); g.addColorStop(0.93, 'rgba(110,114,122,.95)'); g.addColorStop(1, 'rgba(110,114,122,0)');
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-cx, 0); ctx.quadraticCurveTo(0, fw * 0.07, cx, 0);
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = t * 1.6; ctx.shadowOffsetY = t * 0.6;
    ctx.strokeStyle = 'rgba(80,82,90,.85)'; ctx.lineWidth = t + 1; ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.beginPath(); ctx.moveTo(-cx, 0); ctx.quadraticCurveTo(0, fw * 0.07, cx, 0);
    ctx.strokeStyle = g; ctx.lineWidth = t; ctx.stroke();
    ctx.restore();
  }

  /* ---- quick preview on the device: MediaPipe Hands finds the finger (files bundled in vendor/hands) ---- */
  var handsLib = null, resolveRun = null;
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); });
  }
  async function getHands() {
    if (handsLib) return handsLib;
    await loadScript('vendor/hands/hands.js');
    var h = new window.Hands({ locateFile: function (f) { return 'vendor/hands/' + f; } });
    h.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.25, minTrackingConfidence: 0.25 });
    h.onResults(function (r) { if (resolveRun) { var f = resolveRun; resolveRun = null; f(r); } });
    await h.initialize();
    handsLib = h; return h;
  }
  async function detect() {
    var h = await getHands();
    var c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(photo, 0, 0, W, H);
    var res = await new Promise(function (resolve, reject) {
      resolveRun = resolve;
      h.send({ image: c }).catch(reject);
      setTimeout(function () { if (resolveRun) { resolveRun = null; reject(new Error('timeout')); } }, 60000);
    });
    var hs = (res && res.multiHandLandmarks) || [];
    if (!hs.length) return null;
    var best = null, bestW = 0;
    hs.forEach(function (lm) { var w = Math.hypot((lm[5].x - lm[17].x) * W, (lm[5].y - lm[17].y) * H); if (w > bestW) { bestW = w; best = lm; } });
    return { lm: best, palm: bestW };
  }
  /* Inside the Claude preview page the hand files cannot be loaded, so Claude finds the finger from the photo instead. */
  var FIND_PROMPT = 'This photo shows a hand. Find the ring finger (the finger next to the little finger) of the hand that is closest to the camera, so a ring can be placed on it. Reply with only one JSON object: ' +
    '{"found":true,"base":{"x":0.0,"y":0.0},"tip":{"x":0.0,"y":0.0},"width":0.0}. ' +
    'base is the centre of the finger\'s lower segment, between the knuckle where it joins the hand and the first joint, which is where a ring sits. tip is the very end of that finger. ' +
    'width is the thickness of the finger at base as a fraction of the image width. All x and y values are fractions from 0 to 1 of the image width and height from the top-left corner. ' +
    'If the ring finger is not clearly visible reply {"found":false}.';
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  async function claudeFinger() {
    var c = window.claude; if (!c || !c.use || !photoBlob) return null;
    var ai = await c.use('sample'); if (!ai) return null;
    var lim = await ai.limits(); if (!lim || !lim.images) return null;
    var r = await ai.json(FIND_PROMPT, { images: photoBlob });
    if (!r || r.found === false || !r.base || !r.tip || !isNum(r.base.x) || !isNum(r.base.y) || !isNum(r.tip.x) || !isNum(r.tip.y) || !isNum(r.width) || r.width < 0.01 || r.width > 0.6) return null;
    return r;
  }
  async function localPreview() {
    placed = false; manual = false; hand = null;
    try { hand = await detect(); } catch (err) { hand = null; }
    if (hand) {
      var a = hand.lm[RING_FINGER], b = hand.lm[RING_FINGER + 1];
      var ax = a.x * W, ay = a.y * H, bx = b.x * W, by = b.y * H;
      ring.x = ax + 0.42 * (bx - ax); ring.y = ay + 0.42 * (by - ay);
      ring.heading = Math.atan2(bx - ax, -(by - ay)) * 180 / Math.PI;
      ppm = hand.palm / 74;   // index knuckle to little-finger knuckle is about 68 mm
      placed = true;
    } else {
      var cl = null;
      try { cl = await claudeFinger(); } catch (err) { cl = null; }
      if (cl) {
        ring.x = cl.base.x * W; ring.y = cl.base.y * H;
        ring.heading = Math.atan2((cl.tip.x - cl.base.x) * W, -((cl.tip.y - cl.base.y) * H)) * 180 / Math.PI;
        ppm = cl.width * W / FINGER_MM;     // finger width in pixels / 16 mm
        placed = true; hand = { viaClaude: true };
      } else { ring.x = W / 2; ring.y = H / 2; ring.heading = 0; ppm = 0; placed = true; manual = true; }
    }
    draw();
    return !!hand;
  }

  /* ---- AI try-on: the Hugging Face Space (Gradio) or the FastAPI backend ---- */
  function toBlob(c, type, q) { return new Promise(function (r) { c.toBlob(r, type, q); }); }
  // the selected ring on a plain white square, big enough for the AI model to see its detail
  async function jewelleryBlob() {
    var img = cuts[sel.id], c = document.createElement('canvas'); c.width = c.height = 1024;
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 1024);
    var k = Math.min(820 / img.naturalWidth, 820 / img.naturalHeight);
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, (1024 - img.naturalWidth * k) / 2, (1024 - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
    return toBlob(c, 'image/jpeg', 0.93);
  }
  async function fetchResult(url) {
    try { var r = await fetch(url); if (!r.ok) throw new Error('http ' + r.status); return { blob: await r.blob() }; }
    catch (err) { return { url: url }; }       // the image host may not allow reading; we can still show it
  }
  async function aiGenerate() {
    var jb = await jewelleryBlob();
    var customer = new File([photoBlob], 'customer-photo.jpg', { type: 'image/jpeg' });
    var jewel = new File([jb], sel.id + '.jpg', { type: 'image/jpeg' });
    if (API) {
      var form = new FormData(); form.append('customer_photo', customer); form.append('jewellery_photo', jewel); form.append('category', 'ring');
      var r = await fetch(API + '/api/felo/try-on', { method: 'POST', body: form });
      if (!r.ok) { var m = 'AI service error'; try { m = (await r.json()).detail || m; } catch (e) {} throw new Error(m); }
      return { blob: await r.blob() };
    }
    if (!SPACE) throw new Error('AI try-on is not connected');
    var mod = await import(GRADIO);
    var client = await mod.Client.connect(SPACE);
    var res = await client.predict('/try_on', [customer, jewel, 'ring']);
    var out = res && res.data && res.data[0], url = typeof out === 'string' ? out : (out && (out.url || out.path));
    if (!url) throw new Error('AI service returned no image');
    return fetchResult(url);
  }
  function showImage(src) {
    return new Promise(function (res, rej) {
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () {
        var src_ = this;
        var sc = Math.min(1, 1100 / Math.max(src_.naturalWidth, src_.naturalHeight));
        W = Math.round(src_.naturalWidth * sc); H = Math.round(src_.naturalHeight * sc);
        var c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(src_, 0, 0, W, H);
        photo = c; placed = false; cv.width = W; cv.height = H; draw(); res();
      };
      im.onerror = function () {
        if (im.crossOrigin) { var retry = new Image(); retry.onload = function () { im.onload.call(retry); }; retry.onerror = function () { rej(new Error('image')); }; retry.src = src; }   // host without CORS: still show it
        else rej(new Error('image'));
      };
      im.src = src;
    });
  }
  var originalPhoto = null;
  async function generate() {
    if (!photo || generating) return;
    generating = true; $('#generate').disabled = true; $('#save').disabled = true; openUrl = null;
    if (originalPhoto) { photo = originalPhoto; W = photo.width; H = photo.height; cv.width = W; cv.height = H; }
    var inClaude = !!(window.claude && window.claude.use);          // the Claude preview page cannot reach the AI service
    var useAI = !inClaude && !!(API || SPACE) && CFG.useAI === true, done = false;   // AI image model only when config.js turns it on; the default keeps your photo exactly as it is
    try {
      if (useAI) {
        setBusy(true, 'Creating your try-on with AI. This can take up to a minute. Please keep this page open.');
        setStatus('Generating…');
        var timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 270000); });
        var out = await Promise.race([aiGenerate(), timeout]);
        if (out.blob) { var u = URL.createObjectURL(out.blob); await showImage(u); }
        else { openUrl = out.url; await showImage(out.url).catch(function () { photo = originalPhoto; }); }
        setStatus('Your AI try-on is ready. Please check the ring details against the real ring.');
        done = true;
      }
    } catch (err) {
      if (window.console) console.warn('AI try-on failed:', err);
    }
    if (!done) {
      setBusy(true, 'Placing the ring on your finger…');
      var wait = new Promise(function (r) { setTimeout(r, 1500); });
      photo = originalPhoto; W = photo.width; H = photo.height; cv.width = W; cv.height = H;
      var found = await localPreview(); await wait;
      setStatus(!useAI && found ? 'Your ring is placed on your finger. Your photo and background are unchanged.' : (useAI ? 'The AI service is busy or not reachable right now, so this is a quick preview made on your device. Try again later for the AI version. ' : (inClaude ? 'Quick preview. The full AI try-on runs on the live website. ' : 'This is a quick preview made on your device. ')) +
        (found ? '' : 'No hand was found, so tap the photo where the ring should go.'), !found);
    }
    setBusy(false); generating = false; $('#generate').disabled = false; $('#generate').textContent = 'Generate again'; $('#save').disabled = false;
  }
  $('#generate').onclick = generate;

  $('#file').onchange = async function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      var bmp = await new Promise(function (res, rej) { var u = URL.createObjectURL(f), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); res(im); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('image')); }; im.src = u; });
      var sc = Math.min(1, 1100 / Math.max(bmp.naturalWidth, bmp.naturalHeight));
      W = Math.round(bmp.naturalWidth * sc); H = Math.round(bmp.naturalHeight * sc);
      var off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').drawImage(bmp, 0, 0, W, H);
      photo = originalPhoto = off; cv.width = W; cv.height = H;
      photoBlob = await toBlob(off, 'image/jpeg', 0.9);
    } catch (err) { setStatus('That file could not be opened as a picture. Please use a JPG or PNG photo.', true); return; }
    e.target.value = '';
    placed = false; manual = false; hand = null; ppm = 0; openUrl = null;
    $('#stepRing').hidden = false; $('#stepGo').hidden = false; $('#save').disabled = true; $('#generate').textContent = 'Generate try-on';
    draw();
    setStatus('Now choose a ring, then press Generate try-on.');
    $('#stepRing').scrollIntoView({ block: 'nearest' });
  };

  /* tap to place the ring: only when no hand could be found */
  var dragging = false;
  function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
  cv.addEventListener('pointerdown', function (e) { if (!photo || !manual) return; dragging = true; cv.setPointerCapture(e.pointerId); var p = pt(e); ring.x = p.x; ring.y = p.y; draw(); });
  cv.addEventListener('pointermove', function (e) { if (!dragging) return; var p = pt(e); ring.x = p.x; ring.y = p.y; draw(); });
  cv.addEventListener('pointerup', function () { dragging = false; });
  cv.addEventListener('pointercancel', function () { dragging = false; });

  $('#save').onclick = async function () {
    if (openUrl) { window.open(openUrl, '_blank'); return; }
    var blob = await toBlob(cv, 'image/png');
    if (!blob) { setStatus('Could not create the image.', true); return; }
    try {
      var d = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (d) { await d.save({ filename: 'nakshatra-try-on.png', data: blob }); return; }
    } catch (err) { if (err && err.code === 'declined') return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nakshatra-try-on.png'; a.click();
  };
  draw();

  /* ---------- chat ---------- */
  var FAQ = [
    ['What are the rings made of?', 'These three rings are silver with coloured stones and a halo of small white stones.'],
    ['How does the try-on work?', 'Add a clear photo of the back of your hand, choose a ring and press Generate try-on. After a short wait, AI shows the ring on your finger.'],
    ['What is the price?', 'The price depends on the ring and on the day. Please contact the shop and we will confirm the price for the ring you like.'],
    ['How do I buy?', 'Tell the shop which ring you like. This website does not take payments.']
  ];
  var msgs = $('#msgs'), sampleFn = null, turns = [], busy = false;
  function bubble(cls, t) { var d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = t; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  $('#faq').innerHTML = FAQ.map(function (q, i) { return '<button type="button" data-q="' + i + '">' + esc(q[0]) + '</button>'; }).join('');
  $('#faq').addEventListener('click', function (e) { var b = e.target.closest('[data-q]'); if (!b) return; var q = FAQ[+b.dataset.q]; bubble('me', q[0]); bubble('bot', q[1]); });
  function openChat() { $('#chat').hidden = false; $('#chatBtn').hidden = true; $('#chatBtn').setAttribute('aria-expanded', 'true'); if (!msgs.children.length) bubble('bot', 'Hello! Ask me about our rings or the try-on.'); }
  function closeChat() { $('#chat').hidden = true; $('#chatBtn').hidden = false; $('#chatBtn').setAttribute('aria-expanded', 'false'); }
  $('#chatBtn').onclick = openChat; $('#chatClose').onclick = closeChat;
  var RULES = 'You are the assistant of Nakshatra Jewellers, a small jewellery shop. Answer briefly in plain text, under 70 words, in the language the customer writes in (English, Hindi or Hinglish). ' +
    'The shop currently shows only these rings (all silver): ' + P.map(function (p) { return p.name + ' (' + p.stone + ')'; }).join('; ') + '. ' +
    'The website has a virtual try-on for rings using a photo of the back of the hand. Never invent prices, offers, stock, addresses, hours or phone numbers. ' +
    'For price, say the shop confirms the price for the day. For anything you do not know, say the shop will confirm.';
  async function ask(text) {
    bubble('me', text);
    if (!sampleFn) { bubble('bot', 'Please use the questions above, or contact the shop directly for this.'); return; }
    if (busy) return; busy = true;
    turns.push({ role: 'user', content: text });
    var view = turns.slice(-12); while (view.length && view[0].role !== 'user') view.shift();
    var b = bubble('bot', '…');
    try {
      var r = await sampleFn([{ role: 'user', content: RULES }].concat(view), { cache: false, modelTier: 'quick', onText: function (u) { b.textContent = u.text; msgs.scrollTop = msgs.scrollHeight; } });
      b.textContent = r.text; turns.push({ role: 'assistant', content: r.text });
    } catch (e) { b.textContent = 'Sorry, I could not answer that. Please try again or contact the shop.'; turns.pop(); }
    busy = false;
  }
  $('#chatForm').onsubmit = function (e) { e.preventDefault(); var v = $('#chatIn').value.trim(); if (v) { $('#chatIn').value = ''; ask(v); } };
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#chat').hidden) closeChat(); });
  (async function () {
    try { if (window.claude && window.claude.use) { sampleFn = await window.claude.use('sample'); if (sampleFn) $('#chatForm').hidden = false; } } catch (e) { sampleFn = null; }
  })();
})();
