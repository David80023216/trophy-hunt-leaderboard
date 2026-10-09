/* Trophy Hunt Season 1 leaderboard renderer.
   Renders ONLY what the #th-data block contains — never invent players. */
(function () {
  'use strict';

  var dataEl = document.getElementById('th-data');
  var data = {};
  try { data = JSON.parse(dataEl.textContent || '{}'); } catch (e) { data = {}; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rankBadge(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return String(rank);
  }

  function streakHtml(n) {
    n = Number(n) || 0;
    return n >= 2 ? '<span class="streak">🔥' + n + '</span>' : (n === 1 ? '<span class="streak streak-1">▸1</span>' : '—');
  }

  function renderSpotlight() {
    var s = data.spotlight_today;
    var sec = document.getElementById('spotlight');
    if (!s || !s.handle) return;
    sec.hidden = false;
    var dogPhotos = data.dog_photos || {};
    var photo = (dogPhotos[s.handle] && dogPhotos[s.handle].full) || s.photo || '';
    var img = document.getElementById('spot-photo');
    if (photo) {
      img.src = photo;
      img.alt = (s.dog_name || 'dog') + ' — today\'s spotlight';
      img.hidden = false;
      img.onerror = function () { img.style.display = 'none'; };
    }
    document.getElementById('spot-dog').textContent = '🐶 ' + (s.dog_name || 'Mystery pup');
    document.getElementById('spot-handle').textContent = s.handle;
    var st = document.getElementById('spot-streak');
    st.textContent = s.streak >= 2 ? '🔥 ' + s.streak + '-day streak' : '';
  }

  function rowHtml(entry, rank, idx) {
    var avatar = entry.avatar
      ? '<img src="' + esc(entry.avatar) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '';
    var dogPhotos = data.dog_photos || {};
    var dog = dogPhotos[entry.handle];
    var dogCell = esc(entry.dog_name || '—');
    if (dog && dog.src) {
      dogCell = '<img class="dog-thumb" src="' + esc(dog.src) + '" data-full="' +
        esc(dog.full || dog.src) + '" alt="' + esc(entry.dog_name || 'dog') +
        '" loading="lazy" title="Click to expand 🐶" onerror="this.style.display=\'none\'">' +
        '<span class="dog-name">' + esc(entry.dog_name || '') + '</span>';
    }
    var hasDog = !!(entry.dog_name || (dog && dog.src));
    var hasStreak = (Number(entry.streak) || 0) >= 1;
    var line2 = (hasDog ? dogCell : '') +
      (hasStreak ? '<span class="streak-inline">' + streakHtml(entry.streak) + '</span>' : '');
    if (!line2) line2 = '—';
    return '<tr data-handle="' + esc(entry.handle.toLowerCase()) + '">' +
      '<td class="rank">' + rankBadge(rank) + '</td>' +
      '<td class="player"><span class="player-cell">' + avatar +
        '<button type="button" class="player-name check-link" data-idx="' + idx + '" title="See today\'s checklist ✅">' + esc(entry.handle) + '</button></span></td>' +
      '<td class="dog' + ((hasDog || hasStreak) ? '' : ' is-empty') + '"><span class="player-cell">' + line2 + '</span></td>' +
      '<td class="streak-cell' + (hasStreak ? '' : ' is-empty') + '">' + streakHtml(entry.streak) + '</td>' +
      '<td class="points">' + entry.season_points + ' pts</td>' +
    '</tr>';
  }

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDay(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? MONTHS[+m[2] - 1] + ' ' + (+m[3]) : (iso || '');
  }
  function fmtUpdated(iso) {
    var d = new Date(iso || '');
    if (isNaN(d.getTime())) return '';
    var h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + h + ':' +
      ('0' + d.getMinutes()).slice(-2) + ' ' + ap;
  }
  function renderStandings() {
    var rows = data.standings || [];
    var tbody = document.getElementById('rows-season');
    var rank = 0, lastPts = null;
    tbody.innerHTML = rows.map(function (e, i) {
      if (e.season_points !== lastPts) { rank = i + 1; lastPts = e.season_points; }
      return rowHtml(e, rank, i);
    }).join('');
    var snap = document.getElementById('snapshot');
    if (data.season) {
      snap.textContent = data.season.name + ' · ' + fmtDay(data.season.start) + ' → ' +
        fmtDay(data.season.end) + ' · updated ' + fmtUpdated(data.updated_at);
    }
    applySearch();
  }

  function renderHistory() {
    var hist = data.spotlight_history || [];
    if (!hist.length) return;
    var tbody = document.getElementById('rows-history');
    tbody.innerHTML = hist.slice().reverse().map(function (h) {
      return '<tr><td>' + esc(h.date || '') + '</td><td>🐶 ' + esc(h.dog_name || '—') +
        '</td><td>' + esc(h.handle || '') + '</td></tr>';
    }).join('');
  }

  function renderVideos() {
    var vids = data.videos || [];
    var list = document.getElementById('video-list');
    document.getElementById('video-empty').hidden = vids.length !== 0;
    var me = getMe();
    var entry = null;
    if (me) {
      var st = data.standings || [];
      for (var i = 0; i < st.length; i++) {
        if (st[i].handle === me) { entry = st[i]; break; }
      }
    }
    var today = {}, ever = {};
    if (entry) {
      (entry.videos_today || []).forEach(function (v) { today[v] = true; });
      (entry.videos_ever || []).forEach(function (v) { ever[v] = true; });
    }
    list.innerHTML = vids.map(function (v) {
      var url = 'https://www.youtube.com/watch?v=' + encodeURIComponent(v.id);
      var thumb = 'https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/mqdefault.jpg';
      var date = '';
      try { date = fmtDay(v.published); } catch (e) { date = v.published || ''; }
      var badges = '';
      if (entry) {
        if (today[v.id]) badges = '<span class="badge-check" title="Entered today">✓</span>';
        else if (!ever[v.id]) badges = '<span class="badge-new" title="Explorer bonus available">+10</span>';
        else badges = '<span class="badge-check dim" title="Already explored">✓</span>';
      }
      return '<a class="video-row" href="' + url + '" target="_blank" rel="noopener">' +
        '<img class="video-thumb" src="' + thumb + '" alt="" loading="lazy">' +
        '<div class="video-meta"><div class="video-title">' + esc(v.title || 'Untitled') + '</div>' +
        '<div class="video-date">' + esc(date) + '</div></div>' +
        (badges ? '<div class="video-badges">' + badges + '</div>' : '') + '</a>';
    }).join('');
  }

  function getMe() {
    try { return localStorage.getItem('th-me') || ''; } catch (e) { return ''; }
  }
  function setMe(h) {
    try { localStorage.setItem('th-me', h || ''); } catch (e) {}
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.setAttribute('style', 'position:fixed;left:50%;bottom:76px;transform:translateX(-50%);background:#1c2536;color:#f3f6fb;border:1px solid #2a3348;border-radius:10px;padding:.6rem .9rem;font-size:.85rem;z-index:200;max-width:88vw;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.45);');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.style.display = 'none'; }, 4200);
  }
  /* ---- Google sign-in (Identity Services, youtube.readonly scope) ----
     Paste the OAuth client id below once the Google Cloud client exists;
     until then the Sign in button stays hidden and the name picker is the
     identity path. Flow: popup -> access token -> channels.list(mine=true)
     -> match channel_id against standings -> setMe(handle). The token is
     revoked right after the one lookup; only the handle is remembered. */
  // Google sign-in is BUILT but hidden until Google verification completes
  // (2026-10-08, Shawn: "I don't want google on page until it actually works").
  // Restore the client id below to re-enable it for all players.
  // var GOOGLE_CLIENT_ID = '344477831008-0khp918onjd0qsvbmnpal8dg5jmjqs1j.apps.googleusercontent.com';
  var GOOGLE_CLIENT_ID = '';
  var gsiTokenClient = null;

  function gsiRemembered() {
    try {
      return { handle: localStorage.getItem('th-me') || '', via: localStorage.getItem('th-via') || '' };
    } catch (e) { return { handle: '', via: '' }; }
  }
  function gsiUpdateChrome() {
    var btn = document.getElementById('gsi-signin');
    var claimBtn = document.getElementById('name-claim');
    var chip = document.getElementById('gsi-signout');
    if (!btn || !chip) return;
    var r = gsiRemembered();
    var identified = !!r.handle;
    var signedViaGoogle = !!(r.handle && r.via === 'google');
    var available = !!GOOGLE_CLIENT_ID;
    btn.hidden = !available || identified;
    if (claimBtn) claimBtn.hidden = identified;
    chip.hidden = !identified;
    if (identified) {
      document.getElementById('gsi-handle').textContent = r.handle;
      var bare = r.handle.replace(/^@/, '');
      /* Pill avatar: player's dog photo when known, else initial. */
      var avEl = document.getElementById('gsi-avatar');
      var fnd = (typeof meRow === 'function') ? meRow() : null;
      var rw = fnd && fnd.row;
      var src = '';
      if (rw) {
        var dp = (typeof dogPhotos !== 'undefined' && dogPhotos[rw.handle]) || null;
        src = (dp && dp.full) || rw.photo || rw.avatar || '';
      }
      if (src) {
        avEl.textContent = '';
        var aim = document.createElement('img');
        aim.src = src; aim.alt = '';
        avEl.appendChild(aim);
      } else {
        avEl.textContent = (bare.charAt(0) || '?').toUpperCase();
      }
    }
    // Videos tab: legend when identified, sign-in nudge when available but signed out.
    var hint = document.getElementById('me-hint');
    var prompt = document.getElementById('signin-prompt');
    if (hint) hint.hidden = !r.handle;
    if (prompt) prompt.hidden = identified;
  }
  function gsiFindByChannel(cid) {
    var st = data.standings || [];
    for (var i = 0; i < st.length; i++) {
      if (st[i].channel_id && st[i].channel_id === cid) return st[i];
    }
    return null;
  }
  function gsiOnToken(resp) {
    var btn = document.getElementById('gsi-signin');
    if (!resp || resp.error) {
      if (btn) { btn.disabled = false; }
      toast('Sign-in didn\'t complete — tap to try again.');
      return;
    }
    var token = resp.access_token;
    fetch('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (r) { return r.json(); }).then(function (d) {
      var ch = d && d.items && d.items[0];
      if (window.google && google.accounts && google.accounts.oauth2) {
        try { google.accounts.oauth2.revoke(token, function () {}); } catch (e) {}
      }
      if (!ch || !ch.id) {
        toast('That Google account has no YouTube channel yet.');
        if (btn) { btn.disabled = false; }
        return;
      }
      var match = gsiFindByChannel(ch.id);
      if (match) {
        setMe(match.handle);
        try { localStorage.setItem('th-via', 'google'); } catch (e) {}
        gsiUpdateChrome();
        renderVideos();
        toast('Signed in as ' + match.handle + ' — your stuff loaded automatically.');
        openProfile();
      } else {
        toast('Signed in, but no Trophy Hunt entries on this YouTube channel yet — comment your dog\'s name on any video to enter!');
      }
      if (btn) { btn.disabled = false; }
    }).catch(function () {
      if (btn) { btn.disabled = false; }
      toast('Couldn\'t reach YouTube — check your connection and try again.');
    });
  }
  function initGoogleSignIn() {
    var btn = document.getElementById('gsi-signin');
    var chip = document.getElementById('gsi-signout');
    if (!btn || !chip) return;
    gsiUpdateChrome();
    if (!GOOGLE_CLIENT_ID) return; // not configured yet: picker covers identity
    // Wait for the GIS script (loaded async) before building the token client.
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (window.google && google.accounts && google.accounts.oauth2) {
        clearInterval(timer);
        gsiTokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/youtube.readonly',
          callback: gsiOnToken
        });
        btn.hidden = false;
        btn.addEventListener('click', function () {
          if (!gsiTokenClient) return;
          btn.disabled = true;
          try {
            // Popup flow: the page itself never redirects. Inside the
            // leaderboard's iframe wrapper Google still opens its own
            // window, so sign-in isn't trapped by the frame.
            gsiTokenClient.requestAccessToken({ prompt: '' });
          } catch (e) {
            btn.disabled = false;
            toast('Your browser blocked the Google sign-in window — allow popups and try again.');
          }
        });
        gsiUpdateChrome();
      } else if (tries > 40) {
        clearInterval(timer); // GIS unreachable; picker remains the identity path
      }
    }, 250);
    // Chip tap opens the profile popup (forget lives inside it now).
    gsiUpdateChrome();
  }
  /* (name picker removed 2026-10-08 — Google sign-in is the identity path) */

  /* ---- Player profile popup ---- */
  function meRow() {
    var me = normHandle(getMe());
    if (!me) return null;
    var st = data.standings || [];
    for (var i = 0; i < st.length; i++) {
      if (normHandle(st[i].handle) === me) return { row: st[i], rank: i + 1, total: st.length };
    }
    return null;
  }
  function openProfile() {
    var found = meRow();
    if (!found) return;
    var r = found.row;
    var av = document.getElementById('profile-avatar');
    if (r.avatar) { av.src = r.avatar; av.style.display = ''; }
    else { av.removeAttribute('src'); av.style.display = 'none'; }
    document.getElementById('profile-handle').textContent = r.handle || '';
    document.getElementById('profile-dog').textContent = r.dog_name ? '\uD83D\uDC36 ' + r.dog_name : '';
    document.getElementById('profile-rank').textContent = '#' + found.rank;
    document.getElementById('profile-points').textContent = r.season_points || 0;
    document.getElementById('profile-streak').textContent = (r.streak || 0) + '\uD83D\uDD25';
    document.getElementById('profile-today').textContent = '+' + (r.today_points || 0);
    var cl = document.getElementById('profile-checklist');
    cl.innerHTML = '';
    var items = (r.checklist && r.checklist.items) || [];
    var head = document.createElement('div');
    head.className = 'pcheck';
    head.innerHTML = '<span>Today&apos;s hunt</span>';
    cl.appendChild(head);
    items.forEach(function (it) {
      var d = document.createElement('div');
      d.className = 'pcheck' + (it.done ? ' done' : '');
      var label = document.createElement('span');
      label.textContent = (it.done ? '\u2705 ' : '\u2B1C ') + it.label;
      var pts = document.createElement('span');
      pts.className = 'pts';
      pts.textContent = '+' + it.points;
      d.appendChild(label); d.appendChild(pts);
      cl.appendChild(d);
    });
    var sheet = document.getElementById('profile-sheet');
    if (sheet) sheet.hidden = false;
    loadGallery(r.handle);
    var upRow = document.querySelector('.profile-upload');
    if (upRow) upRow.style.display = uploadsAvailable() ? '' : 'none';
  }
  function hideProfile() {
    var sheet = document.getElementById('profile-sheet');
    if (sheet) sheet.hidden = true;
  }
  function initProfile() {
    var chip = document.getElementById('gsi-signout');
    var close = document.getElementById('profile-close');
    var forget = document.getElementById('profile-forget');
    var sheet = document.getElementById('profile-sheet');
    if (chip) chip.addEventListener('click', openProfile);
    if (close) close.addEventListener('click', hideProfile);
    if (sheet) sheet.addEventListener('click', function (e) {
      if (e.target === sheet) hideProfile();
    });
    if (forget) forget.addEventListener('click', function () {
      setMe('');
      try { localStorage.removeItem('th-via'); } catch (e) {}
      hideProfile();
      gsiUpdateChrome();
      renderVideos();
      toast('Signed out on this device.');
    });
  }

  /* ---- Profile uploads (photos/videos via val.town, moderated before they show) ---- */
  function uploadsAvailable() {
    return typeof UPLOAD_VAL_URL === 'string' && UPLOAD_VAL_URL.indexOf('PLACEHOLDER') < 0;
  }
  function galleryItemEl(src, kind) {
    var el;
    if (kind === 'video') {
      el = document.createElement('video');
      el.src = src;
      el.className = 'gallery-item';
      el.preload = 'metadata';
      el.playsInline = true;
      el.controls = true;
    } else {
      el = document.createElement('img');
      el.src = src;
      el.className = 'gallery-item';
      el.alt = 'Player upload';
      el.loading = 'lazy';
    }
    return el;
  }
  function loadGallery(handle) {
    var g = document.getElementById('profile-gallery');
    if (!g) return;
    g.innerHTML = '';
    var rendered = 0;
    /* Verified photos already in the ledger (Pups tab data) show first. */
    try {
      var media = (data && data.dog_photos) || {};
      var items = media[handle] || media[handle.toLowerCase()] || [];
      if (!Array.isArray(items)) items = [items];
      items.forEach(function (p) {
        p = p || {};
        var src = p.src || p.full || '';
        if (!src) return;
        g.appendChild(galleryItemEl(src, p.type === 'video' ? 'video' : 'photo'));
        rendered++;
      });
    } catch (e) {}
    /* Then fresh uploads from the upload backend (moderated). */
    var finish = function () {
      if (!rendered) g.innerHTML = '<span class="gallery-empty">No uploads yet — be the first!</span>';
    };
    if (!uploadsAvailable()) { finish(); return; }
    fetch(UPLOAD_VAL_URL + '/gallery?handle=' + encodeURIComponent(handle))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var items = (d && d.items) || [];
        items.forEach(function (it) {
          g.appendChild(galleryItemEl(UPLOAD_VAL_URL + '/file/' + it.id, it.kind));
          rendered++;
        });
        finish();
      })
      .catch(function () { finish(); });
  }
  function downscaleImage(file) {
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = 1600;
        var w = img.width, h = img.height;
        if (Math.max(w, h) > max) {
          var s = max / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(function (b) { resolve(b || file); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  function uploadProfileFile(file) {
    var st = document.getElementById('upload-status');
    var say = function (m) { if (st) st.textContent = m; };
    if (!uploadsAvailable()) { say('Uploads opening soon!'); return; }
    var me = getMe();
    if (!me) { say('Sign in first.'); return; }
    var isImage = file.type.indexOf('image/') === 0;
    var isVideo = file.type.indexOf('video/') === 0;
    if (!isImage && !isVideo) { say('Only photos and videos.'); return; }
    if (isVideo && file.size > 30 * 1024 * 1024) { say('Video must be under 30 MB.'); return; }
    say('Preparing…');
    var ready = isImage ? downscaleImage(file) : Promise.resolve(file);
    ready.then(function (blob) {
      say('Uploading…');
      var fd = new FormData();
      fd.append('handle', me);
      fd.append('file', blob, file.name || 'upload');
      return fetch(UPLOAD_VAL_URL + '/upload', { method: 'POST', body: fd });
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) {
          say('Uploaded! Pending review 🕵️');
          var inp = document.getElementById('profile-file');
          if (inp) inp.value = '';
        } else {
          say(d && d.error ? 'Hmm: ' + d.error : 'Upload failed — try again.');
        }
      })
      .catch(function () { say('Upload failed — check connection.'); });
  }
  function initUploads() {
    var inp = document.getElementById('profile-file');
    if (!inp) return;
    inp.addEventListener('change', function () {
      if (inp.files && inp.files[0]) uploadProfileFile(inp.files[0]);
    });
    var cta = document.getElementById('pups-upload-cta');
    if (cta) cta.addEventListener('click', function () {
      if (getMe()) openProfile();
      else showClaimSheet();
    });
  }

  /* Lightbox: tap a gallery photo to expand it, tap anywhere to close. */
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var lb = document.getElementById('lightbox');
    var img = document.getElementById('lightbox-img');
    if (!lb || !img) return;
    if (t && t.classList && t.classList.contains('gallery-item') && t.tagName === 'IMG') {
      img.src = t.src;
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
    } else if (!lb.hidden && (t === lb || t === img)) {
      lb.hidden = true;
      document.body.style.overflow = '';
    }
  });

  /* ---- Handle claim (no Google needed) ----
     Player types their YouTube @handle; matched against the standings in
     this browser only. Identity is display-only (badges, checkmarks) and
     lives in localStorage — scoring always comes from real YouTube
     comments, so a mistyped handle can't move anyone's points. */
  function normHandle(h) {
    return (h || '').trim().replace(/^@/, '').toLowerCase();
  }
  function claimByHandle(raw) {
    var want = normHandle(raw);
    if (!want) { toast('Type your YouTube handle first.'); return; }
    var st = data.standings || [];
    var found = null;
    for (var i = 0; i < st.length; i++) {
      if (normHandle(st[i].handle) === want) { found = st[i]; break; }
    }
    if (found) {
      setMe(found.handle);
      try { localStorage.setItem('th-via', 'name'); } catch (e) {}
      hideClaimSheet();
      gsiUpdateChrome();
      renderVideos();
      toast('Found you, ' + found.handle + ' — your checkmarks and bonuses are loaded.');
      openProfile();
    } else {
      toast('No player named @' + want + ' on the board yet — check the spelling, or comment your dog\'s name on any video to enter.');
    }
  }
  function showClaimSheet() {
    var s = document.getElementById('claim-sheet');
    var inp = document.getElementById('claim-input');
    if (!s) return;
    s.hidden = false;
    if (inp) { inp.value = ''; setTimeout(function () { inp.focus(); }, 60); }
  }
  function hideClaimSheet() {
    var s = document.getElementById('claim-sheet');
    if (s) s.hidden = true;
  }
  function initNameClaim() {
    var open = document.getElementById('name-claim');
    var go = document.getElementById('claim-go');
    var cancel = document.getElementById('claim-cancel');
    var sheet = document.getElementById('claim-sheet');
    var inp = document.getElementById('claim-input');
    if (!open || !go) return;
    open.addEventListener('click', showClaimSheet);
    go.addEventListener('click', function () { claimByHandle(inp ? inp.value : ''); });
    if (inp) inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') claimByHandle(inp.value);
    });
    if (cancel) cancel.addEventListener('click', hideClaimSheet);
    if (sheet) sheet.addEventListener('click', function (e) {
      if (e.target === sheet) hideClaimSheet();
    });
    gsiUpdateChrome();
  }


  function applySearch() {
    var q = (document.getElementById('player-search').value || '').trim().toLowerCase();
    var rows = document.querySelectorAll('#rows-season tr');
    var visible = 0;
    rows.forEach(function (tr) {
      var hit = !q || (tr.getAttribute('data-handle') || '').indexOf(q) !== -1;
      tr.style.display = hit ? '' : 'none';
      if (hit) visible++;
    });
    document.getElementById('empty-season').hidden = visible !== 0;
  }

  document.getElementById('player-search').addEventListener('input', applySearch);
  document.getElementById('cookie-btn').addEventListener('click', crackCookie);

  // Click a dog thumbnail to expand it.
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t && t.classList && t.classList.contains('dog-thumb') && t.getAttribute('data-full')) {
      window.open(t.getAttribute('data-full'), '_blank', 'noopener');
    }
  });

  var FORTUNES = [
    "A great stick will cross your path this week. 🦴",
    "Your human is thinking about sharing their fries. Stay close. 🍟",
    "Bark at the mailman twice for extra luck today. 📬",
    "A long walk is in your future. Pace yourself. 🐾",
    "Someone will say 'who's a good dog' — it is you. It was always you. 🐶",
    "The couch is yours tonight. Claim it early. 🛋️",
    "A squirrel will test your patience. Forgive the squirrel. 🐿️",
    "New smells await around the next corner. Sniff boldly. 👃",
    "Your tail will wag at exactly the right moment today.",
    "A treat is coming. Act surprised anyway. 🦴",
    "The vet appointment you fear is not this week. Relax. 🩺",
    "Dig where your heart tells you. 🕳️",
    "You will win the staring contest with the cat. 🐱",
    "An old toy will feel new again today. 🧸",
    "Your zoomies will peak at golden hour. 🏃",
    "Someone new will fall in love with your ears. 👂",
    "The ball will be thrown. Be ready. 🎾",
    "Nap hard. Dream of bacon. 🥓",
    "Your humans brag about you when you're not around. 🗣️",
    "A puddle with your name on it is nearby. 💧",
    "Today is a good day to sit on a lap that is too small. 🪑",
    "The doorbell will ring. You already knew. 🔔",
    "Extra belly rubs are headed your way. Position accordingly. 🤲",
    "You are the main character today. Act like it. ⭐",
  ];
  var fortuneBag = [];
  function crackCookie() {
    var btn = document.getElementById('cookie-btn');
    var txt = document.getElementById('fortune-text');
    if (!btn || !txt) return;
    if (!fortuneBag.length) {
      fortuneBag = FORTUNES.slice();
      for (var i = fortuneBag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = fortuneBag[i]; fortuneBag[i] = fortuneBag[j]; fortuneBag[j] = tmp;
      }
    }
    btn.classList.remove('cracking');
    void btn.offsetWidth;
    btn.classList.add('cracking');
    txt.textContent = fortuneBag.pop();
    txt.hidden = false;
  }

  var DOG_FACTS = [
    "A dog's nose print is unique — like a human fingerprint. 👃",
    "Dogs dream just like we do. Puppies and old dogs dream the most. 💭",
    "A dog's sense of smell is up to 100,000 times stronger than yours.",
    "Dogs have three eyelids on each eye. 👀",
    "The Basenji is the only barkless dog — it yodels instead. 🎶",
    "Puppies are born with their eyes closed. They open at about two weeks old.",
    "A Greyhound can outrun a cheetah over a long distance. 🏃",
    "Dalmatians are born pure white — their spots show up later. 🐾",
    "The oldest dog on record, Bobi, lived to 31 years old. 🎂",
    "Dogs can learn more than 150 words and gestures.",
    "A wagging tail doesn't always mean happy — speed and direction matter. 🐕",
    "Dogs sweat through their paw pads. 🐾",
    "The Norwegian Lundehund has six toes on each foot.",
    "A Bloodhound's sense of smell is so trusted its tracking holds up in court. 🔍",
    "Newborn puppies spend about 90% of their time sleeping. 😴",
    "Dogs see better in the dark than humans do, thanks to a reflective eye layer.",
    "A dog's hearing is about four times more sensitive than yours. 👂",
    "Newfoundlands have webbed feet and were bred for water rescues. 🌊",
    "Dogs yawn when you yawn — it's contagious, just like with people. 🥱",
    "An adult dog has 42 teeth. 🦷",
    "Chaser the Border Collie learned 1,022 words — the biggest known dog vocabulary. 🧠",
    "Dogs tilt their heads to pinpoint exactly where a sound comes from. 👂",
    "The Saluki is one of the oldest dog breeds — going back thousands of years. 🏛️",
    "Some dogs can sense an oncoming seizure before it happens. 🦠",
    "A dog's normal body temperature runs 101–102.5°F — warmer than yours. 🌡️",
    "Puppies start losing their baby teeth at around four months old.",
    "The Labrador Retriever was America's most popular breed for 31 years straight. 🥇",
    "Petting a working service dog can distract it from its job — admire from afar. 🦮",
    "A dog can smell your feelings — stress and fear change your scent. 😎",
    "Greyhounds hit 45 mph at full sprint — faster than a racehorse over short bursts. 💨",
  ];
  function renderDogFact() {
    var el = document.getElementById('dog-fact');
    if (!el) return;
    var now = new Date();
    var dayOfYear = Math.floor((now - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000);
    el.textContent = DOG_FACTS[dayOfYear % DOG_FACTS.length];
  }
  /* Season 1 ends Oct 31, 2026 at midnight Central (Nov 1, 05:00 UTC). */
  var SEASON_END = Date.UTC(2026, 10, 1, 5, 0, 0);
  function tickCountdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var diff = Math.max(0, SEASON_END - Date.now());
    var d = Math.floor(diff / 86400000);
    var h = Math.floor(diff % 86400000 / 3600000);
    var m = Math.floor(diff % 3600000 / 60000);
    var s = Math.floor(diff % 60000 / 1000);
    var compact = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
    el.textContent = compact ? '\u23F3 ' + d + 'd ' + h + 'h ' + m + 'm'
                             : '\u23F3 ' + d + 'd ' + h + 'h ' + m + 'm ' + s + 's';
  }

  function renderMission() {
    var m = data.mission;
    var sec = document.getElementById('mission');
    if (!sec || !m || !m.subscribers) return;
    sec.hidden = false;
    var subs = Number(m.subscribers) || 0;
    var goal = Number(m.goal) || 1000;
    document.getElementById('mission-subs').textContent = subs.toLocaleString('en-US');
    document.getElementById('mission-dollars').textContent = '$' + (Number(m.dollars_raised) || subs).toLocaleString('en-US');
    document.getElementById('mission-goal').textContent = goal.toLocaleString('en-US');
    document.getElementById('mission-fill').style.width = Math.min(100, subs / goal * 100).toFixed(1) + '%';
    var upd = document.getElementById('mission-updated');
    if (m.fetched_at) {
      var mins = Math.max(0, Math.round((Date.now() - new Date(m.fetched_at).getTime()) / 60000));
      upd.textContent = 'updated ' + (mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm') + ' ago';
    }
  }

  /* ---- Pup Helper: rule-based FAQ bot. Answers ONLY from the page's
     own live data (th-data) plus the printed rules. Never invents points,
     players, or standings. Anything else -> video comments. ---- */
  var HELPER_NAME = "Pup Helper";
  var PLAYLIST = 'https://www.youtube.com/playlist?list=PLXRC36_9f9gA';
  var SUB_LINK = 'https://www.youtube.com/channel/UC4ghQwAZYqXrp6o5o-ZHn-Q?sub_confirmation=1';
  // (photo uploads moved into player profiles 2026-10-08 — the Google Form is retired)

  /* Dog-care FAQ: safe, vet-consensus answers. Health topics always defer
     to a vet. Checked AFTER game intents, BEFORE the generic deferral. */
  var DOG_FAQ = [
    { k: ['chocolate', 'cocoa'], a: "🍫 Chocolate is toxic to dogs — dark chocolate is the worst. Even small amounts can cause vomiting or worse. If your dog eats any, call your vet right away." },
    { k: ['grape', 'grapes', 'raisin', 'raisins'], a: "🍇 Grapes and raisins can cause kidney failure in dogs — even a few. If your dog eats any, call your vet immediately." },
    { k: ['onion', 'onions', 'garlic'], a: "🧅 Onions and garlic (raw, cooked, or powdered) damage dogs’ red blood cells. Keep them far away from your pup!" },
    { k: ['xylitol', 'sweetener', 'gum', 'birch sugar'], a: "⚠️ Xylitol (birch sugar) — in sugar-free gum and some peanut butters — is extremely toxic to dogs. Always check labels!" },
    { k: ['toxic', 'poison', 'poisonous', 'bad for dogs', 'dangerous'], a: "🚫 Big no-nos: chocolate, grapes/raisins, onions, garlic, xylitol, macadamia nuts, alcohol, caffeine. When in doubt, don’t share — and call your vet if they grab something!" },
    { k: ['safe food', 'safe foods', 'safe snack', 'safe snacks', 'good for dogs', 'healthy treat', 'healthy treats'], a: "🥕 Dog-safe snacks: carrots, apple slices (no seeds), blueberries, plain cooked chicken, pumpkin, xylitol-free peanut butter. Treats should stay under 10% of daily calories!" },
    { k: ['nail', 'nails', 'toenail', 'claw', 'claws'], a: "✂️ Trim nails every 3–4 weeks — if you hear clicking on the floor, they’re too long. Snip small bits at an angle, avoid the pink ‘quick’. Keep styptic powder handy just in case!" },
    { k: ['shampoo', 'conditioner'], a: "🧴 Pick a gentle, pH-balanced shampoo made for dogs — oatmeal-based is great for sensitive skin. Skip heavily fragranced ones, and never use human shampoo (wrong pH for their skin). Your groomer can match one to your dog’s coat!" },
    { k: ['bath', 'bathe', 'bathing'], a: "🛁 Most dogs need a bath every 4–6 weeks (more if they get muddy!). Use dog shampoo — human shampoo dries their skin. Lukewarm water, rinse well!" },
    { k: ['walk', 'walks', 'walking', 'exercise'], a: "🦮 Most adult dogs need 30–60 minutes of activity daily — high-energy breeds need more. Puppies: short play sessions, about 5 minutes per month of age, twice a day." },
    { k: ['train', 'training', 'obedience', 'trick', 'tricks'], a: "🎓 Keep sessions short (5–10 min), with lots of treats and praise. Reward what you want — dogs repeat what pays! Always end on a win." },
    { k: ['bark', 'barks', 'barking'], a: "🔊 Dogs bark from boredom, excitement, or alert. More exercise and mental games cut most nuisance barking. Never yell — they think you’re barking too! 😄" },
    { k: ['lick', 'licks', 'licking'], a: "👅 Licking is how dogs say ‘I love you’ — and explore the world. Nonstop licking can also mean boredom or tummy trouble, so watch for changes." },
    { k: ['grass'], a: "🌱 Most dogs nibble grass just because — usually harmless. Frantic grass-eating plus vomiting is worth a vet call." },
    { k: ['poop', 'stool', 'coprophagia'], a: "💩 Poop-eating is gross but common (especially puppies) — usually habit, not illness. Clean up fast, keep them busy, and ask your vet if it won’t stop." },
    { k: ['shed', 'shedding', 'brush', 'brushing', 'fur', 'coat'], a: "🪮 Most dogs shed — brushing 2–3 times a week cuts the tumbleweeds way down. Double-coated breeds ‘blow’ their coat twice a year: brush daily then!" },
    { k: ['teeth', 'tooth', 'dental', 'breath'], a: "🦷 Brush a few times a week with dog toothpaste (never human — fluoride is bad for them). Dental chews help too. Stinky breath that won’t quit = vet visit." },
    { k: ['flea', 'fleas', 'tick', 'ticks'], a: "🪲 Year-round flea/tick prevention is the move — ask your vet which product fits your dog. Check ears, belly, and between toes after hikes!" },
    { k: ['vaccine', 'vaccines', 'vaccination', 'shots', 'rabies', 'parvo', 'distemper'], a: "💉 Core vaccines: rabies, distemper, parvo, adenovirus. Puppies start a series around 6–8 weeks. Your vet sets the schedule — keep the records handy!" },
    { k: ['spay', 'neuter', 'fixed'], a: "✂️ Most vets recommend spaying/neutering around 6 months (large breeds sometimes later). It prevents surprises and some health issues — your vet will time it right." },
    { k: ['feed', 'feeding', 'meals', 'kibble', 'how much food', 'food amount'], a: "🍽️ Adult dogs: 2 meals a day. Puppies under 6 months: 3–4 small meals. Follow the bag’s guide for your dog’s weight, then adjust with your vet — ribs should be easy to feel, not see." },
    { k: ['water', 'drink', 'drinking', 'hydration'], a: "💧 Fresh water available all day, every day. Dogs drink roughly 1 oz per pound of body weight daily — way more in heat or after play." },
    { k: ['new puppy', 'new dog', 'adopt', 'adoption', 'rescue', 'puppy tips'], a: "🐶 New pup checklist: vet visit in the first week, safe chew toys, a crate, puppy food, and patience! Start training on day one — puppies are learning machines." },
    { k: ['crate'], a: "🏠 A crate should feel like a den, never a punishment. Feed meals in it, keep early sessions short, and never crate longer than they can hold it." },
    { k: ['anxiety', 'anxious', 'separation', 'home alone'], a: "💛 Separation anxiety: practice short absences, keep goodbyes boring, leave puzzle toys. Bad cases need a trainer or vet — it’s panic, not disobedience." },
    { k: ['heat', 'hot', 'heatstroke', 'summer'], a: "☀️ Heat kills dogs fast — never leave one in a car. Heatstroke signs: heavy panting, drool, wobbly walking. Cool with water (not ice) and get to a vet ASAP." },
    { k: ['cold', 'winter', 'snow'], a: "❄️ Short-haired and small dogs feel the cold — coats help below freezing. Wipe paws after walks (road salt stings), and never leave them out shivering." },
    { k: ['lifespan', 'senior', 'old dog', 'how long do dogs live', 'live'], a: "🐾 Small dogs often live 12–16 years, big dogs 8–12. Senior care: softer beds, shorter walks, vet checkups twice a year. Gray muzzles are distinguished! 🎩" },
    { k: ['dream', 'dreams', 'dreaming', 'sleep', 'sleeping', 'twitch', 'twitching'], a: "💤 Twitching paws = dreaming! Dogs dream just like us. Adults sleep 12–14 hours a day, puppies up to 20. Let sleeping dogs lie. 😴" },
    { k: ['head tilt', 'tilts head'], a: "🐶 The head tilt! Usually just curiosity — or they learned it earns treats 😄. Constant tilting or balance trouble = vet check." }
  ];

  function helperDogFaq(t) {
    for (var i = 0; i < DOG_FAQ.length; i++) {
      var keys = DOG_FAQ[i].k;
      for (var j = 0; j < keys.length; j++) {
        var w = keys[j].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp('\\b' + w + '\\b').test(t)) return DOG_FAQ[i].a;
      }
    }
    return null;
  }

  function helperTop(n) {
    var st = (data.standings || []).slice().sort(function (a, b) {
      return (b.season_points || 0) - (a.season_points || 0);
    });
    return st.slice(0, n);
  }

  var PUP_PROXY_URL = 'https://david80023216--3445f20cbd3611f19e881607ee4eb77e.web.val.run';
  var PUSH_VAL_URL = 'https://david80023216--b1c69af6c1d211f18bd01607ee4eb77e.web.val.run';
  var UPLOAD_VAL_URL = 'https://david80023216--7ebf5deac37c11f1a7fb1607ee4eb77e.web.val.run'; // trophy-hunt-uploads val (profile photo/video storage + moderation queue)
  var VAPID_PUBLIC = 'BMBS6ae4rXqMhCt7ocFlx2weaNqHlza9NrysRE02leIUKQ-LQw3K6XfFsjnyZ-ivhFFu3N8E8IEo9uAKr8PG8ec';
  // Pup Helper's AI brain lives server-side in the proxy above (2026-09-30). No API key ships in this public repo.
  var PUP_AI_FALLBACK = "Hmm, my brain's fuzzy right now! 🤖💭 Try again in a bit, or drop it in the comments of today's hunt video — the channel answers fast.";

  /* Soft funnel nudges appended to dog-care answers (2026-10-08, Shawn):
     every nudge still feeds the algorithm-neutral game without spamming. */
  var PUP_NUDGES = [
    "🐶 <em>While you're here — today's hunt is live! Comment your dog's NAME on any Gone To The Dogs video to enter.</em>",
    "📸 <em>Psst — an easy +25 pts a day: sign in, tap your name above, and upload a real photo of your dog.</em>"
  ];
  var pupNudgeIdx = 0;
  function pupNudge() {
    var n = PUP_NUDGES[pupNudgeIdx % PUP_NUDGES.length];
    pupNudgeIdx++;
    return '<br><br>' + n;
  }

  function helperAskAI(q, typingDiv) {
    var box = document.getElementById('chat-box');
    var done = function (html) {
      typingDiv.innerHTML = '<span class="chat-name">' + esc(HELPER_NAME) + '</span>' + html + pupNudge();
      if (box) box.scrollTop = box.scrollHeight;
    };
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    fetch(PUP_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: q }),
      signal: controller.signal
    }).then(function (r) { clearTimeout(timer); return r.json(); })
    .then(function (d) {
      var txt = d && d.answer;
      if (txt) { done(esc(txt).replace(/\n/g, '<br>')); }
      else { done(esc(PUP_AI_FALLBACK)); }
    }).catch(function () { clearTimeout(timer); done(esc(PUP_AI_FALLBACK)); });
  }

  function helperAnswer(q) {
    var t = (' ' + q.toLowerCase() + ' ');
    var has = function () {
      for (var i = 0; i < arguments.length; i++) {
        var w = arguments[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp('\\b' + w + '\\b').test(t)) return true;
      }
      return false;
    };
    var st = data.standings || [];

    if (has('hi', 'hello', 'hey', 'yo', 'sup', 'morning', 'evening')) {
      return "Hey hey! 🐶 I'm " + HELPER_NAME + ". Ask me about points, streaks, prizes, the shelter mission — or tap a question below!";
    }
    if (has('ned')) {
      var s = data.spotlight_today || {};
      return "🐶 Ned's our community star pup" + (s.dog_name ? " and today's spotlight!" : "!") +
        " He sits up proudly when he wins. 🏆 Think your dog can take his crown? Enter today's hunt!";
    }
    if (has('winning', 'lead', 'leading', 'ahead', 'top dog', 'first place')) {
      var top = helperTop(3);
      if (!top.length) return "No players on the board yet — be the first! Comment your dog's name on today's hunt video.";
      var lines = top.map(function (p, i) {
        return (i + 1) + '. ' + p.handle + (p.dog_name ? ' (' + p.dog_name + ')' : '') + ' — ' + p.season_points + ' pts';
      });
      return "🏆 Right now it's:<br>" + lines.join('<br>') + "<br>Ties are broken by most dog photos, then longest streak.";
    }
    if (has('standing', 'board', 'score', 'rank')) {
      var top6 = helperTop(6);
      if (!top6.length) return "The board is empty — today's hunt video is your ticket in!";
      return "📋 Season standings:<br>" + top6.map(function (p, i) {
        return (i + 1) + '. ' + p.handle + ' — ' + p.season_points + ' pts' +
          (p.streak >= 2 ? ' 🔥' + p.streak : '');
      }).join('<br>');
    }
    if (has('streak', 'streaks')) {
      return "🔥 Play every day to build a streak — any scoring day keeps it alive! Bonuses: 3 days +10 · 7 days +25 · 14 days +50 · 30 days +100. Miss a day and it resets.";
    }
    if (has('photo', 'photos', 'picture', 'pic', 'upload', 'submit')) {
      return '📸 Sign in with your YouTube handle, tap your name, and add a real photo of your dog → +25 pts every day. Real photos only — no screenshots or stock pics!';
    }
    if (has('point', 'points', 'earn', 'enter', 'entry', 'join') || (has('play') && !has('replay'))) {
      return "🐶 Easy! Comment your dog's NAME on any hunt video → +10 pts per comment, up to 3 scoring comments a day. Any other comment → +1 pt once a day. Keep names clean!";
    }
    if (has('prize', 'prizes', 'win', 'winner', 'reward', 'get if')) {
      return '👑 Monthly Top Dog wins: a dedicated video about YOUR dog + your dog on our channel banner for the month! You must be <a href="' + SUB_LINK + '" target="_blank" rel="noopener">subscribed</a> to win.';
    }
    if (has('next', 'round', 'today', 'tomorrow', 'daily', 'noon', 'hunt', 'tonight')) {
      return '🕛 Season 1 runs through October 31! Watch the countdown at the top of this page — every day counts.';
    }
    if (has('shelter', 'donat', 'mission', 'charity', 'money', 'dollar')) {
      var m = data.mission || {};
      var subs = Number(m.subscribers) || 0;
      return '🐾 Our shelter mission: we donate $1 to our local animal shelter for every subscriber — no cost to you, ever!' +
        (subs ? ' Right now: <strong>' + subs.toLocaleString('en-US') + ' subscribers = $' + subs.toLocaleString('en-US') + ' raised!</strong>' : '');
    }
    if (has('subscrib', 'follow')) {
      return '🔔 Hit that subscribe button — it adds $1 to the shelter mission AND you must be subscribed to win Top Dog! <a href="' + SUB_LINK + '" target="_blank" rel="noopener">Subscribe here</a>';
    }
    if (has('hidden', 'pup', 'easter', 'egg', 'spot')) {
      return "👀 The hidden pup is just for fun — no points for spotting it! Want points? Comment your dog's name on the video instead. 🐶";
    }
    if (has('ned')) {
      var s = data.spotlight_today || {};
      return "🐶 Ned's our community star pup" + (s.dog_name ? " and today's spotlight!" : "!") +
        " He sits up proudly when he wins. 🏆 Think your dog can take his crown? Enter today's hunt!";
    }
    if (has('thank', 'thanks', 'thx', 'love', 'cool', 'awesome')) {
      return "Aww, you're the best! 🐶💛 Tell your dog I said hi.";
    }
    if (has('bye')) {
      return "See you at noon for the next hunt! 🏆🐶";
    }
    var dogAns = helperDogFaq(t);
    if (dogAns) return dogAns + pupNudge();
    return null;
  }

  function helperAddMsg(text, who) {
    var box = document.getElementById('chat-box');
    if (!box) return;
    var div = document.createElement('div');
    div.className = 'chat-msg chat-' + who;
    if (who === 'bot') {
      div.innerHTML = '<span class="chat-name">' + esc(HELPER_NAME) + '</span>' + text;
    } else {
      div.textContent = text;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function helperAsk(q) {
    q = (q || '').trim();
    if (!q) return;
    helperAddMsg(q, 'user');
    var canned = helperAnswer(q);
    if (canned) {
      setTimeout(function () { helperAddMsg(canned, 'bot'); }, 350);
      return;
    }
    var box = document.getElementById('chat-box');
    if (!box) return;
    var div = document.createElement('div');
    div.className = 'chat-msg chat-bot';
    div.innerHTML = '<span class="chat-name">' + esc(HELPER_NAME) + '</span><span class="typing">● ● ●</span>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    helperAskAI(q, div);
  }

  function initHelper() {
    var box = document.getElementById('chat-box');
    var input = document.getElementById('chat-input');
    var send = document.getElementById('chat-send');
    var chips = document.getElementById('chat-chips');
    if (!box || !input || !send) return;
    helperAddMsg("Hey! I'm " + HELPER_NAME + " 🐶 Ask me anything about the game or dogs — or tap a question below!", 'bot');
    send.addEventListener('click', function () { helperAsk(input.value); input.value = ''; });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { helperAsk(input.value); input.value = ''; }
    });
    if (chips) {
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-q]');
        if (b) helperAsk(b.getAttribute('data-q'));
      });
    }
  }

  /* Mobile-app shell: bottom tab bar switches between the six views. */
  function initTabs() {
    var btns = document.querySelectorAll('.tabbar button');
    if (!btns.length) return;
    function show(id) {
      var views = document.querySelectorAll('.view');
      for (var i = 0; i < views.length; i++) views[i].classList.toggle('active', views[i].id === id);
      for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j].getAttribute('data-view') === id);
      if (window.scrollTo) window.scrollTo(0, 0);
    }
    for (var k = 0; k < btns.length; k++) {
      (function (b) {
        b.addEventListener('click', function () { show(b.getAttribute('data-view')); });
      })(btns[k]);
    }
    /* "Full rules" link in the How-it-works strip jumps to the Rules tab. */
    var gotoRules = document.querySelectorAll('[data-goto-rules]');
    for (var g = 0; g < gotoRules.length; g++) {
      gotoRules[g].addEventListener('click', function () { show('view-rules'); });
    }
  }

  /* Pups tab: gallery of verified player dog photos AND video clips from the
     data block. Each handle maps to an ARRAY of media items
     {src, full, name, type ("photo"|"video"), date}; the legacy single-object
     shape is still accepted. Renders ONLY what the ledger contains — never
     invents dogs. */
  function renderPupGrid() {
    var grid = document.getElementById('pup-grid');
    var empty = document.getElementById('pup-empty');
    if (!grid) return;
    var media = (data && data.dog_photos) || {};
    var handles = Object.keys(media);
    if (!handles.length) { if (empty) empty.hidden = false; return; }
    if (empty) empty.hidden = true;
    grid.innerHTML = '';
    handles.forEach(function (handle) {
      var items = media[handle];
      if (!items) return;
      if (!Array.isArray(items)) items = [items]; /* legacy single object */
      items.forEach(function (p) {
        p = p || {};
        var src = p.src || p.full || '';
        if (!src) return;
        var isVideo = (p.type === 'video');
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'pup-card' + (isVideo ? ' pup-video' : '');
        var mediaEl;
        if (isVideo) {
          mediaEl = document.createElement('video');
          mediaEl.src = src;
          mediaEl.muted = true;
          mediaEl.playsInline = true;
          mediaEl.preload = 'metadata';
          mediaEl.setAttribute('aria-label', (p.name || 'Pup') + ' video — ' + handle);
          mediaEl.onerror = function () { card.style.display = 'none'; };
          var badge = document.createElement('span');
          badge.className = 'pup-play';
          badge.textContent = '▶';
          card.appendChild(badge);
        } else {
          mediaEl = document.createElement('img');
          mediaEl.loading = 'lazy';
          mediaEl.alt = (p.name || 'Pup') + ' — ' + handle;
          mediaEl.src = src;
          mediaEl.onerror = function () { card.style.display = 'none'; };
        }
        var cap = document.createElement('div');
        cap.className = 'pup-cap';
        var nm = document.createElement('div');
        nm.className = 'pup-name';
        nm.textContent = '\uD83D\uDC36 ' + (p.name || 'Mystery pup');
        var hd = document.createElement('div');
        hd.className = 'pup-handle';
        hd.textContent = handle + (p.date ? ' · ' + p.date : '');
        cap.appendChild(nm);
        cap.appendChild(hd);
        card.insertBefore(mediaEl, card.firstChild);
        card.appendChild(cap);
        card.addEventListener('click', function () {
          var full = p.full || p.src;
          if (full) window.open(full, '_blank', 'noopener');
        });
        grid.appendChild(card);
      });
    });
  }

  /* ---- daily checklist modal (tap a player name) ---- */
  var lastCheckIdx = null;
  function openChecklist(idx) {
    var entry = (data.standings || [])[idx];
    if (!entry || !entry.checklist) return;
    lastCheckIdx = idx;
    var c = entry.checklist;
    document.getElementById('check-title').textContent = entry.handle + ' — today\'s checklist';
    document.getElementById('check-sub').textContent = c.complete
      ? (c.bonus_awarded ? 'Full clear! +' + c.bonus_points + ' bonus banked 🎉'
                         : 'Full clear! +' + c.bonus_points + ' bonus incoming…')
      : c.available + ' pts still up for grabs today';
    var html = c.items.map(function (it) {
      var note = it.note ? ' <span class="check-note">(' + esc(it.note) + ')</span>' : '';
      return '<li class="' + (it.done ? 'done' : 'pending') + '"><span class="check-mark">' +
        (it.done ? '✅' : '⭕') + '</span><span class="check-label">' + esc(it.label) + note +
        '</span><span class="check-pts">+' + it.points + '</span></li>';
    }).join('');
    html += '<li class="bonus-row ' + (c.bonus_awarded ? 'done' : 'pending') + '">' +
      '<span class="check-mark">' + (c.bonus_awarded ? '✅' : '⭐') + '</span>' +
      '<span class="check-label">Clear everything — full-day bonus</span>' +
      '<span class="check-pts">+' + c.bonus_points + '</span></li>';
    html += pushRowHtml(entry.handle, !!(c.push_bonus_awarded));
    document.getElementById('check-list').innerHTML = html;
    document.getElementById('check-overlay').hidden = false;
  }
  function closeChecklist() {
    document.getElementById('check-overlay').hidden = true;
    lastCheckIdx = null;
  }
  // Bounced here from the app frame for the one-tap alert opt-in
  // (?alerts=@handle): open that player's checklist and spotlight the button.
  function autoOpenAlerts() {
    try {
      var m = /[?&]alerts=([^&]+)/.exec(location.search);
      if (!m) return;
      var want = decodeURIComponent(m[1]).toLowerCase();
      var rows = data.standings || [];
      for (var i = 0; i < rows.length; i++) {
        if ((rows[i].handle || '').toLowerCase() === want) {
          openChecklist(i);
          if (history.replaceState) history.replaceState(null, '', location.pathname);
          setTimeout(function () {
            var b = document.querySelector('[data-push-handle]');
            if (b) {
              if (b.scrollIntoView) b.scrollIntoView({ block: 'center' });
              b.classList.add('push-flash');
            }
          }, 350);
          break;
        }
      }
    } catch (e) {}
  }
  function initChecklist() {
    var tbody = document.getElementById('rows-season');
    tbody.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.check-link') : null;
      if (btn && btn.getAttribute('data-idx') !== null) {
        openChecklist(parseInt(btn.getAttribute('data-idx'), 10));
      }
    });
    document.getElementById('check-close').addEventListener('click', closeChecklist);
    document.getElementById('check-overlay').addEventListener('click', function (ev) {
      if (ev.target.id === 'check-overlay') closeChecklist();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeChecklist();
    });
  }

  /* ---- push notifications: installable-app alerts + 50 pt opt-in ---- */
  function urlB64ToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(s + '==='.slice((s.length + 3) % 4));
    var b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }
  function initPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }
  function pushState(handle) {
    try { return localStorage.getItem('th-push-' + handle) || ''; } catch (e) { return ''; }
  }
  function setPushState(handle, v) {
    try { localStorage.setItem('th-push-' + handle, v); } catch (e) {}
  }
  function pushRowHtml(handle, awarded) {
    if (awarded) {
      return '<li class="bonus-row done"><span class="check-mark">🔔</span>' +
        '<span class="check-label">Show alerts on — +50 bonus banked</span>' +
        '<span class="check-pts">+50</span></li>';
    }
    var st = pushState(handle);
    if (st === 'on') {
      return '<li class="bonus-row done"><span class="check-mark">🔔</span>' +
        '<span class="check-label">Show alerts on — +50 bonus banked</span>' +
        '<span class="check-pts">+50</span></li>';
    }
    if (st === 'pending') {
      return '<li class="bonus-row pending"><span class="check-mark">🔔</span>' +
        '<span class="check-label">Alerts requested — +50 lands on next board refresh</span>' +
        '<span class="check-pts">+50</span></li>';
    }
    // Interim state while the player finishes the opt-in in the new tab
    // (prevents the framed double-tap loop).
    try {
      if (sessionStorage.getItem('th-pushtab-' + handle) && st !== 'on' && !awarded) {
        return '<li class="bonus-row pending"><span class="check-mark">🔔</span>' +
          '<span class="check-label">Finish in the new tab — +50 lands on next board refresh</span>' +
          '<span class="check-pts">+50</span></li>';
      }
    } catch (e) {}
    return '<li class="bonus-row pending"><span class="check-mark">🔔</span>' +
      '<span class="check-label">Get show alerts on this device</span>' +
      '<span class="check-pts">+50</span>' +
      '<button class="push-btn" data-push-handle="' + esc(handle) + '">Turn on</button></li>';
  }
  function initPushButtons() {
    document.getElementById('check-list').addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('[data-push-handle]') : null;
      if (!btn) return;
      optInPush(btn.getAttribute('data-push-handle'), btn);
    });
  }
  var liveVapidKey = null;
  var DIRECT_URL = 'https://david80023216.github.io/trophy-hunt-leaderboard/';
  function isFramed() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function getVapidKey() {
    if (liveVapidKey) return Promise.resolve(liveVapidKey);
    if (PUSH_VAL_URL.indexOf('PLACEHOLDER') >= 0) return Promise.resolve(VAPID_PUBLIC);
    return fetch(PUSH_VAL_URL + '/').then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.vapid_public) liveVapidKey = j.vapid_public;
        return liveVapidKey || VAPID_PUBLIC;
      }).catch(function () { return VAPID_PUBLIC; });
  }
  function optInPush(handle, btn) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      btn.textContent = 'Not supported'; btn.disabled = true; return;
    }
    if (PUSH_VAL_URL.indexOf('PLACEHOLDER') >= 0) {
      btn.textContent = 'Coming soon'; btn.disabled = true; return;
    }
    // Chrome/Firefox block the notification permission prompt inside
    // cross-origin iframes (the app-frame leaderboard). Bounce the player to
    // the direct address for the one-tap opt-in; the subscription is
    // per-origin so it carries straight back to the frame.
    if (isFramed() && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      var flag = 'th-pushtab-' + handle;
      try {
        if (sessionStorage.getItem(flag)) { btn.textContent = 'Check the new tab'; return; }
        sessionStorage.setItem(flag, '1');
      } catch (e) {}
      window.open(DIRECT_URL + '?alerts=' + encodeURIComponent(handle), '_blank');
      btn.textContent = 'Continue in the new tab'; btn.disabled = true; return;
    }
    btn.textContent = 'Requesting…'; btn.disabled = true;
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { btn.textContent = 'Blocked — allow notifications for this site in your browser settings, then tap Turn on again'; return; }
      return getVapidKey().then(function (vk) {
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.getSubscription().then(function (existing) {
            if (existing) return existing;
            return reg.pushManager.subscribe({ userVisibleOnly: true,
              applicationServerKey: urlB64ToBytes(vk) });
          });
        });
      }).then(function (sub) {
        return fetch(PUSH_VAL_URL + '/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: handle, subscription: sub.toJSON() }),
        }).then(function (r) { return r.json(); });
      }).then(function (res) {
        if (res && res.ok) { setPushState(handle, 'pending'); }
        else { btn.textContent = 'Try again'; btn.disabled = false; return; }
        var li = btn.closest('li'); if (li) li.outerHTML = pushRowHtml(handle, false);
        // The opt-in tab exists only for the permission step: confirm, then close it.
        if (/[?&]alerts=/.test(location.search)) {
          var ov = document.createElement('div');
          ov.setAttribute('style', 'position:fixed;inset:0;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-size:18px;z-index:9999;');
          ov.textContent = "You're in! Show alerts are on — +50 lands on the next board refresh. This tab will close.";
          document.body.appendChild(ov);
          setTimeout(function () { window.close(); }, 2500);
        }
      }).catch(function () { btn.textContent = 'Try again'; btn.disabled = false; });
    });
  }

  /* ---- floating trick pup (2026-10-08, Shawn): tap for a random trick ---- */
  function initDogTricks() {
    var btn = document.getElementById('dog-trick-btn');
    var bubble = document.getElementById('dog-bubble');
    if (!btn || !bubble) return;
    var audioCtx = null;
    function barkSound() {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        var t0 = audioCtx.currentTime;
        [0, 0.18].forEach(function (off) {
          var o = audioCtx.createOscillator();
          var g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(420, t0 + off);
          o.frequency.exponentialRampToValueAtTime(140, t0 + off + 0.14);
          g.gain.setValueAtTime(0.0001, t0 + off);
          g.gain.exponentialRampToValueAtTime(0.25, t0 + off + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.15);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(t0 + off); o.stop(t0 + off + 0.16);
        });
      } catch (e) { /* audio unavailable: stay silent */ }
    }
    var tricks = [
      { anim: 'trick-bark', say: 'Woof woof! 🐾', sound: true },
      { anim: '', say: '*sits politely* 🎖️' },
      { anim: 'trick-roll', say: '*rolls over!* 🌀' },
      { anim: 'trick-spin', say: '*does a spin!* ✨' },
      { anim: 'trick-jump', say: '*jumps for joy!* 🎉' },
      { anim: '', say: '*begs for a treat* 🦴' },
      { anim: 'trick-nap', say: '*takes a quick nap…* 💤' }
    ];
    var last = -1, hideT = null;
    btn.addEventListener('click', function () {
      var i;
      do { i = Math.floor(Math.random() * tricks.length); } while (i === last);
      last = i;
      var tr = tricks[i];
      btn.classList.remove('trick-bark', 'trick-roll', 'trick-spin', 'trick-jump', 'trick-nap');
      void btn.offsetWidth; /* restart the animation */
      if (tr.anim) btn.classList.add(tr.anim);
      bubble.textContent = tr.say;
      bubble.hidden = false;
      if (tr.sound) barkSound();
      clearTimeout(hideT);
      hideT = setTimeout(function () { bubble.hidden = true; }, 2600);
    });
  }

  renderSpotlight();
  renderMission();
  initHelper();
  initDogTricks();
  renderDogFact();
  tickCountdown();
  setInterval(tickCountdown, 1000);
  renderStandings();
  renderHistory();
  initGoogleSignIn();
  initNameClaim();
  initProfile();
  initUploads();
  renderVideos();
  initTabs();
  renderPupGrid();
  initChecklist();
  initPush();
  initPushButtons();
  autoOpenAlerts();
  // When the player returns from the opt-in tab, refresh the open checklist
  // so the new alert state shows without reopening it.
  window.addEventListener('focus', function () {
    if (lastCheckIdx !== null && !document.getElementById('check-overlay').hidden) {
      openChecklist(lastCheckIdx);
    }
  });
})();
