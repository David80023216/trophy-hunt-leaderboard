/* Trophy Hunt Daily leaderboard renderer.
   Renders ONLY what the #th-data block contains — never invent players. */
(function () {
  'use strict';

  var dataEl = document.getElementById('th-data');
  var data = {};
  try { data = JSON.parse(dataEl.textContent || '{}'); } catch (e) { data = {}; }

  var SECTIONS = [
    { key: 'daily',   labelId: 'label-daily' },
    { key: 'weekly',  labelId: 'label-weekly' },
    { key: 'monthly', labelId: 'label-monthly' },
    { key: 'all_time', labelId: null }
  ];

  function standingsFor(key) {
    var sec = data[key];
    if (!sec) return { label: '', rows: [] };
    // daily/weekly/monthly are {label, standings}; all_time is a plain dict
    var map = sec.standings ? sec.standings : sec;
    var label = sec.label || '';
    var rows = Object.keys(map).map(function (handle) {
      return { handle: handle, points: Number(map[handle]) || 0 };
    });
    rows.sort(function (a, b) { return b.points - a.points; });
    return { label: label, rows: rows };
  }

  function rankBadge(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return String(rank);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rowHtml(entry, rank) {
    var avatar = (data.avatars && data.avatars[entry.handle]) || '';
    var streak = (data.streaks && data.streaks[entry.handle]) || 0;
    var streakHtml = streak >= 2 ? '<span class="streak">🔥' + streak + '</span>' : '';
    var imgHtml = avatar
      ? '<img src="' + esc(avatar) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '';
    var dog = (data.dog_photos && data.dog_photos[entry.handle]) || null;
    var dogHtml = dog && dog.src
      ? '<img class="dog-thumb" src="' + esc(dog.src) + '" data-full="' + esc(dog.full || dog.src) + '" alt="' + esc(dog.name || 'dog') + '" loading="lazy" title="Click to expand — ' + esc(dog.name || 'player dog') + ' 🐶" onerror="this.style.display=\'none\'">'
      : '';
    return '<tr data-handle="' + esc(entry.handle.toLowerCase()) + '">' +
      '<td class="rank">' + rankBadge(rank) + '</td>' +
      '<td><span class="player-cell">' + imgHtml +
        '<span class="player-name">' + esc(entry.handle) + '</span>' + streakHtml +
        '<a class="row-photo-btn" href="https://forms.gle/HEtMitfJZLq7NQPL9" target="_blank" rel="noopener" title="Submit your dog\'s photo — +5 pts daily!">📸</a>' +
        dogHtml +
      '</span></td>' +
      '<td class="points">' + entry.points + ' pts</td>' +
    '</tr>';
  }

  function renderAll() {
    SECTIONS.forEach(function (sec) {
      var res = standingsFor(sec.key);
      var tbody = document.getElementById('rows-' + sec.key);
      if (!tbody) return;
      tbody.innerHTML = res.rows.map(function (e, i) { return rowHtml(e, i + 1); }).join('');
      if (sec.labelId) {
        var labelEl = document.getElementById(sec.labelId);
        if (labelEl && res.label) labelEl.textContent = '· ' + res.label;
      }
    });
    applySearch();
  }

  function applySearch() {
    var q = (document.getElementById('player-search').value || '').trim().toLowerCase();
    SECTIONS.forEach(function (sec) {
      var tbody = document.getElementById('rows-' + sec.key);
      var emptyMsg = document.getElementById('empty-' + sec.key);
      if (!tbody) return;
      var visible = 0;
      Array.prototype.forEach.call(tbody.rows, function (tr) {
        var hit = !q || tr.getAttribute('data-handle').indexOf(q) !== -1;
        tr.style.display = hit ? '' : 'none';
        if (hit) visible++;
      });
      if (emptyMsg) emptyMsg.hidden = visible > 0;
    });
  }

  function renderSnapshot() {
    var el = document.getElementById('snapshot');
    if (!data.updated_at) { el.textContent = 'Standings loading…'; return; }
    try {
      var d = new Date(data.updated_at);
      var fmt = d.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      });
      el.textContent = 'Snapshot updated ' + fmt + ' CT — verified claims only.';
    } catch (e) {
      el.textContent = 'Snapshot updated ' + data.updated_at + ' — verified claims only.';
    }
  }

  document.getElementById('player-search').addEventListener('input', applySearch);

  // Dog photo lightbox: click a .dog-thumb to expand, click anywhere to close.
  var lightbox = null;
  function showDogPhoto(src, name) {
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'dog-lightbox';
      lightbox.innerHTML = '<img alt="">';
      lightbox.addEventListener('click', function () {
        lightbox.classList.remove('open');
      });
      document.body.appendChild(lightbox);
    }
    var img = lightbox.querySelector('img');
    img.src = src;
    img.alt = name || 'player dog';
    lightbox.classList.add('open');
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('dog-thumb')) {
      e.preventDefault();
      showDogPhoto(t.getAttribute('data-full') || t.src, t.alt);
    }
  });

  renderSnapshot();
  renderAll();
})();
