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

  function rowHtml(entry, rank) {
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
    var today = entry.today_points ? ' <span class="today">+' + entry.today_points + ' today</span>' : '';
    return '<tr data-handle="' + esc(entry.handle.toLowerCase()) + '">' +
      '<td class="rank">' + rankBadge(rank) + '</td>' +
      '<td><span class="player-cell">' + avatar +
        '<span class="player-name">' + esc(entry.handle) + '</span></span></td>' +
      '<td><span class="player-cell">' + dogCell + '</span></td>' +
      '<td>' + streakHtml(entry.streak) + '</td>' +
      '<td class="points">' + entry.season_points + ' pts' + today + '</td>' +
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
      return rowHtml(e, rank);
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
    document.getElementById('history-board').hidden = false;
    var tbody = document.getElementById('rows-history');
    tbody.innerHTML = hist.slice().reverse().map(function (h) {
      return '<tr><td>' + esc(h.date || '') + '</td><td>🐶 ' + esc(h.dog_name || '—') +
        '</td><td>' + esc(h.handle || '') + '</td></tr>';
    }).join('');
  }

  function watchUrl(v) {
    // Deep-link straight to the pinned comment when we know its ID (&lc=);
    // otherwise fall back to the video page. There is no URL that opens the
    // generic comment section — &lc= only works with a real comment ID.
    var u = 'https://www.youtube.com/watch?v=' + encodeURIComponent(v.video_id);
    if (v.comment_id) u += '&lc=' + encodeURIComponent(v.comment_id);
    return u;
  }

  function renderVideos() {
    var vids = data.videos || [];
    var sec = document.getElementById('watch');
    if (!sec || !vids.length) return;
    sec.hidden = false;
    function setFeatured(v) {
      var player = document.getElementById('featured-player');
      player.src = 'https://www.youtube.com/embed/' + encodeURIComponent(v.video_id) + '?rel=0';
      document.getElementById('featured-title').textContent =
        '📺 ' + (v.title || ('Day ' + v.day)) + (v.date ? ' · ' + v.date : '');
      document.getElementById('featured-comment').href = watchUrl(v);
    }
    setFeatured(vids[0]);
    var grid = document.getElementById('video-grid');
    function cardHTML(v, i) {
      var label = v.title || ('Day ' + v.day);
      return '<div class="video-card">' +
        '<button type="button" class="video-thumb" data-idx="' + i + '" aria-label="Play ' + esc(label) + '">' +
          '<img src="https://i.ytimg.com/vi/' + esc(v.video_id) + '/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
        '</button>' +
        '<div class="video-meta"><span class="video-label">' + esc(label) + '</span>' +
        '<a class="video-comment" href="' + esc(watchUrl(v)) + '" target="_blank" rel="noopener">💬 Score</a></div>' +
      '</div>';
    }
    grid.innerHTML = vids.map(cardHTML).join('');
    grid.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('.video-thumb') : null;
      if (!btn) return;
      var v = vids[Number(btn.getAttribute('data-idx'))];
      if (v) { setFeatured(v); sec.scrollIntoView(); }
    });
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

  renderSpotlight();
  renderStandings();
  renderHistory();
  renderVideos();
})();
