(function () {
  'use strict';
  var P = window.PRODUCTS || [];
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var byId = {}; P.forEach(function (p) { byId[p.id] = p; });

  /* ---------- shop page ---------- */
  var ST = window.NAKSHATRA_STORE || {};
  var CATORDER = ['Sets', 'Rings', 'Earrings', 'Bracelets', 'Kadas', 'Chains', 'Necklaces'];
  var ALL = (window.CATALOG || []).map(function (x) {
    return { id: x.id, tier: x.tier, cat: x.cat, code: x.code, img: x.img, name: x.tier === 'ultra' ? 'Signature ' + x.code : x.code };
  });
  ALL.forEach(function (x, i) { x.ord = i; });
  ALL.forEach(function (x) { if (byId[x.id] || (window.TRYON && window.TRYON[x.id])) x.tryon = x.id; });
  var catItem = {}; ALL.forEach(function (x) { catItem[x.id] = x; });
  var PICKCATS = ['Rings', 'Earrings', 'Bracelets', 'Kadas', 'Chains', 'Necklaces', 'Sets'];
  var TRYITEMS = ALL.filter(function (x) { return x.tryon; }).sort(function (p, q) { return PICKCATS.indexOf(p.cat) - PICKCATS.indexOf(q.cat) || p.ord - q.ord; });
  var rank = function (x) { return (x.tier === 'ultra' ? 0 : x.tryon ? 1 : 2); };
  var SHOP = ALL.slice().sort(function (a, b) { return rank(a) - rank(b) || CATORDER.indexOf(a.cat) - CATORDER.indexOf(b.cat) || a.ord - b.ord; });
  function waLink(x) { return 'https://wa.me/' + (ST.whatsapp || '') + '?text=' + encodeURIComponent('Hello Nakshatra Jewellers, I want to order: ' + x.name + ' (' + x.cat + '). Please share the price and availability.'); }
  function cardHtml(x) {
    var tryb = x.tryon ? '<button class="tryb" type="button" data-try="' + x.tryon + '">✦ Try-On</button>' : '';
    var sig = x.tier === 'ultra' ? '<span class="sigb">✦ Signature</span>' : '';
    return '<article class="card' + (x.tier === 'ultra' ? ' sig' : '') + '"><div class="ph"><button type="button" class="phb" data-open="' + x.id + '" aria-label="View ' + esc(x.name) + '"><img src="' + esc(x.img) + '" alt="' + esc(x.name) + '" loading="lazy"></button>' + sig + tryb + '</div>' +
      '<div class="body"><h3>' + esc(x.name) + '</h3><p class="meta">' + esc(x.cat === 'Sets' ? 'Necklace set' : x.cat) + '</p>' +
      '<div class="row"><a class="ord" href="' + esc(waLink(x)) + '" target="_blank" rel="noopener">Order</a><button class="ask" type="button" data-open="' + x.id + '">View</button></div></div></article>';
  }
  function chipsHtml(list, cur, key) { return list.map(function (c) { return '<button type="button" data-' + key + '="' + esc(c) + '" aria-pressed="' + (c === cur) + '">' + esc(c === 'Sets' ? 'Sets' : c) + '</button>'; }).join(''); }
  var CHIPS = ['All', 'Sets', 'Rings', 'Earrings', 'Bracelets', 'Kadas', 'Chains', 'Necklaces', '✦ Try-on'];
  function itemsFor(cat) { return SHOP.filter(function (x) { return cat === 'All' || (cat === '✦ Try-on' ? !!x.tryon : x.cat === cat); }); }

  var cCat = 'All', ROWMAX = 12;
  function renderRow() {
    var list = itemsFor(cCat);
    $('#cFilters').innerHTML = chipsHtml(CHIPS, cCat, 'rowcat');
    $('#cTrack').innerHTML = list.slice(0, ROWMAX).map(cardHtml).join('') + '<button type="button" class="card seeall" data-col="1"><span>See all</span><b>' + list.length + '</b><small>pieces →</small></button>';
    $('#cTrack').scrollLeft = 0;
  }
  renderRow();
  $('#cFilters').addEventListener('click', function (e) { var b = e.target.closest('[data-rowcat]'); if (b) { cCat = b.dataset.rowcat; renderRow(); } });

  var colCat = 'All', colShown = 12;
  function renderCol() {
    var list = itemsFor(colCat);
    $('#colTitle').textContent = 'The collection';
    $('#colSub').textContent = list.length + ' pieces';
    $('#colFilters').innerHTML = chipsHtml(CHIPS, colCat, 'colcat');
    $('#colGrid').innerHTML = list.slice(0, colShown).map(cardHtml).join('');
    $('#colMore').hidden = list.length <= colShown; $('#colMore').textContent = 'Show more (' + (list.length - colShown) + ' more)';
  }
  function openCol() { colCat = cCat; colShown = 12; renderCol(); $('#colWrap').hidden = false; $('#colWrap').scrollTop = 0; document.body.classList.add('lock'); }
  function closeCol() { $('#colWrap').hidden = true; if ($('#studioWrap').hidden && $('#pmodal').hidden) document.body.classList.remove('lock'); }
  $('#colClose').onclick = closeCol;
  $('#colFilters').addEventListener('click', function (e) { var b = e.target.closest('[data-colcat]'); if (b) { colCat = b.dataset.colcat; colShown = 12; renderCol(); } });
  $('#colMore').onclick = function () { colShown += 12; renderCol(); };
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#colWrap').hidden && $('#pmodal').hidden && $('#studioWrap').hidden && $('#chat').hidden) closeCol(); });
  document.addEventListener('click', function (e) { var c = e.target.closest('[data-col]'); if (c) openCol(); });

  /* piece detail */
  var curPiece = null;
  function openPiece(id) {
    var x = catItem[id]; if (!x) return; curPiece = x;
    $('#pmImg').src = x.img; $('#pmImg').alt = x.name; $('#pmTier').textContent = x.tier === 'ultra' ? '✦ Signature set' : (x.tryon ? '✦ Try-on ready' : 'Jewellery'); $('#pmTitle').textContent = x.name;
    $('#pmMeta').textContent = x.cat + (x.desc ? ' · ' + x.desc : '');
    $('#pmWa').href = waLink(x); $('#pmCall').href = 'tel:' + (ST.phoneTel || ''); $('#pmTry').hidden = !x.tryon;
    $('#pmodal').hidden = false; document.body.classList.add('lock');
  }
  function closePiece() { $('#pmodal').hidden = true; if ($('#studioWrap').hidden && $('#colWrap').hidden) document.body.classList.remove('lock'); }
  $('#pmClose').onclick = closePiece;
  $('#pmodal').addEventListener('click', function (e) { if (e.target === this) closePiece(); });
  $('#pmTry').onclick = function () { if (curPiece && curPiece.tryon) { closePiece(); openStudio(); choose(curPiece.tryon); } };
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]'), t = e.target.closest('[data-try]');
    if (t) { openStudio(); choose(t.dataset.try); } else if (o) openPiece(o.dataset.open);
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#pmodal').hidden) closePiece(); });

  $('#showcase').innerHTML = ['Rings', 'Earrings', 'Bracelets', 'Chains', 'Necklaces', 'Sets'].map(function (c) { var x = TRYITEMS.filter(function (t) { return t.cat === c; })[0]; return x ? '<div style="background-image:url(' + esc(x.img) + ')"></div>' : ''; }).join('');
  $('#kinds').addEventListener('click', function (e) { var b = e.target.closest('[data-kind]'); if (!b) return; var f = TRYITEMS.filter(function (t) { return t.cat === b.dataset.kind; })[0]; openStudio(); if (f) choose(f.id); });
  $('#stAddr').textContent = ST.address || ''; $('#stHours').textContent = ST.hours || ''; $('#stPhone').textContent = ST.phoneShow || '';
  $('#stCall').href = 'tel:' + (ST.phoneTel || '');
  $('#stWa').href = 'https://wa.me/' + (ST.whatsapp || '') + '?text=' + encodeURIComponent('Hello Nakshatra Jewellers, I would like to order / visit the shop.');
  $('#stDir').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ST.mapQuery || ST.address || '');

  /* menu, studio overlay */
  $('#menuBtn').onclick = function () { var m = $('#menu'); m.hidden = !m.hidden; this.setAttribute('aria-expanded', String(!m.hidden)); };
  $('#menu').addEventListener('click', function (e) { if (e.target.closest('a')) { $('#menu').hidden = true; $('#menuBtn').setAttribute('aria-expanded', 'false'); } });
  function openStudio() { $('#colWrap').hidden = true; $('#studioWrap').hidden = false; document.body.classList.add('lock'); $('#studioWrap').scrollTop = 0; draw(); if (typeof saveState === 'function') saveState(); }
  function closeStudio() { SS.set('nj_state', '{}'); $('#studioWrap').hidden = true; if ($('#pmodal').hidden && $('#colWrap').hidden) document.body.classList.remove('lock'); }
  document.querySelectorAll('[data-open-studio]').forEach(function (b) { b.addEventListener('click', openStudio); });
  document.querySelectorAll('[data-open-chat]').forEach(function (b) { b.addEventListener('click', function () { openChat(); }); });
  $('#studioClose').onclick = closeStudio;
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#studioWrap').hidden && $('#chat').hidden) closeStudio(); });

  /* ---------- try-on ---------- */
  var CFG = window.NAKSHATRA_TRYON || {};
  var SPACE = CFG.space || '', API = String(CFG.api || '').trim().replace(/\/+$/, '');
  var GRADIO = 'https://cdn.jsdelivr.net/npm/@gradio/client@1.19.1/+esm';
  var cv = $('#cv'), ctx = cv.getContext('2d'), statusEl = $('#status');
  var sel = P[0] || {}, selId = '', selKind = 'ring', overlay = null, photo = null, photoBlob = null, W = 800, H = 600;
  var hand = null, ppm = 0, ring = { x: 0, y: 0, heading: 0 }, placed = false, manual = false;
  var generating = false, openUrl = null;
  var cuts = {};
  P.forEach(function (p) { var i = new Image(); i.onload = draw; i.src = p.cut; cuts[p.id] = i; });
  var RING_FINGER = 13, FINGER_MM = 16;   // MediaPipe landmark of the ring finger knuckle; typical ring finger width in mm

  function setStatus(t, err) { statusEl.textContent = t; statusEl.classList.toggle('err', !!err); }
  function setBusy(on, text) { $('#busy').hidden = !on; if (text) $('#busyTxt').textContent = text; }

  var HINT = {
    ring: 'A clear photo of the back of your hand, fingers visible, in good light.',
    earring: 'A photo of your face looking at the camera, with your ears visible (hair tucked back).',
    set: 'A photo of your face and neck, shoulders visible. Hair behind the shoulders gives the best result.',
    bracelet: 'A photo of your hand and wrist, back of the hand towards the camera.',
    chain: 'A photo of your face and neck, looking at the camera, collarbones visible. Hair behind the shoulders.',
    necklace: 'A photo of your face and neck, shoulders visible. Hair behind the shoulders gives the best result.'
  };
  var pickCat = 'Rings';
  function kindOf(id) { return byId[id] ? 'ring' : ((window.TRYON && window.TRYON[id]) ? window.TRYON[id].kind : ''); }
  function renderPicks() {
    var cats = PICKCATS.filter(function (c) { return TRYITEMS.some(function (x) { return x.cat === c; }); });
    $('#pickTabs').innerHTML = cats.map(function (c) { return '<button type="button" data-ptab="' + c + '" aria-pressed="' + (c === pickCat) + '">' + (c === 'Sets' ? 'Necklace sets' : c) + '</button>'; }).join('');
    $('#picks').innerHTML = TRYITEMS.filter(function (x) { return x.cat === pickCat; }).map(function (x) {
      return '<button class="pick" type="button" data-id="' + x.id + '" aria-pressed="' + (x.id === selId) + '"><img src="' + esc(x.img) + '" alt="">' + esc(x.code) + '</button>';
    }).join('');
  }
  $('#pickTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-ptab]'); if (b) { pickCat = b.dataset.ptab; renderPicks(); } });
  function choose(id) {
    var k = kindOf(id); if (!k) return;
    selId = id; selKind = k; if (k === 'ring') sel = byId[id];
    var it = catItem[id]; if (it) pickCat = it.cat;
    renderPicks();
    $('#photoHint').textContent = HINT[k];
    overlay = null; placed = false; manual = false; openUrl = null;
    $('#generate').textContent = '✦ Generate try-on';
    if (photo) { draw(); setStatus((it ? it.name : 'Piece') + ' selected. Press Generate try-on.'); $('#stepGo').hidden = false; }
    else setStatus((it ? it.name : 'Piece') + ' selected. Now add your photo.');
    saveState();
  }
  $('#picks').addEventListener('click', function (e) { var b = e.target.closest('.pick'); if (b) choose(b.dataset.id); });
  renderPicks();

  /* the colour of the metal in the ring photo (its rim), so the band we add matches the ring */
  var metalCache = {};
  function metalOf(id) {
    if (metalCache[id]) return metalCache[id];
    var img = cuts[id], res = [205, 200, 198];
    try {
      var cw = 96, ch = Math.round(96 * img.naturalHeight / img.naturalWidth), cc = document.createElement('canvas'); cc.width = cw; cc.height = ch;
      var g = cc.getContext('2d'); g.drawImage(img, 0, 0, cw, ch); var d = g.getImageData(0, 0, cw, ch).data, n = 0, r = 0, gg = 0, b = 0;
      for (var y = 3; y < ch - 3; y++) for (var x = 3; x < cw - 3; x++) {
        var i = (y * cw + x) * 4; if (d[i + 3] < 230) continue;
        var edge = d[((y - 3) * cw + x) * 4 + 3] < 40 || d[((y + 3) * cw + x) * 4 + 3] < 40 || d[(y * cw + x - 3) * 4 + 3] < 40 || d[(y * cw + x + 3) * 4 + 3] < 40;
        var lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2], mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        if (edge && lum > 130 && (mx - mn) < 70) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
      }
      if (n > 20) res = [r / n, gg / n, b / n];
    } catch (err) { /* keep the default silver */ }
    return (metalCache[id] = res);
  }

  var wmOn = false;
  function draw() { drawBase(); if (photo && wmOn) watermark(); }
  function watermark() {
    var f = Math.max(13, Math.round(Math.min(W, H) * 0.03)), pad = Math.round(f * 0.7);
    ctx.save(); ctx.font = '600 ' + f + 'px Cinzel, Georgia, serif'; ctx.textBaseline = 'middle';
    var t = 'NAKSHATRA JEWELLERS', tw = ctx.measureText(t).width, r = f * 0.95, bw = r * 2 + f * 0.6 + tw + f * 0.9, bh = r * 2 + f * 0.3, x = W - pad - bw, y = H - pad - bh;
    ctx.globalAlpha = 0.82; ctx.fillStyle = 'rgba(18,10,5,.62)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, bh / 2); else ctx.rect(x, y, bw, bh); ctx.fill();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = '#e6c968'; ctx.lineWidth = Math.max(1, f * 0.07); ctx.beginPath(); ctx.arc(x + f * 0.15 + r, y + bh / 2, r, 0, 7); ctx.stroke();
    ctx.fillStyle = '#e6c968'; ctx.textAlign = 'center'; ctx.font = '700 ' + Math.round(f * 0.78) + 'px Cinzel, Georgia, serif'; ctx.fillText('NJ', x + f * 0.15 + r, y + bh / 2 + 1);
    ctx.textAlign = 'left'; ctx.font = '600 ' + f + 'px Cinzel, Georgia, serif'; ctx.fillStyle = '#f6e7bd'; ctx.fillText(t, x + f * 0.15 + r * 2 + f * 0.5, y + bh / 2 + 1);
    ctx.restore();
  }
  function drawBase() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!photo) {
      ctx.fillStyle = '#f7f5f0'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#666'; ctx.font = '22px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Your photo will appear here', cv.width / 2, cv.height / 2);
      return;
    }
    ctx.drawImage(photo, 0, 0, W, H);
    if (overlay) { overlay.draw(ctx); return; }
    var img = cuts[sel.id];
    if (selKind !== 'ring' || !placed || !img || !img.complete) return;
    var mm = ppm || W * 0.0095, wmm = Math.min(sel.widthMm * 0.95, FINGER_MM * 1.06), s = wmm * mm / sel.cw;   // never wider than the finger it wraps
    var rad = ring.heading * Math.PI / 180, ux = Math.sin(rad), uy = -Math.cos(rad);   // direction along the finger, towards the tip
    var sk = skinAround(ring.x, ring.y, ux, uy, FINGER_MM * mm * 0.9);                // skin colour and light of this photo
    cv.setAttribute('data-ring', [Math.round(ring.x), Math.round(ring.y), Math.round(ring.heading), (FINGER_MM * mm).toFixed(1)].join(','));   // x, y, rotation, finger width in pixels
    ctx.save();
    ctx.translate(ring.x, ring.y);
    ctx.rotate(rad);
    contactShadow(mm, s, sel);
    if (!sel.noband) { ctx.save(); ctx.translate(0, sel.widthMm * (sel.ch / sel.cw) * mm * 0.1); drawBand(mm, sk, metalOf(sel.id), sel.pave); ctx.restore(); }       // the band leaves the stone a little below its middle
    ctx.rotate((sel.rot || 0) * Math.PI / 180);          // some ring photos are slightly tilted: straighten the stone along the finger
    // the ring photo, matched to the light and skin colour of the customer's photo
    var pw = Math.max(2, Math.round(sel.cw * s)), ph = Math.max(2, Math.round(sel.ch * s));
    var oc = document.createElement('canvas'); oc.width = pw; oc.height = ph;
    var ox = oc.getContext('2d'); ox.imageSmoothingQuality = 'high';
    ox.filter = 'brightness(' + sk.light.toFixed(3) + ') contrast(.92) saturate(.9) blur(' + Math.max(0.4, Math.min(1.3, pw / 190)).toFixed(2) + 'px)';   // as soft as the rest of the photo
    ox.drawImage(img, 0, 0, pw, ph); ox.filter = 'none';
    ox.globalCompositeOperation = 'source-atop';
    ox.fillStyle = 'rgba(' + sk.r + ',' + sk.g + ',' + sk.b + ',.24)'; ox.fillRect(0, 0, pw, ph);
    var eg = ox.createLinearGradient(0, 0, pw, 0); eg.addColorStop(0, 'rgba(30,14,8,.42)'); eg.addColorStop(0.16, 'rgba(30,14,8,0)'); eg.addColorStop(0.84, 'rgba(30,14,8,0)'); eg.addColorStop(1, 'rgba(30,14,8,.42)'); ox.fillStyle = eg; ox.fillRect(0, 0, pw, ph);   // the ring curves away at both sides of the finger   // a little skin colour reflected in the silver
    // wrap the ring round the finger: the sides turn away and drop, like a cylinder seen from above
    var T = 0.95, drop = pw * 0.07, pad = Math.ceil(drop) + 2, wc = document.createElement('canvas'); wc.width = pw; wc.height = ph + pad * 2;
    var wx = wc.getContext('2d'); wx.imageSmoothingQuality = 'high';
    var sT = Math.sin(T), cT = 1 - Math.cos(T);
    for (var ci = 0; ci < pw; ci++) {
      var u = (ci + 0.5) / pw * 2 - 1, X = (pw / 2) * (1 + Math.sin(u * T) / sT), X2 = (pw / 2) * (1 + Math.sin(((ci + 1.5) / pw * 2 - 1) * T) / sT);
      var dy = drop * (1 - Math.cos(u * T)) / cT, k = 1 - 0.1 * Math.abs(u);
      wx.drawImage(oc, ci, 0, 1, ph, X, pad + dy + ph * (1 - k) / 2, Math.max(1.2, X2 - X + 0.4), ph * k);
    }
    // the ring goes round the finger: whatever sticks out past the finger's edge is cut away, and it turns dark as it rolls away at the sides
    var chh = FINGER_MM * mm * 0.5 * 0.97, mx0 = pw / 2 - chh, mx1 = pw / 2 + chh;
    var g1 = wx.createLinearGradient(mx0, 0, mx1, 0); g1.addColorStop(0, 'rgba(0,0,0,0)'); g1.addColorStop(0.05, 'rgba(0,0,0,.9)'); g1.addColorStop(0.1, 'rgba(0,0,0,1)'); g1.addColorStop(0.9, 'rgba(0,0,0,1)'); g1.addColorStop(0.95, 'rgba(0,0,0,.9)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
    wx.globalCompositeOperation = 'destination-in'; wx.fillStyle = g1; wx.fillRect(0, 0, pw, wc.height);
    var g2 = wx.createLinearGradient(mx0, 0, mx1, 0); g2.addColorStop(0, 'rgba(20,9,5,.6)'); g2.addColorStop(0.12, 'rgba(20,9,5,.28)'); g2.addColorStop(0.3, 'rgba(20,9,5,0)'); g2.addColorStop(0.7, 'rgba(20,9,5,0)'); g2.addColorStop(0.88, 'rgba(20,9,5,.28)'); g2.addColorStop(1, 'rgba(20,9,5,.6)');
    wx.globalCompositeOperation = 'source-atop'; wx.fillStyle = g2; wx.fillRect(0, 0, pw, wc.height);
    var gr = document.createElement('canvas'); gr.width = gr.height = 96; var gx = gr.getContext('2d'), gd = gx.createImageData(96, 96);   // a little grain, like the rest of the photo
    for (var gi = 0; gi < gd.data.length; gi += 4) { var gv = Math.random() < 0.5 ? 0 : 255; gd.data[gi] = gd.data[gi + 1] = gd.data[gi + 2] = gv; gd.data[gi + 3] = 20; }
    gx.putImageData(gd, 0, 0); wx.fillStyle = wx.createPattern(gr, 'repeat'); wx.fillRect(0, 0, pw, wc.height);
    wx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.beginPath(); ctx.rect(-chh * 1.04, -ph * 3, chh * 2.08, ph * 6); ctx.clip();               // shadows only fall on the finger, never on the background beside it
    var sh = document.createElement('canvas'); sh.width = wc.width; sh.height = wc.height; var sx = sh.getContext('2d');
    sx.drawImage(wc, 0, 0); sx.globalCompositeOperation = 'source-in';                                         // the ring's outline, filled with a dark shade of THIS skin
    sx.fillStyle = 'rgb(' + Math.round(sk.r * 0.3) + ',' + Math.round(sk.g * 0.2) + ',' + Math.round(sk.b * 0.17) + ')'; sx.fillRect(0, 0, sh.width, sh.height);
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = 'blur(' + (2.4 * mm).toFixed(1) + 'px)'; ctx.globalAlpha = 0.75; ctx.drawImage(sh, -pw / 2, -ph / 2 - pad + 1.0 * mm);     // wide soft shade where the ring presses on the finger
    ctx.filter = 'blur(' + (0.7 * mm).toFixed(1) + 'px)'; ctx.globalAlpha = 0.9; ctx.drawImage(sh, -pw / 2, -ph / 2 - pad + 0.4 * mm);       // tight contact shadow
    ctx.filter = 'blur(' + (0.5 * mm).toFixed(1) + 'px)'; ctx.globalAlpha = 0.45; ctx.drawImage(sh, -pw / 2, -ph / 2 - pad - 0.35 * mm);    // a little shade above the ring too, where the skin bulges against it
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(wc, -pw / 2, -ph / 2 - pad);
    ctx.restore();
    ctx.restore();
  }

  /* average skin colour on the finger just above and below the ring, and how bright the photo is there */
  function skinAround(x, y, ux, uy, d) {
    var r = 0, g = 0, b = 0, n = 0, rr = Math.max(3, Math.round(d * 0.12));
    var pts = [[x + ux * d, y + uy * d], [x - ux * d, y - uy * d]];
    pts.forEach(function (p) {
      var x0 = Math.max(0, Math.min(W - 1, Math.round(p[0] - rr))), y0 = Math.max(0, Math.min(H - 1, Math.round(p[1] - rr)));
      var w = Math.min(2 * rr, W - x0), h = Math.min(2 * rr, H - y0); if (w < 1 || h < 1) return;
      var dt; try { dt = photo.getContext('2d').getImageData(x0, y0, w, h).data; } catch (e) { return; }
      for (var i = 0; i < dt.length; i += 4) { r += dt[i]; g += dt[i + 1]; b += dt[i + 2]; n++; }
    });
    if (!n) return { r: 180, g: 130, b: 110, light: 1 };
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    var lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return { r: r, g: g, b: b, light: Math.max(0.56, Math.min(0.95, 0.4 + lum / 260)) };
  }

  /* soft dark patch on the skin under the stone, where the ring lifts off the finger */
  function contactShadow(mm, s, p) {
    var hw = p.widthMm * mm * 0.62, hh = p.widthMm * (p.ch / p.cw) * mm * 0.55;
    var fh = FINGER_MM * mm * 0.5 * 0.94; hw = Math.min(hw, fh * 0.98);                                // never wider than the finger
    ctx.save(); ctx.beginPath(); ctx.rect(-fh, -hh * 4, fh * 2, hh * 8); ctx.clip();
    ctx.translate(0, mm * 1.1); ctx.scale(1, hh / hw);
    var g = ctx.createRadialGradient(0, 0, hw * 0.25, 0, 0, hw);
    g.addColorStop(0, 'rgba(25,10,5,.26)'); g.addColorStop(0.6, 'rgba(25,10,5,.11)'); g.addColorStop(1, 'rgba(25,10,5,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, hw, 0, 7); ctx.fill(); ctx.restore();
  }

  /* The silver band round the finger: a polished round wire that goes across the whole finger and turns round its sides.
     Bright along the top, darker underneath with a little warm skin colour reflected in it, darker where it turns away at the sides,
     with a soft shadow on the skin along it. */
  function drawBand(mm, sk, M, pave) {
    var fw = Math.max(24, FINGER_MM * mm), dl = fw * 0.035, half = fw / 2 + dl, w = Math.max(3, (pave ? 2.1 : 1.75) * mm), e = fw * 0.04;
    M = M || [205, 205, 205];
    var L = sk.light, ch = function (v, k, m, s) { var base = 0.7 * m * v / 195 + 0.3 * v; return Math.round(Math.min(255, (base * (1 - k) + s * k) * L)); };    // the ring's own metal colour, lit like this photo
    var c = function (v, k) { k = k || 0; return 'rgb(' + [ch(v, k, M[0], sk.r), ch(v, k, M[1], sk.g), ch(v, k, M[2], sk.b)] + ')'; };
    var bw = Math.ceil(half * 2) + 4, bh = Math.ceil(w * 1.8), mid = bh / 2, oc = document.createElement('canvas'); oc.width = bw; oc.height = bh;
    var o = oc.getContext('2d'), x0 = 2, x1 = bw - 2, r = w / 2;
    o.beginPath(); o.moveTo(x0 + r, mid - r); o.lineTo(x1 - r, mid - r); o.arc(x1 - r, mid, r, -Math.PI / 2, Math.PI / 2); o.lineTo(x0 + r, mid + r); o.arc(x0 + r, mid, r, Math.PI / 2, Math.PI * 1.5); o.closePath();
    var g = o.createLinearGradient(0, mid - r, 0, mid + r);
    g.addColorStop(0, c(255, 0.03)); g.addColorStop(0.14, c(246, 0.05)); g.addColorStop(0.3, c(222, 0.08)); g.addColorStop(0.5, c(170, 0.12)); g.addColorStop(0.7, c(205, 0.16)); g.addColorStop(0.88, c(135, 0.22)); g.addColorStop(1, c(92, 0.26));   // polished metal: bright top, dark middle, light reflected from below
    o.fillStyle = g; o.fill();
    o.save(); o.clip();
    var ref = o.createLinearGradient(0, mid, 0, mid + r);                                        // warm skin colour reflected in the underside
    ref.addColorStop(0, 'rgba(' + sk.r + ',' + sk.g + ',' + sk.b + ',0)'); ref.addColorStop(1, 'rgba(' + sk.r + ',' + sk.g + ',' + sk.b + ',.3)');
    o.fillStyle = ref; o.fillRect(0, mid, bw, r);
    var gx = o.createLinearGradient(x0, 0, x1, 0);                                               // darker where the band turns away at the sides
    gx.addColorStop(0, 'rgba(25,14,10,.62)'); gx.addColorStop(0.08, 'rgba(25,14,10,.34)'); gx.addColorStop(0.22, 'rgba(25,14,10,.06)'); gx.addColorStop(0.5, 'rgba(25,14,10,0)');
    gx.addColorStop(0.78, 'rgba(25,14,10,.06)'); gx.addColorStop(0.92, 'rgba(25,14,10,.34)'); gx.addColorStop(1, 'rgba(25,14,10,.62)');
    o.fillStyle = gx; o.fillRect(0, 0, bw, bh);
    var sp = o.createLinearGradient(x0, 0, x1, 0);                                               // thin bright reflection along the top of the wire
    sp.addColorStop(0.04, 'rgba(255,255,255,0)'); sp.addColorStop(0.2, 'rgba(255,255,255,.55)'); sp.addColorStop(0.5, 'rgba(255,255,255,.95)'); sp.addColorStop(0.8, 'rgba(255,255,255,.55)'); sp.addColorStop(0.96, 'rgba(255,255,255,0)');
    o.strokeStyle = sp; o.lineCap = 'round'; o.lineWidth = Math.max(1, w * 0.13);
    o.beginPath(); o.moveTo(x0 + r, mid - r * 0.45); o.lineTo(x1 - r, mid - r * 0.45); o.stroke();
    if (pave) {                                                                                    // small white stones set along the band, squeezed where the band turns away
      var sr = r * 0.62, step = sr * 2.15;
      for (var sx = x0 + r + sr; sx < x1 - r - sr * 0.5; sx += step) {
        var xf2 = (sx - bw / 2) / (bw / 2), k = 1 - 0.6 * xf2 * xf2, rx = Math.max(0.6, sr * k), ry = sr * 0.92;
        var sg2 = o.createRadialGradient(sx - rx * 0.25, mid - ry * 0.3, 0, sx, mid, Math.max(rx, ry));
        sg2.addColorStop(0, 'rgba(255,255,255,1)'); sg2.addColorStop(0.55, c(236, 0.04)); sg2.addColorStop(1, c(160, 0.1));
        o.beginPath(); o.ellipse(sx, mid, rx, ry, 0, 0, 7); o.fillStyle = sg2; o.fill();
        o.lineWidth = Math.max(0.6, w * 0.05); o.strokeStyle = 'rgba(60,45,45,.55)'; o.stroke();
        o.beginPath(); o.arc(sx - rx * 0.3, mid - ry * 0.35, Math.max(0.5, ry * 0.2), 0, 7); o.fillStyle = 'rgba(255,255,255,.95)'; o.fill();
      }
    }
    o.restore();
    ctx.save();                                                                                   // shadow on the skin: soft, and a thin dark line along both edges
    var curve = function (dy) { ctx.beginPath(); ctx.moveTo(-half, e + dy); ctx.quadraticCurveTo(0, -e + dy, half, e + dy); };
    var sg = ctx.createLinearGradient(-half, 0, half, 0);
    sg.addColorStop(0, 'rgba(40,18,10,.1)'); sg.addColorStop(0.15, 'rgba(40,18,10,.4)'); sg.addColorStop(0.85, 'rgba(40,18,10,.4)'); sg.addColorStop(1, 'rgba(40,18,10,.1)');
    curve(w * 0.45); ctx.strokeStyle = sg; ctx.lineWidth = w * 0.9; ctx.shadowColor = 'rgba(40,18,10,.4)'; ctx.shadowBlur = w * 1.1; ctx.stroke();
    ctx.shadowColor = 'transparent';
    curve(-w * 0.55); ctx.strokeStyle = 'rgba(50,25,15,.2)'; ctx.lineWidth = Math.max(1, w * 0.12); ctx.stroke();
    curve(w * 0.55); ctx.strokeStyle = 'rgba(50,25,15,.26)'; ctx.stroke();
    ctx.restore();
    var n = bw - 4;                                                                               // the wire itself, bent so its two sides curve down round the finger
    for (var i = 0; i < n; i++) { var xf = (i - n / 2) / (n / 2); var th = 1 - 0.24 * xf * xf; ctx.drawImage(oc, i + 2, 0, 1, bh, -half + i * (half * 2 / n), e * xf * xf - mid * th, half * 2 / n + 0.6, bh * th); }   // a little thinner towards the sides
  }

  /* ---- quick preview on the device: MediaPipe Hands finds the finger (files bundled in vendor/hands) ---- */
  var handsLib = null, resolveRun = null;
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); });
  }
  /* Inside the Claude preview binary files cannot be hosted, so they are stored as base64 text (NJ_EXT) and turned into blob URLs here. */
  var njBlobs = window.njBlobs = window.njBlobs || {};
  window.njPrep = window.njPrep || async function (dir, names) {
    if (!window.NJ_EXT) return;
    for (var i = 0; i < names.length; i++) {
      var key = dir + names[i]; if (njBlobs[key]) continue;
      var t = await (await fetch(key + '.b64.txt')).text(), bin = atob(t.trim()), u = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j);
      njBlobs[key] = URL.createObjectURL(new Blob([u], { type: 'application/octet-stream' }));
    }
  };
  window.njLoc = window.njLoc || function (dir, f) { return window.njBlobs[dir + f] || (dir + f); };
  async function getHands() {
    if (handsLib) return handsLib;
    await window.njPrep('vendor/hands/', ['hands_solution_packed_assets.data', 'hand_landmark_full.tflite', 'hands.binarypb']);
    await loadScript('vendor/hands/hands.js');
    var h = new window.Hands({ locateFile: function (f) { return window.njLoc('vendor/hands/', f); } });
    h.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.25, minTrackingConfidence: 0.25 });
    h.onResults(function (r) { if (resolveRun) { var f = resolveRun; resolveRun = null; f(r); } });
    await h.initialize();
    handsLib = h; return h;
  }
  var handMemo = null;                                                        // the hand is found once per photo, so Retry gives the same placement
  async function detect() {
    if (handMemo && handMemo.photo === photo) return handMemo.val;
    var h = await getHands();
    var c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(photo, 0, 0, W, H);
    function once() {
      return new Promise(function (resolve, reject) {
        resolveRun = resolve;
        h.send({ image: c }).catch(reject);
        setTimeout(function () { if (resolveRun) { resolveRun = null; reject(new Error('timeout')); } }, 60000);
      });
    }
    var res = await once();                                                   // first pass finds the hand, the second pass (tracking) settles the landmarks on it
    if (res && res.multiHandLandmarks && res.multiHandLandmarks.length) { try { var res2 = await once(); if (res2 && res2.multiHandLandmarks && res2.multiHandLandmarks.length) res = res2; } catch (e2) { /* keep the first pass */ } }
    var hs = (res && res.multiHandLandmarks) || [];
    if (!hs.length) return null;
    var best = null, bestW = 0;
    hs.forEach(function (lm) { var w = Math.hypot((lm[5].x - lm[17].x) * W, (lm[5].y - lm[17].y) * H); if (w > bestW) { bestW = w; best = lm; } });
    var out = { lm: best, palm: bestW }; handMemo = { photo: photo, val: out };
    return out;
  }
  /* Inside the Claude preview page the hand files cannot be loaded, so Claude finds the finger from the photo instead. */
  var FIND_PROMPT = 'This photo shows a hand. Look at the hand closest to the camera. List its four fingers other than the thumb, in order starting from the finger next to the thumb: index, middle, ring, little. ' +
    'For each finger give: tip = the very end of the finger; base = the middle of the finger at its very bottom, where it joins the hand (level with the skin folds between the fingers); width = the thickness of the finger halfway between base and tip, as a fraction of the image width. ' +
    'All x and y values are fractions from 0 to 1 of the image width and height, from the top-left corner. ' +
    'Reply with only one JSON object: {"found":true,"fingers":[{"name":"index","tip":{"x":0.0,"y":0.0},"base":{"x":0.0,"y":0.0},"width":0.0},{"name":"middle",...},{"name":"ring",...},{"name":"little",...}]}. ' +
    'If the fingers are not clearly visible reply {"found":false}.';
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function okFinger(f) { return f && f.tip && f.base && isNum(f.tip.x) && isNum(f.tip.y) && isNum(f.base.x) && isNum(f.base.y) && isNum(f.width) && f.width > 0.01 && f.width < 0.6; }
  async function claudeFinger() {
    var c = window.claude; if (!c || !c.use || !photoBlob) return null;
    var ai = await c.use('sample'); if (!ai) return null;
    var lim = await ai.limits(); if (!lim || !lim.images) return null;
    var r = await ai.json(FIND_PROMPT, { images: photoBlob });
    if (!r || r.found === false || !Array.isArray(r.fingers)) return null;
    var fs = r.fingers.filter(okFinger); if (!fs.length) return null;
    var f = null;
    r.fingers.forEach(function (x) { if (okFinger(x) && /ring/i.test(String(x.name || ''))) f = x; });
    if (!f && r.fingers.length >= 3 && okFinger(r.fingers[2])) f = r.fingers[2];
    if (!f) return null;
    var ws = fs.map(function (x) { return x.width; }).sort(function (p, q) { return p - q; }), med = ws[Math.floor(ws.length / 2)];
    return { base: f.base, tip: f.tip, width: Math.max(0.75 * med, Math.min(1.25 * med, f.width)) };   // a finger is about as thick as its neighbours
  }
  /* Measure the finger under a point from the photo itself: find the skin around the point, take the
     shortest way across it as the finger width, and the way along it as the finger direction. */
  var pix = null, pixFor = null;
  function pixels() { if (pixFor !== photo) { pix = photo.getContext('2d').getImageData(0, 0, W, H).data; pixFor = photo; } return pix; }
  function refineAt(x0, y0, hint, fwEst) {
    var d; try { d = pixels(); } catch (e) { return null; }
    var X = Math.max(4, Math.min(W - 5, Math.round(x0))), Y = Math.max(4, Math.min(H - 5, Math.round(y0)));
    var m = [0, 0, 0], q = [0, 0, 0], n = 0, i, k;
    for (var yy = -4; yy <= 4; yy++) for (var xx = -4; xx <= 4; xx++) { i = ((Y + yy) * W + X + xx) * 4; for (k = 0; k < 3; k++) { m[k] += d[i + k]; q[k] += d[i + k] * d[i + k]; } n++; }
    var sd = 0; for (k = 0; k < 3; k++) { m[k] /= n; sd += Math.sqrt(Math.max(0, q[k] / n - m[k] * m[k])); }
    var tol = Math.max(34, Math.min(62, 2.4 * sd / 3 * 1.7)), maxRun = Math.min(W, H) * 0.4;
    function inSkin(px, py) {
      var xi = Math.round(px), yi = Math.round(py); if (xi < 0 || yi < 0 || xi >= W || yi >= H) return false;
      var j = (yi * W + xi) * 4, dr = d[j] - m[0], dg = d[j + 1] - m[1], db = d[j + 2] - m[2];
      return Math.sqrt(dr * dr + dg * dg + db * db) < tol;
    }
    var tolW = Math.min(115, tol * 1.9);
    function col(px, py) { var xi = Math.max(0, Math.min(W - 1, Math.round(px))), yi = Math.max(0, Math.min(H - 1, Math.round(py))), j = (yi * W + xi) * 4; return [d[j], d[j + 1], d[j + 2]]; }
    function skinW(px, py) { var c = col(px, py), dr = c[0] - m[0], dg = c[1] - m[1], db = c[2] - m[2]; return Math.sqrt(dr * dr + dg * dg + db * db) < tolW; }
    function run(px, py, dx, dy) {                                           // walk until the colour leaves the skin range or jumps (an edge): gentle shading on the finger is allowed
      var t = 0, prev = col(px, py);
      while (t < maxRun) {
        var x1 = px + dx * t, y1 = py + dy * t; if (!skinW(x1, y1)) break;
        var c = col(x1, y1), jr = c[0] - prev[0], jg = c[1] - prev[1], jb = c[2] - prev[2];
        if (t >= 3 && Math.sqrt(jr * jr + jg * jg + jb * jb) > 52) break;
        if (((t / 1.5) | 0) % 2 === 0) prev = c;
        t += 1.5;
      }
      return t;
    }
    var cx = X, cy = Y, best = null;
    for (var it = 0; it < 3; it++) {
      best = null;
      for (var a = 0; a < 180; a += 3) {
        var r = a * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r), c = run(cx, cy, dx, dy) + run(cx, cy, -dx, -dy);
        if (!best || c < best.c) best = { c: c, dx: dx, dy: dy, a: run(cx, cy, dx, dy), b: run(cx, cy, -dx, -dy) };
      }
      cx += best.dx * (best.a - best.b) / 2; cy += best.dy * (best.a - best.b) / 2;   // move to the middle of the finger
    }
    if (!best || best.c < W * 0.02 || best.c > Math.min(W, H) * 0.3) return null;
    var ax = -best.dy, ay = best.dx;                                       // along the finger
    var up = run(cx, cy, ax, ay), down = run(cx, cy, -ax, -ay);
    if (hint) {                                                             // known direction of the fingertip
      if (ax * hint.dx + ay * hint.dy < 0) { ax = -ax; ay = -ay; }
      if (ax * hint.dx + ay * hint.dy < 0.9) { ax = hint.dx; ay = hint.dy; }  // measured direction is more than about 25 degrees off: trust the hint
    }
    else if (down < up) { ax = -ax; ay = -ay; }                            // otherwise the tip is where the finger ends sooner
    // walk from the ring towards the hand: the knuckle web is where the finger suddenly gets much wider
    var px = -ay, py = ax, web = -1, wide = 0, s;
    for (s = 0.25 * best.c; s < 5 * best.c; s += 0.25 * best.c) {
      var qx = cx - ax * s, qy = cy - ay * s;
      if (run(qx, qy, px, py) + run(qx, qy, -px, -py) > 1.6 * best.c) { if (++wide >= 2) { web = s - 0.25 * best.c; break; } } else wide = 0;
    }
    return { x: cx, y: cy, heading: Math.atan2(ax, -ay) * 180 / Math.PI, fw: best.c, tip: run(cx, cy, ax, ay), web: web };
  }
  /* A close-up of the finger is sent to Claude, which marks the two edges of the finger and the line along it.
     A close-up is much easier to read than the whole photo, so this gives the real finger width and direction. */
  var ZOOM_PROMPT = 'This is a close-up of one finger. The finger runs through the middle of the picture. Give four points as fractions of the picture width and height (0 to 1, from the top-left corner): ' +
    '"left" and "right" = the two side edges of the finger, directly across from each other, near the middle of the picture, so that the line between them crosses the finger straight (at a right angle to the finger); ' +
    '"top" and "bottom" = the centre line of the finger where it meets the top edge and the bottom edge of the picture; ' +
    '"web" = the middle of the skin fold at the very bottom of the finger, where the finger joins the rest of the hand (between this finger and the next ones). Leave "web" out if it is not in the picture. ' +
    'Reply with only one JSON object: {"left":{"x":0.0,"y":0.0},"right":{"x":0.0,"y":0.0},"top":{"x":0.0,"y":0.0},"bottom":{"x":0.0,"y":0.0},"web":{"x":0.0,"y":0.0}}.';
  function okPt(p) { return p && isNum(p.x) && isNum(p.y) && p.x > -0.05 && p.x < 1.05 && p.y > -0.05 && p.y < 1.05; }
  async function zoomFit(cx, cy, hint, fwEst) {
    var c = window.claude; if (!c || !c.use || !photo || !fwEst) return null;
    var ai = await c.use('sample'); if (!ai) return null;
    var lim = await ai.limits(); if (!lim || !lim.images) return null;
    var S = Math.round(Math.min(Math.min(W, H), Math.max(120, 4.4 * fwEst))), x0 = Math.max(0, Math.min(W - S, Math.round(cx - S / 2))), y0 = Math.max(0, Math.min(H - S, Math.round(cy - S / 2)));
    var cc = document.createElement('canvas'); cc.width = cc.height = 512;
    var cx2 = cc.getContext('2d'); cx2.imageSmoothingQuality = 'high'; cx2.drawImage(photo, x0, y0, S, S, 0, 0, 512, 512);
    var blob = await toBlob(cc, 'image/jpeg', 0.92); if (!blob) return null;
    var r = await ai.json(ZOOM_PROMPT, { images: blob });
    if (!r || !okPt(r.left) || !okPt(r.right) || !okPt(r.top) || !okPt(r.bottom)) return null;
    var wpx = Math.hypot((r.right.x - r.left.x) * S, (r.right.y - r.left.y) * S);
    if (wpx < 0.6 * fwEst || wpx > 1.5 * fwEst) return null;                // does not agree with the first estimate: do not trust it
    var mx = x0 + (r.left.x + r.right.x) / 2 * S, my = y0 + (r.left.y + r.right.y) / 2 * S;
    var vx = (r.top.x - r.bottom.x), vy = (r.top.y - r.bottom.y), vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
    if (vx * hint.dx + vy * hint.dy < 0) { vx = -vx; vy = -vy; }
    if (vx * hint.dx + vy * hint.dy < 0.85) { vx = hint.dx; vy = hint.dy; }  // direction more than about 30 degrees off the first estimate: keep the first one
    var shift = Math.hypot(mx - cx, my - cy);
    if (shift > 0.7 * fwEst) { mx = cx + (mx - cx) * 0.7 * fwEst / shift; my = cy + (my - cy) * 0.7 * fwEst / shift; }
    if (okPt(r.web)) {                                                       // a ring sits just above the knuckle web: put it there
      var wx = x0 + r.web.x * S, wy = y0 + r.web.y * S, al = (wx - mx) * vx + (wy - my) * vy;   // web position along the finger, from the middle point
      var px = mx + vx * al, py = my + vy * al, tx = px + vx * 0.62 * wpx, ty = py + vy * 0.62 * wpx;   // on the finger's middle line, 0.8 finger-widths above the web
      if (al < 0 && Math.hypot(tx - mx, ty - my) < 2.4 * wpx) { mx = tx; my = ty; }
    }
    return { x: mx, y: my, heading: Math.atan2(vx, -vy) * 180 / Math.PI, fw: wpx };
  }
  /* measure the finger under a point and put the ring where it really sits: on the middle line, just above the knuckle web */
  function fitToFinger(x, y, hint, fwEst, lo, hi, webPt) {
    var rf = refineAt(x, y, hint, fwEst);
    cv.setAttribute('data-fit', rf ? 'range ' + Math.round(rf.fw) + ' vs ' + Math.round(fwEst) : 'null');
    if (!rf || rf.fw < lo * fwEst || rf.fw > hi * fwEst) return null;
    var r0 = rf.heading * Math.PI / 180, r2 = refineAt(rf.x + Math.sin(r0) * 0.7 * rf.fw, rf.y - Math.cos(r0) * 0.7 * rf.fw, hint, rf.fw);   // a second measurement further up the finger must agree, else two fingers may have merged
    if (r2 && Math.abs(r2.fw - rf.fw) > 0.3 * rf.fw) return null;
    cv.setAttribute('data-fit', [Math.round(rf.x), Math.round(rf.y), Math.round(rf.heading), Math.round(rf.fw)].join(','));
    var rad = rf.heading * Math.PI / 180, ux = Math.sin(rad), uy = -Math.cos(rad), px = rf.x, py = rf.y;
    if (webPt) {                                                              // the web (where the finger joins the hand) is known: the ring sits 0.75 finger-widths above it, on the middle line
      var al = (webPt.x - rf.x) * ux + (webPt.y - rf.y) * uy, d = al + 0.75 * rf.fw;
      if (Math.abs(d) < 3 * rf.fw) { px += ux * d; py += uy * d; }
    }
    return { x: px, y: py, heading: rf.heading, fw: rf.fw };
  }
  async function localPreview() {
    placed = false; manual = false; hand = null;
    try { hand = await detect(); } catch (err) { hand = null; }
    if (hand) {
      var a = hand.lm[RING_FINGER], b = hand.lm[RING_FINGER + 1];
      var ax = a.x * W, ay = a.y * H, bx = b.x * W, by = b.y * H;
      ring.x = ax + 0.52 * (bx - ax); ring.y = ay + 0.52 * (by - ay);
      ring.heading = Math.atan2(bx - ax, -(by - ay)) * 180 / Math.PI;
      cv.setAttribute('data-lm', [5,9,13,14,17].map(function (i) { return Math.round(hand.lm[i].x * W) + ':' + Math.round(hand.lm[i].y * H); }).join(' '));
      ppm = hand.palm / 74;   // index knuckle to little-finger knuckle is about 68 mm
      var hx = Math.sin(ring.heading * Math.PI / 180), hy = -Math.cos(ring.heading * Math.PI / 180);
      // measure the real finger from the pixels: try a few spots along the finger (the first one can sit on the shadow between two fingers)
      var fit = null, tryT = [0.52, 0.7, 0.85, 0.38], ti, sx0, sy0;
      for (ti = 0; ti < tryT.length && !fit; ti++) {
        sx0 = ax + tryT[ti] * (bx - ax); sy0 = ay + tryT[ti] * (by - ay);
        fit = fitToFinger(sx0, sy0, { dx: hx, dy: hy }, FINGER_MM * ppm, 0.6, 2.6);
      }
      if (fit) {
        var fr = fit.heading * Math.PI / 180, fux = Math.sin(fr), fuy = -Math.cos(fr), along = (ring.x - fit.x) * fux + (ring.y - fit.y) * fuy;
        ring.x = fit.x + fux * along; ring.y = fit.y + fuy * along; ring.heading = fit.heading; // stay on the middle line of the finger, at the usual spot
        // cross-check the pixel measurement with the hand's own proportions (finger segment length and palm width), so dark or hairy skin cannot make the ring tiny
        var seg = Math.hypot(bx - ax, by - ay), expFw = (seg * 0.4 + FINGER_MM * hand.palm / 74) / 2, fwUse = Math.max(expFw * 0.85, Math.min(expFw * 1.2, fit.fw));
        ppm = fwUse * 1.08 / FINGER_MM;
        cv.setAttribute('data-fw', [Math.round(fit.fw), Math.round(expFw), Math.round(fwUse)].join(','));
      }
      placed = true;
    } else {
      var cl = null;
      try { cl = await claudeFinger(); } catch (err) { cl = null; }
      if (cl) {
        var tdx = (cl.tip.x - cl.base.x) * W, tdy = (cl.tip.y - cl.base.y) * H, tl = Math.hypot(tdx, tdy) || 1;
        ring.x = (cl.base.x + 0.1 * (cl.tip.x - cl.base.x)) * W; ring.y = (cl.base.y + 0.1 * (cl.tip.y - cl.base.y)) * H;   // a ring sits low on the finger, close to its bottom
        ring.heading = Math.atan2(tdx, -tdy) * 180 / Math.PI;
        ppm = cl.width * W / FINGER_MM;     // finger width in pixels / 16 mm
        try {
          var z = await zoomFit(ring.x, ring.y, { dx: tdx / tl, dy: tdy / tl }, cl.width * W);
          if (z) { ring.x = z.x; ring.y = z.y; ring.heading = z.heading; ppm = z.fw / FINGER_MM; }
        } catch (err) { /* keep the first estimate */ }
        // the finger is measured from the pixels of the photo itself, starting a little further up the finger where it is clean
        var sx = (cl.base.x + 0.3 * (cl.tip.x - cl.base.x)) * W, sy = (cl.base.y + 0.3 * (cl.tip.y - cl.base.y)) * H, hrad = ring.heading * Math.PI / 180;
        var fit2 = fitToFinger(sx, sy, { dx: Math.sin(hrad), dy: -Math.cos(hrad) }, ppm * FINGER_MM, 0.5, 2.3, { x: cl.base.x * W, y: cl.base.y * H });
        if (fit2) { ring.x = fit2.x; ring.y = fit2.y; ring.heading = fit2.heading; ppm = fit2.fw * 1.08 / FINGER_MM; }
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
  async function generateOther() {
    generating = true; $('#generate').disabled = true; $('#save').disabled = true; overlay = null;
    photo = originalPhoto; W = photo.width; H = photo.height; cv.width = W; cv.height = H;
    var name = (catItem[selId] || {}).name || 'piece', err = null;
    setBusy(true, 'Placing ' + name + ' on you…'); setStatus('Generating…');
    var wait = new Promise(function (r) { setTimeout(r, 1500); });
    try { overlay = await window.NJTry.run(selId, photo, W, H, photoBlob); } catch (e) { err = e; overlay = null; }
    await wait; draw();
    setBusy(false); generating = false; $('#generate').disabled = false; $('#generate').textContent = '✦ Generate try-on';
    if (err) setStatus(err.message && !/^(image |load |timeout|no try)/.test(err.message) ? err.message : 'Sorry, I could not place this piece on that photo. Please try a clearer photo.', true);
    else { setStatus('Your try-on is ready. Colours can look slightly different on screen.'); $('#save').disabled = false; $('#shareWa').disabled = false; }
  }
  async function generate() {
    if (!photo || generating) return;
    wmOn = true; $('#resultBox').hidden = false; $('#shareWa').disabled = true;
    setTimeout(function () { $('#resultBox').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    if (selKind !== 'ring') return generateOther();
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
      setStatus(!useAI && found ? 'Your ring is placed on your finger.' : (useAI ? 'The AI service is busy or not reachable right now, so this is a quick preview made on your device. Try again later for the AI version. ' : (inClaude ? 'Quick preview. The full AI try-on runs on the live website. ' : 'This is a quick preview made on your device. ')) +
        (found ? '' : 'No hand was found, so tap the photo where the ring should go.'), !found);
    }
    setBusy(false); generating = false; $('#generate').disabled = false; $('#generate').textContent = '✦ Generate try-on'; $('#save').disabled = false; $('#shareWa').disabled = false;
  }
  $('#generate').onclick = generate;

  /* the phone may reload this page while the camera or gallery is open: keep the studio, the piece and the photo, and bring them back */
  var SS = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage not available */ } }, del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  function saveState() { SS.set('nj_state', JSON.stringify({ studio: !$('#studioWrap').hidden, id: selId, cat: pickCat })); }
  $('#upload').addEventListener('click', saveState);
  $('#file').addEventListener('click', saveState);
  async function loadFile(f, inputEl) {
    if (!f) return;
    try {
      var bmp = await new Promise(function (res, rej) { var u = URL.createObjectURL(f), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); res(im); }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('image')); }; im.src = u; });
      var sc = Math.min(1, 2400 / Math.max(bmp.naturalWidth, bmp.naturalHeight), 1500 / Math.min(bmp.naturalWidth, bmp.naturalHeight));   // keep the photo sharp
      W = Math.round(bmp.naturalWidth * sc); H = Math.round(bmp.naturalHeight * sc);
      var off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').drawImage(bmp, 0, 0, W, H);
      photo = originalPhoto = off; cv.width = W; cv.height = H;
      var ss = Math.min(1, 1100 / Math.max(W, H)), sm = document.createElement('canvas'); sm.width = Math.round(W * ss); sm.height = Math.round(H * ss);
      sm.getContext('2d').drawImage(off, 0, 0, sm.width, sm.height);                  // a smaller copy is what gets sent for the finger search
      photoBlob = await toBlob(sm, 'image/jpeg', 0.9);
      try { SS.set('nj_photo', sm.toDataURL('image/jpeg', 0.82)); } catch (er2) { /* too big to keep */ }
    } catch (err) { setStatus('That file could not be opened as a picture. Please use a JPG or PNG photo.', true); return; }
    if (inputEl) inputEl.value = ''; saveState();
    placed = false; manual = false; hand = null; ppm = 0; openUrl = null; overlay = null;
    wmOn = false; $('#resultBox').hidden = true; $('#shareWa').disabled = true;
    try { $('#srcPrev').src = SS.get('nj_photo') || originalPhoto.toDataURL('image/jpeg', 0.85); } catch (er3) { /* no preview */ } $('#srcBox').hidden = false;
    overlay = null; $('#stepGo').hidden = !selId; $('#save').disabled = true; $('#generate').textContent = '✦ Generate try-on';
    setStatus(selId ? 'Photo added. Press Generate try-on.' : 'Photo added. Now choose a piece.');
    $('#stepGo').scrollIntoView({ block: 'nearest' });
  }
  $('#file').onchange = function (e) { loadFile(e.target.files && e.target.files[0], e.target); };
  $('#fileCam').onchange = function (e) { loadFile(e.target.files && e.target.files[0], e.target); };


  /* tap to place the ring: only when no hand could be found */
  function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
  cv.style.touchAction = 'pan-y';
  cv.addEventListener('click', function (e) {                         // only when no hand could be found: tap the finger to put the ring there. Otherwise the picture never changes after generating.
    if (!photo || !placed || generating || !manual) return;
    var p = pt(e); ring.x = p.x; ring.y = p.y; draw();
  });

  var lastName = function () { return ((catItem[selId] || {}).name || 'try-on').replace(/[^A-Za-z0-9]+/g, '-'); };
  async function resultBlob() { return toBlob(cv, 'image/jpeg', 0.93); }
  async function saveBlob(blob, fname) {
    try {
      var d = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (d) { await d.save({ filename: fname, data: blob }); return; }
    } catch (err) { if (err && err.code === 'declined') return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); a.remove();
  }
  $('#save').onclick = async function () {
    var blob = await resultBlob();
    if (!blob) { setStatus('Could not create the image.', true); return; }
    saveBlob(blob, 'nakshatra-' + lastName() + '.jpg');
  };
  $('#retry').onclick = function () { generate(); };
  $('#shareWa').onclick = async function () {
    var blob = await resultBlob(); if (!blob) { setStatus('Could not create the image.', true); return; }
    var name = (catItem[selId] || {}).name || 'jewellery', text = 'I tried on ' + name + ' at Nakshatra Jewellers, Pune. Order or ask: https://wa.me/' + ST.whatsapp;
    var file = null; try { file = new File([blob], 'nakshatra-' + lastName() + '.jpg', { type: 'image/jpeg' }); } catch (e) { /* old browser */ }
    try { if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: text, title: 'Nakshatra Jewellers' }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    saveBlob(blob, 'nakshatra-' + lastName() + '.jpg');                                  // no file sharing here: save the picture, then open WhatsApp with the message
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    setStatus('The picture is saved. Attach it in WhatsApp to share.');
  };

  /* camera: live view in the page; if the browser will not give it, the phone's own camera app opens instead */
  var camStream = null, camFacing = 'user';
  function camStop() { if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; } $('#camWrap').hidden = true; }
  async function camStart() {
    var v = $('#camVideo');
    if (camStream) camStream.getTracks().forEach(function (t) { t.stop(); });
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
    v.srcObject = camStream; v.style.transform = camFacing === 'user' ? 'scaleX(-1)' : ''; await v.play().catch(function () {});
  }
  $('#camBtn').onclick = async function () {
    saveState();
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { $('#fileCam').click(); return; }
    camFacing = /ring|bracelet|kada/i.test((catItem[selId] || {}).cat || '') ? 'environment' : 'user';
    $('#camHint').textContent = camFacing === 'user' ? 'Keep your face and neck in the frame, in good light.' : 'Show the back of your hand, fingers straight, in good light.';
    try { $('#camWrap').hidden = false; await camStart(); } catch (err) { camStop(); $('#fileCam').click(); }
  };
  $('#camFlip').onclick = async function () { camFacing = camFacing === 'user' ? 'environment' : 'user'; try { await camStart(); } catch (err) { /* keep current */ } };
  $('#camClose').onclick = camStop;
  $('#camShot').onclick = function () {
    var v = $('#camVideo'); if (!v.videoWidth) return;
    var c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; var x = c.getContext('2d');
    if (camFacing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(v, 0, 0);
    c.toBlob(function (b) { camStop(); if (b) loadFile(new File([b], 'camera.jpg', { type: 'image/jpeg' }), null); }, 'image/jpeg', 0.95);
  };
  draw();

  /* ---------- chat ---------- */
  var FAQ = [
    ['Show wedding sets', 'ULTRA'],
    ['Show me rings', 'RINGS'],
    ['How do I order?', 'ORDER'],
    ['Where is the shop?', 'SHOP'],
    ['Try-on kaise kare?', 'TRYON']
  ];
  var msgs = $('#msgs'), sampleFn = null, turns = [], busy = false;
  function bubble(cls, t) { var d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = t; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  function suggest(ids) {
    if (!ids || !ids.length) return;
    var d = document.createElement('div'); d.className = 'sug';
    d.innerHTML = ids.slice(0, 4).map(function (id) { var x = catItem[id]; return x ? '<button type="button" data-open="' + x.id + '"><img src="' + esc(x.img) + '" alt=""><span>' + esc(x.name) + '</span></button>' : ''; }).join('');
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }
  function pick(tier, cat, n, tryOnly) { return ALL.filter(function (x) { return (!tier || x.tier === tier) && (!cat || x.cat === cat) && (!tryOnly || x.tryon); }).slice(0, n || 4).map(function (x) { return x.id; }); }
  var KW = [
    ['ULTRA', /ultra|wedding|shaadi|shadi|bridal|dulhan|set\b|sets\b|haar/i],
    ['ORDER', /order|buy|kharid|lena|book|booking|purchase|le sakta|mangwa/i],
    ['PRICE', /price|rate|cost|kimat|kitne|kitna|bhav|budget|paise|₹|rs\b/i],
    ['SHOP', /where|address|location|kaha|kahan|shop|store|visit|direction|map|timing|time|open|khula/i],
    ['CALL', /call|phone|number|contact|baat/i],
    ['TRYON', /try|trial|pahan|pehen|photo|virtual/i],
    ['RING', /ring|anguthi|angoothi|ungli/i],
    ['EAR', /ear|jhumk|bali|bhali|kaan|studs?/i],
    ['CHAIN', /chain|zanjeer/i],
    ['KADA', /kada|kade|kara\b/i],
    ['BRACE', /bracelet|bracelets/i],
    ['NECK', /necklace|neck|gala/i],
    ['PREM', /premium/i],
    ['NORMAL', /normal|daily|everyday|roz|simple|cheap|sasta/i],
    ['GIFT', /gift|tohfa|birthday|anniversary|present/i],
    ['HELLO', /^(hi|hello|hey|namaste|hii+|helo)\b/i]
  ];
  function localReply(text) {
    var hits = []; KW.forEach(function (k) { if (k[1].test(text)) hits.push(k[0]); });
    var h = function (k) { return hits.indexOf(k) >= 0; };
    if (h('ORDER')) return ['To order, tap Order on any piece and WhatsApp opens with the piece named, or call ' + (ST.phoneShow || 'the shop') + '. The shop confirms price and availability.', []];
    if (h('PRICE')) return ['Prices depend on the piece and on the day, so the shop confirms them. Tap Order on the piece you like and we will send the price on WhatsApp.', []];
    if (h('SHOP')) return [(ST.address || '') + '\n' + (ST.hours || '') + '\nPhone: ' + (ST.phoneShow || ''), []];
    if (h('CALL')) return ['You can call the shop on ' + (ST.phoneShow || '') + ' or message on WhatsApp from the Order section.', []];
    if (h('TRYON')) return ['Virtual try-on works for rings, earrings, bracelets and kadas, chains, necklaces and the full necklace sets. Open Virtual Try-On, choose a piece, add a clear photo (hand for rings and bracelets, face and neck for earrings, chains, necklaces and sets) and press Generate. Pieces with a gold Try-On tag are ready.', []];
    if (h('ULTRA')) return ['Our 4 Signature sets are the showpieces, a necklace with matching earrings, made for weddings. Here they are:', pick('ultra', null, 4)];
    if (h('RING')) return ['Here are some rings you can try on:', pick(null, 'Rings', 4, true).concat(pick(null, 'Rings', 4).slice(0, 2))];
    if (h('EAR')) return ['Some earrings you may like:', pick(null, 'Earrings', 4, true)];
    if (h('BRACE')) return ['Bracelets you can try on:', pick(null, 'Bracelets', 4)];
    if (h('KADA')) return ['Kadas:', pick(null, 'Kadas', 4)];
    if (h('CHAIN')) return ['Chains, all with try-on:', pick(null, 'Chains', 4)];
    if (h('NECK')) return ['Necklaces to look at:', pick(null, 'Necklaces', 3).concat(pick('ultra', null, 1))];
    if (h('GIFT')) return ['For a gift, earrings, a bracelet or a chain are a good choice:', pick(null, 'Earrings', 2, true).concat(pick(null, 'Bracelets', 1), pick(null, 'Chains', 1))];
    if (h('HELLO')) return ['Hello! Tell me what you are looking for: a ring, earrings, a bracelet, a chain, a kada, a necklace or a wedding set.', []];
    return ['I can show you rings, earrings, bracelets, chains, kadas, necklaces and sets, or tell you how to order and where the shop is. What would you like?', []];
  }
  $('#faq').innerHTML = FAQ.map(function (q, i) { return '<button type="button" data-q="' + i + '">' + esc(q[0]) + '</button>'; }).join('');
  $('#faq').addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]'); if (!b) return; var q = FAQ[+b.dataset.q]; ask(q[0]);
  });
  function openChat() { $('#chat').hidden = false; $('#chatBtn').hidden = true; $('#chatBtn').setAttribute('aria-expanded', 'true'); if (!msgs.children.length) bubble('bot', 'Hello! I can help you find a piece, order it, or reach the shop. What are you looking for?'); }
  function closeChat() { $('#chat').hidden = true; $('#chatBtn').hidden = false; $('#chatBtn').setAttribute('aria-expanded', 'false'); }
  $('#chatBtn').onclick = openChat; $('#chatClose').onclick = closeChat;
  var CATSUM = ['Rings', 'Bracelets', 'Earrings', 'Chains', 'Kadas', 'Necklaces', 'Sets'].map(function (c) {
    var n = ALL.filter(function (x) { return x.cat === c; }); return n.length ? c + ': ' + n.map(function (x) { return x.name + (x.tryon ? ' (try-on)' : ''); }).join(', ') : '';
  }).filter(Boolean).join('. ');
  var RULES = 'You are the assistant of Nakshatra Jewellers, a jewellery shop in Pune. Answer briefly in plain text, under 70 words, in the language the customer writes in (English, Hindi or Hinglish), warm and polite. ' +
    'The shop has one collection of jewellery: rings, earrings, bracelets, kadas, chains, necklaces and 4 Signature necklace sets with earrings. Pieces: ' + CATSUM + '. ' +
    'Virtual try-on is available for the pieces marked try-on. Customers order by tapping Order (WhatsApp) or calling. ' +
    'The shop is at: ' + (ST.address || '') + '. Phone: ' + (ST.phoneShow || '') + '. Hours: ' + (ST.hours || '') + '. Never invent prices, offers, stock, materials, weights or anything not given here. ' +
    'For price, say the shop confirms the price for the day on WhatsApp or phone. For anything you do not know, say the shop will confirm.';
  async function ask(text) {
    bubble('me', text);
    var lr = localReply(text);
    if (!sampleFn) { bubble('bot', lr[0]); suggest(lr[1]); return; }
    if (busy) return; busy = true;
    turns.push({ role: 'user', content: text });
    var view = turns.slice(-12); while (view.length && view[0].role !== 'user') view.shift();
    var b = bubble('bot', '…');
    try {
      var r = await sampleFn([{ role: 'user', content: RULES }].concat(view), { cache: false, modelTier: 'quick', onText: function (u) { b.textContent = u.text; msgs.scrollTop = msgs.scrollHeight; } });
      b.textContent = r.text; turns.push({ role: 'assistant', content: r.text }); suggest(lr[1]);
    } catch (e) { b.textContent = lr[0]; suggest(lr[1]); turns.pop(); }
    busy = false;
  }
  $('#chatForm').onsubmit = function (e) { e.preventDefault(); var v = $('#chatIn').value.trim(); if (v) { $('#chatIn').value = ''; ask(v); } };
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#chat').hidden) closeChat(); });
  (async function () {
    try { if (window.claude && window.claude.use) { sampleFn = await window.claude.use('sample'); if (sampleFn) $('#chatForm').hidden = false; } } catch (e) { sampleFn = null; }
  })();

  (function restore() {
    var st = null; try { st = JSON.parse(SS.get('nj_state') || 'null'); } catch (e) { st = null; }
    if (!st || !st.studio) return;
    if (st.cat) pickCat = st.cat;
    openStudio(); if (st.id) choose(st.id);
    var ph = SS.get('nj_photo'); if (!ph) { setStatus('Welcome back. Please add your photo again.'); return; }
    var im = new Image();
    im.onload = function () {
      var off = document.createElement('canvas'); W = off.width = im.naturalWidth; H = off.height = im.naturalHeight; off.getContext('2d').drawImage(im, 0, 0);
      photo = originalPhoto = off; cv.width = W; cv.height = H;
      off.toBlob(function (b) { photoBlob = b; }, 'image/jpeg', 0.9);
      try { $('#srcPrev').src = off.toDataURL('image/jpeg', 0.85); $('#srcBox').hidden = false; } catch (e4) { /* no preview */ }
      $('#stepGo').hidden = !selId; draw(); setStatus(selId ? 'Your photo is back. Press Generate try-on.' : 'Your photo is back. Choose a piece.');
    };
    im.src = ph;
  })();
})();
