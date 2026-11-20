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
  var cv = $('#cv'), ctx = cv.getContext('2d'), statusEl = $('#status');
  var sel = P[0], finger = 'ring', photo = null, W = 800, H = 600, hand = null, ppm = 0;
  var ring = { x: 0, y: 0, heading: 0 }, sizeMult = 1, rotOff = 0, placed = false;
  var cuts = {};
  P.forEach(function (p) { var i = new Image(); i.onload = draw; i.src = p.cut; cuts[p.id] = i; });
  var MCP = { index: 5, middle: 9, ring: 13, pinky: 17 };

  function setStatus(t, err) { statusEl.textContent = t; statusEl.classList.toggle('err', !!err); }

  $('#picks').innerHTML = P.map(function (p) {
    return '<button class="pick" type="button" data-id="' + p.id + '" aria-pressed="false"><img src="' + esc(p.cut) + '" alt="">' + esc(p.name) + '</button>';
  }).join('');
  function choose(id) {
    sel = byId[id];
    document.querySelectorAll('.pick').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === id)); });
    if (photo) setStatus(sel.name + ' selected.'); else setStatus(sel.name + ' selected. Now add a photo of your hand.');
    draw();
  }
  $('#picks').addEventListener('click', function (e) { var b = e.target.closest('.pick'); if (b) choose(b.dataset.id); });
  choose(P[0].id);

  $('#fingers').addEventListener('click', function (e) {
    var b = e.target.closest('[data-f]'); if (!b) return;
    finger = b.dataset.f;
    document.querySelectorAll('#fingers button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    if (hand) { placeOnFinger(); draw(); }
  });
  $('#size').oninput = function (e) { sizeMult = +e.target.value / 100; $('#sizeO').textContent = e.target.value + '%'; draw(); };
  $('#rot').oninput = function (e) { rotOff = +e.target.value; $('#rotO').textContent = e.target.value + '°'; draw(); };

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
    var wpx = sel.widthMm * (ppm || W * 0.0045) * sizeMult, s = wpx / sel.cw;
    ctx.save();
    ctx.translate(ring.x, ring.y);
    ctx.rotate((ring.heading + rotOff) * Math.PI / 180);
    ctx.scale(s, s);
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6 / s; ctx.shadowOffsetY = 2 / s;
    ctx.drawImage(img, -sel.cw / 2, -sel.ch / 2);
    ctx.restore();
  }

  /* hand detection: MediaPipe Hands, files are bundled in vendor/hands */
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
  function placeOnFinger() {
    var lm = hand.lm, i = MCP[finger], a = lm[i], b = lm[i + 1];
    var ax = a.x * W, ay = a.y * H, bx = b.x * W, by = b.y * H;
    ring.x = ax + 0.45 * (bx - ax); ring.y = ay + 0.45 * (by - ay);
    ring.heading = Math.atan2(bx - ax, -(by - ay)) * 180 / Math.PI;
    ppm = hand.palm / 68;   // index knuckle to little-finger knuckle is about 68 mm
    placed = true;
  }

  $('#upload').onclick = function () { $('#file').click(); };
  $('#file').onchange = async function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      var bmp = await (window.createImageBitmap ? createImageBitmap(f, { imageOrientation: 'from-image' }) : Promise.reject());
      var sc = Math.min(1, 1100 / Math.max(bmp.width, bmp.height));
      W = Math.round(bmp.width * sc); H = Math.round(bmp.height * sc);
      var off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').drawImage(bmp, 0, 0, W, H);
      photo = off; cv.width = W; cv.height = H;
    } catch (err) { setStatus('That file could not be read as an image.', true); return; }
    e.target.value = '';
    hand = null; placed = false; ring.x = W / 2; ring.y = H / 2; ring.heading = 0; ppm = 0;
    $('#save').disabled = false; draw();
    setStatus('Finding your hand…');
    try {
      hand = await detect();
      if (hand) { placeOnFinger(); setStatus('Ring placed on your ' + (finger === 'pinky' ? 'little' : finger) + ' finger. Drag it, or change the size and turn, to fit.'); }
      else { placed = true; setStatus('No hand found in this photo. Tap on the photo to place the ring, then adjust the size.', true); }
    } catch (err) {
      placed = true; setStatus('Hand detection did not start here. Tap on the photo to place the ring, then adjust the size.', true);
    }
    draw();
  };

  var dragging = false;
  function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
  cv.addEventListener('pointerdown', function (e) { if (!photo) return; dragging = true; cv.setPointerCapture(e.pointerId); var p = pt(e); ring.x = p.x; ring.y = p.y; placed = true; draw(); });
  cv.addEventListener('pointermove', function (e) { if (!dragging) return; var p = pt(e); ring.x = p.x; ring.y = p.y; draw(); });
  cv.addEventListener('pointerup', function () { dragging = false; });
  cv.addEventListener('pointercancel', function () { dragging = false; });

  $('#save').onclick = async function () {
    var blob = await new Promise(function (r) { cv.toBlob(r, 'image/png'); });
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
    ['How does the try-on work?', 'Choose a ring, add a clear photo of the back of your hand and the ring is placed on your finger. You can drag it, and change its size, to fit.'],
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
  var RULES = 'You are the assistant of Nakshatra Jewellers, a small jewellery shop. Answer briefly in plain text, under 70 words. ' +
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
