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
    var hasDog = !!(entry.dog_name || (dog && dog.src));
    var hasStreak = (Number(entry.streak) || 0) >= 1;
    var line2 = (hasDog ? dogCell : '') +
      (hasStreak ? '<span class="streak-inline">' + streakHtml(entry.streak) + '</span>' : '');
    if (!line2) line2 = '—';
    return '<tr data-handle="' + esc(entry.handle.toLowerCase()) + '">' +
      '<td class="rank">' + rankBadge(rank) + '</td>' +
      '<td class="player"><span class="player-cell">' + avatar +
        '<span class="player-name">' + esc(entry.handle) + '</span></span></td>' +
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
  function tickCountdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var now = new Date();
    var chi = new Date(now.toLocaleString('en-US', {timeZone: 'America/Chicago'}));
    var target = new Date(chi);
    target.setHours(12, 0, 0, 0);
    if (chi >= target) target.setDate(target.getDate() + 1);
    var diff = Math.max(0, target - chi);
    var h = Math.floor(diff / 3600000);
    var m = Math.floor(diff % 3600000 / 60000);
    var s = Math.floor(diff % 60000 / 1000);
    el.textContent = '\u23F3 Next Trophy Hunt drops in ' + h + 'h ' + m + 'm ' + s + 's';
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

  renderSpotlight();
  renderMission();
  renderDogFact();
  tickCountdown();
  setInterval(tickCountdown, 1000);
  renderStandings();
  renderHistory();
})();
