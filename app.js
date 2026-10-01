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

  /* ---- Pup Helper: rule-based FAQ bot. Answers ONLY from the page's
     own live data (th-data) plus the printed rules. Never invents points,
     players, or standings. Anything else -> video comments. ---- */
  var HELPER_NAME = "Pup Helper";
  var PLAYLIST = 'https://www.youtube.com/playlist?list=PLXRC36_9f9gA';
  var SUB_LINK = 'https://www.youtube.com/channel/UC4ghQwAZYqXrp6o5o-ZHn-Q?sub_confirmation=1';
  var PHOTO_FORM = 'https://forms.gle/HEtMitfJZLq7NQPL9';

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

  var GEMINI_KEY = ''; // AI fallback DISABLED: API keys must never ship in this public repo (2026-09-30, key removed). Rule-based FAQ answers; misses get PUP_AI_FALLBACK.
  var GEMINI_MODEL = 'gemini-flash-lite-latest';
  var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_KEY;
  var PUP_SYSTEM = "You are Pup Helper, the friendly chatbot on the Gone To The Dogs Trophy Hunt leaderboard page. Answer questions about the Trophy Hunt dog contest and about real dog care. Keep answers short (1-3 sentences), warm and playful, no hashtags, plain text only (no HTML or markdown). For dog health questions give general info but always say to check with their vet. If asked about current standings, scores, or who is winning, say you don't have live scores and to check the leaderboard table on the page — never invent player names, points, or results. If asked something unrelated to dogs or the contest, politely steer back to dogs.";
  var PUP_AI_FALLBACK = "Hmm, my brain's fuzzy right now! 🤖💭 Try again in a bit, or drop it in the comments of today's hunt video — the channel answers fast.";
  var pupHistory = [];

  function helperAskAI(q, typingDiv) {
    var box = document.getElementById('chat-box');
    var done = function (html) {
      typingDiv.innerHTML = '<span class="chat-name">' + esc(HELPER_NAME) + '</span>' + html;
      if (box) box.scrollTop = box.scrollHeight;
    };
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    pupHistory.push({ role: 'user', parts: [{ text: q }] });
    if (pupHistory.length > 6) pupHistory = pupHistory.slice(pupHistory.length - 6);
    fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: PUP_SYSTEM }] },
        contents: pupHistory.slice(),
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
      }),
      signal: controller.signal
    }).then(function (r) { clearTimeout(timer); return r.json(); })
    .then(function (d) {
      var c = d && d.candidates && d.candidates[0];
      var txt = c && c.content && c.content.parts && c.content.parts[0] && c.content.parts[0].text;
      if (txt) {
        pupHistory.push({ role: 'model', parts: [{ text: txt }] });
        done(esc(txt).replace(/\n/g, '<br>'));
      } else { done(esc(PUP_AI_FALLBACK)); }
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
      return '📸 Submit a real photo of your dog <a href="' + PHOTO_FORM + '" target="_blank" rel="noopener">through this form</a> → +5 pts every day. Real photos only — no screenshots or stock pics!';
    }
    if (has('point', 'points', 'earn', 'enter', 'entry', 'join') || (has('play') && !has('replay'))) {
      return "🐶 Easy! Comment your dog's NAME on any hunt video → +10 pts per comment, up to 3 scoring comments a day. Any other comment → +1 pt once a day. Keep names clean!";
    }
    if (has('prize', 'prizes', 'win', 'winner', 'reward', 'get if')) {
      return '👑 Monthly Top Dog wins: a dedicated video about YOUR dog + your dog on our channel banner for the month! You must be <a href="' + SUB_LINK + '" target="_blank" rel="noopener">subscribed</a> to win.';
    }
    if (has('next', 'round', 'today', 'tomorrow', 'daily', 'noon', 'hunt', 'tonight')) {
      return '🕛 A new Trophy Hunt drops every day at 12:00 PM Central! Watch for the countdown at the top of this page.';
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
    if (dogAns) return dogAns;
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

  renderSpotlight();
  renderMission();
  initHelper();
  renderDogFact();
  tickCountdown();
  setInterval(tickCountdown, 1000);
  renderStandings();
  renderHistory();
})();
