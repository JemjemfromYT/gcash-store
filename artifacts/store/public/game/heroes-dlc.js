// ==============================================================
// NEURAL SURVIVAL — HEROES DLC PATCH
// Adds 6 paid heroes (justin, jian, joseph, jaballas, joshua,
// jazmine), a Profile (Name+PIN) system that authenticates with
// the backend, server-side unlock state per-profile, and PayMongo
// checkout (₱29 per hero). Locked heroes pop the profile/buy
// modal when clicked. Heroes work in Classic, God, and Multiplayer
// modes (combat hooks added below).
// ==============================================================
(function(){
  'use strict';

  // Locate the API origin. Game is served from /game/ on the same
  // host as the API, so /api/* resolves correctly.
  const API_BASE = '/api';

  // ---------- SVG portrait generator (no external image needed) ----------
  function svgPortrait(label, color){
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="g" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.95"/>
      <stop offset="60%" stop-color="${color}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#05030d" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${color}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <circle cx="128" cy="118" r="64" fill="none" stroke="${color}" stroke-width="3" opacity="0.6"/>
  <circle cx="128" cy="118" r="78" fill="none" stroke="${color}" stroke-width="1" opacity="0.35"/>
  <text x="128" y="140" text-anchor="middle" font-family="Orbitron, monospace" font-size="48" font-weight="900" fill="url(#t)">${label}</text>
  <text x="128" y="220" text-anchor="middle" font-family="monospace" font-size="14" fill="${color}" opacity="0.85">NEURAL.OPERATIVE</text>
</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // ---------- New hero definitions ----------
  const NEW_HEROES = {
    justin: {
      name: 'Justin', role: 'Mage Summoner',
      img: 'images/heroes/justin.jpg',
      hp: 110, speed: 210, dmg: 28, atkCd: 0.55, range: 480,
      abi: 'Spirit Beasts', abiCd: 12, color: '#b48fff',
      desc: 'Long-range arcane bolts that pierce. Q summons a swirling pack of spirit beasts that orbit and strike enemies.'
    },
    jian: {
      name: 'Jian', role: 'Laser Lance',
      img: 'images/heroes/jian.jpg',
      hp: 95, speed: 225, dmg: 55, atkCd: 0.55, range: 540,
      abi: 'Overcharge', abiCd: 9, color: '#22e8ff',
      desc: 'Hitscan laser lance — instant beam to your aim. Q overcharges into a wide, piercing megabeam.'
    },
    joseph: {
      name: 'Joseph', role: 'Reaper',
      img: 'images/heroes/joseph.jpg',
      hp: 170, speed: 215, dmg: 48, atkCd: 0.55, range: 90,
      abi: 'Soul Harvest', abiCd: 8, color: '#a020f0',
      desc: 'Heavy melee scythe with a wide cleave arc. Q rips souls from all nearby enemies, healing for each kill.'
    },
    jaballas: {
      name: 'Jaballas', role: 'Shotgunner',
      img: 'images/heroes/jaballas.jpg',
      hp: 140, speed: 210, dmg: 16, atkCd: 0.65, range: 300,
      abi: 'Slug Round', abiCd: 7, color: '#ff5577',
      desc: '6-pellet shotgun spread shreds at close range. Q fires a heavy slug round that pierces every enemy in a line.'
    },
    joshua: {
      name: 'Joshua', role: 'Marksman Archer',
      img: 'images/heroes/joshua.jpg',
      hp: 100, speed: 230, dmg: 78, atkCd: 0.7, range: 760,
      abi: 'Arrow Volley', abiCd: 9, color: '#3dffb0',
      desc: 'Long-range high-damage arrows. Q rains a 12-arrow volley around your aim point.'
    },
    jazmine: {
      name: 'Jazmine', role: 'Plasma Witch',
      img:'images/heroes/jazmine.jpg',
      hp: 100, speed: 220, dmg: 22, atkCd: 0.12, range: 460,
      abi: 'Plasma Storm', abiCd: 8, color: '#ff80df',
      desc: 'Rapid-fire plasma orbs at incredible attack speed. Q releases a 16-orb plasma storm in a wide ring.'
    },
  };

  const LOCKED_IDS = Object.keys(NEW_HEROES); // all 6 are paid
  const HERO_PRICE_PHP = 29;

  // Inject heroes into game's HEROES dict + HERO_IDS list.
  Object.assign(HEROES, NEW_HEROES);
  for (const id of LOCKED_IDS) if (!HERO_IDS.includes(id)) HERO_IDS.push(id);

  // ---------- Profile state ----------
  // localStorage keys
  const LS_PROFILE_NAME = 'ns_profile_name';
  const LS_PROFILE_PIN  = 'ns_profile_pin'; // user explicitly OK with insecure local storage
  const LS_UNLOCKED     = 'ns_unlocked_heroes';

  const profile = {
    name: localStorage.getItem(LS_PROFILE_NAME) || '',
    pin:  localStorage.getItem(LS_PROFILE_PIN)  || '',
    unlocked: new Set(JSON.parse(localStorage.getItem(LS_UNLOCKED) || '[]')),
  };

  function saveProfile(){
    if (profile.name) localStorage.setItem(LS_PROFILE_NAME, profile.name);
    if (profile.pin)  localStorage.setItem(LS_PROFILE_PIN,  profile.pin);
    localStorage.setItem(LS_UNLOCKED, JSON.stringify([...profile.unlocked]));
  }

  function isLocked(heroId){
    if (!LOCKED_IDS.includes(heroId)) return false;
    return !profile.unlocked.has(heroId);
  }

  async function apiLogin(name, pin){
    const r = await fetch(API_BASE + '/profile/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Login failed');
    return j; // { name, unlockedHeroes }
  }

  async function apiCheckout(name, pin, heroId){
    const r = await fetch(API_BASE + '/heroes/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin, heroId }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Checkout failed');
    return j; // { checkoutUrl }
  }

  async function apiUnlock(name, pin, heroId){
    const r = await fetch(API_BASE + '/heroes/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin, heroId }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Unlock failed');
    return j;
  }

  function applyUnlocksFromServer(list){
    profile.unlocked = new Set(list || []);
    saveProfile();
    if (typeof renderHeroGrid === 'function' && state.scene === 'heroSelect') {
      try { renderHeroGrid(); } catch(_){}
    }
  }

  // ---------- Profile / Buy modal (injected) ----------
  const modalCss = `
  .ns-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.72); backdrop-filter:blur(6px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:24px; }
  .ns-modal { background:linear-gradient(180deg, rgba(20,14,48,.95), rgba(10,8,28,.95)); border:1px solid rgba(157,92,255,.55); border-radius:16px; padding:24px; max-width:420px; width:100%; color:#e7e3ff; font-family:ui-monospace,Menlo,Consolas,monospace; box-shadow:0 0 60px rgba(157,92,255,.35); }
  .ns-modal h2 { font-family:'Orbitron',monospace; letter-spacing:.18em; text-transform:uppercase; margin:0 0 6px; background:linear-gradient(90deg,#22e8ff,#9d5cff 50%,#ff2bd6); -webkit-background-clip:text; background-clip:text; color:transparent; font-size:20px; }
  .ns-modal p { color:#8a85b8; margin:0 0 14px; font-size:13px; line-height:1.5; }
  .ns-modal label { display:block; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#22e8ff; margin:10px 0 4px; }
  .ns-modal input { width:100%; background:rgba(0,0,0,.45); border:1px solid rgba(157,92,255,.35); color:#e7e3ff; padding:10px 12px; border-radius:8px; font-family:inherit; letter-spacing:.08em; font-size:14px; }
  .ns-modal .ns-actions { display:flex; gap:8px; margin-top:18px; }
  .ns-modal button { flex:1; appearance:none; border:1px solid rgba(34,232,255,.5); background:linear-gradient(180deg,rgba(34,232,255,.12),rgba(157,92,255,.12)); color:#e7e3ff; padding:11px 14px; border-radius:10px; cursor:pointer; font-family:inherit; font-weight:700; letter-spacing:.12em; text-transform:uppercase; font-size:12px; }
  .ns-modal button.primary { border-color:rgba(255,43,214,.6); background:linear-gradient(180deg,rgba(255,43,214,.22),rgba(157,92,255,.22)); }
  .ns-modal button.ghost { background:transparent; border-color:rgba(231,227,255,.25); }
  .ns-modal button:disabled { opacity:.5; cursor:not-allowed; }
  .ns-modal .ns-err { color:#ff3d6a; font-size:12px; margin-top:8px; min-height:16px; }
  .ns-modal .ns-hero-card { display:flex; gap:12px; align-items:center; padding:10px; border:1px solid rgba(157,92,255,.3); border-radius:10px; background:rgba(0,0,0,.3); margin-bottom:12px; }
  .ns-modal .ns-hero-card img { width:64px; height:64px; border-radius:8px; object-fit:cover; }
  .ns-modal .ns-hero-card .meta h3 { margin:0; font-family:'Orbitron',monospace; letter-spacing:.1em; font-size:14px; }
  .ns-modal .ns-hero-card .meta div { color:#22e8ff; font-size:11px; letter-spacing:.18em; text-transform:uppercase; margin-top:2px; }
  .ns-modal .ns-price { color:#ffd166; font-weight:900; font-size:24px; font-family:'Orbitron',monospace; text-align:center; padding:12px; border:1px dashed rgba(255,209,102,.5); border-radius:10px; margin:8px 0; }
  .hero-card.locked-card { position:relative; }
  .hero-card.locked-card::after { content:'🔒 ₱29'; position:absolute; top:8px; right:8px; background:rgba(0,0,0,.85); color:#ffd166; padding:4px 8px; border-radius:6px; font-size:11px; letter-spacing:.12em; border:1px solid rgba(255,209,102,.5); font-weight:900; }
  .hero-card.locked-card img { filter:grayscale(.7) brightness(.6); }
  `;
  const styleTag = document.createElement('style');
  styleTag.textContent = modalCss;
  document.head.appendChild(styleTag);

  let modalEl = null;
  function closeModal(){
    if (modalEl){ modalEl.remove(); modalEl = null; }
  }
  function openModal(html){
    closeModal();
    modalEl = document.createElement('div');
    modalEl.className = 'ns-modal-bg';
    modalEl.innerHTML = `<div class="ns-modal">${html}</div>`;
    modalEl.addEventListener('click', (e)=>{ if (e.target === modalEl) closeModal(); });
    document.body.appendChild(modalEl);
    return modalEl.querySelector('.ns-modal');
  }

  function showProfileModal(heroId){
    const h = HEROES[heroId];
    const heroCard = `
      <div class="ns-hero-card">
        <img src="${h.img}" alt="${h.name}"/>
        <div class="meta">
          <h3 style="color:${h.color}">${h.name}</h3>
          <div>${h.role}</div>
        </div>
      </div>`;

    if (!profile.name || !profile.pin){
      // first-time: ask for Name + PIN
      const inner = openModal(`
        <h2>Create Profile</h2>
        <p>To unlock <b style="color:${h.color}">${h.name}</b>, create a profile with a name and PIN. Your PIN is saved securely on the server — your unlocked heroes follow your name + PIN across devices.</p>
        ${heroCard}
        <label for="ns-name">Name</label>
        <input id="ns-name" type="text" maxlength="24" placeholder="Pick any name"/>
        <label for="ns-pin">PIN (4–8 digits)</label>
        <input id="ns-pin" type="password" inputmode="numeric" maxlength="8" placeholder="••••"/>
        <div class="ns-err" id="ns-err"></div>
        <div class="ns-actions">
          <button class="ghost" id="ns-cancel">Cancel</button>
          <button class="primary" id="ns-submit">Continue</button>
        </div>
      `);
      const nameInput = inner.querySelector('#ns-name');
      const pinInput  = inner.querySelector('#ns-pin');
      const errEl     = inner.querySelector('#ns-err');
      nameInput.value = state.username || '';
      nameInput.focus();
      inner.querySelector('#ns-cancel').onclick = closeModal;
      inner.querySelector('#ns-submit').onclick = async ()=>{
        errEl.textContent = '';
        const n = nameInput.value.trim();
        const p = pinInput.value.trim();
        if (!n) { errEl.textContent = 'Enter a name.'; return; }
        if (!/^\d{4,8}$/.test(p)) { errEl.textContent = 'PIN must be 4-8 digits.'; return; }
        inner.querySelector('#ns-submit').disabled = true;
        try {
          const data = await apiLogin(n, p);
          profile.name = data.name; profile.pin = p;
          applyUnlocksFromServer(data.unlockedHeroes);
          showBuyModal(heroId);
        } catch (e){
          errEl.textContent = e.message || 'Failed.';
          inner.querySelector('#ns-submit').disabled = false;
        }
      };
    } else {
      showBuyModal(heroId);
    }
  }

  function showBuyModal(heroId){
    const h = HEROES[heroId];
    if (profile.unlocked.has(heroId)){
      // Already unlocked — just select.
      state.hero = heroId; localStorage.setItem('ns_hero', heroId);
      closeModal();
      try { renderHeroGrid(); } catch(_){}
      return;
    }
    const heroCard = `
      <div class="ns-hero-card">
        <img src="${h.img}" alt="${h.name}"/>
        <div class="meta">
          <h3 style="color:${h.color}">${h.name}</h3>
          <div>${h.role}</div>
        </div>
      </div>`;
    const inner = openModal(`
      <h2>Unlock ${h.name}</h2>
      <p>Signed in as <b style="color:${h.color}">${profile.name}</b>. Pay once to unlock — the hero stays unlocked on your profile forever.</p>
      ${heroCard}
      <p style="margin:0 0 6px;">${h.desc}</p>
      <div class="ns-price">₱${HERO_PRICE_PHP}.00 PHP</div>
      <div class="ns-err" id="ns-err"></div>
      <div class="ns-actions">
        <button class="ghost" id="ns-cancel">Maybe later</button>
        <button class="primary" id="ns-pay">Pay with GCash / Card</button>
      </div>
      <div style="margin-top:12px; text-align:center;"><button class="ghost" id="ns-switch" style="font-size:10px; padding:6px 10px;">Switch profile</button></div>
    `);
    inner.querySelector('#ns-cancel').onclick = closeModal;
    inner.querySelector('#ns-switch').onclick = ()=>{
      profile.name = ''; profile.pin = '';
      localStorage.removeItem(LS_PROFILE_NAME);
      localStorage.removeItem(LS_PROFILE_PIN);
      profile.unlocked = new Set();
      saveProfile();
      showProfileModal(heroId);
    };
    inner.querySelector('#ns-pay').onclick = async ()=>{
      const errEl = inner.querySelector('#ns-err');
      errEl.textContent = '';
      inner.querySelector('#ns-pay').disabled = true;
      try {
        const { checkoutUrl } = await apiCheckout(profile.name, profile.pin, heroId);
        window.location.href = checkoutUrl;
      } catch (e){
        errEl.textContent = e.message || 'Checkout failed.';
        inner.querySelector('#ns-pay').disabled = false;
      }
    };
  }

  // ---------- Hijack renderHeroGrid to add lock badges + lock click handler ----------
  const _origRender = renderHeroGrid;
  renderHeroGrid = function(){
    _origRender();
    // Annotate locked cards
    const grid = document.getElementById('heroGrid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.hero-card');
    cards.forEach((card, idx)=>{
      const id = HERO_IDS[idx];
      if (!id) return;
      if (LOCKED_IDS.includes(id) && !profile.unlocked.has(id)){
        card.classList.add('locked-card');
        // Replace click handler
        card.onclick = (ev)=>{
          ev.preventDefault();
          ev.stopPropagation();
          showProfileModal(id);
        };
      }
    });
  };

  // ---------- Combat hooks ----------
  // Wrap doAttack and doAbility to add new heroes' implementations.
  // Existing global helpers used: spawnBullet, damageEnemy, particles, shake,
  // SFX, canAuthorEnemies, queueAction, state.fx, state.enemies, state.arena.
  const _origDoAttack = doAttack;
  doAttack = function(p){
    if (!NEW_HEROES[p.heroId]) return _origDoAttack(p);
    const h = HEROES[p.heroId];
    p.atkCd = h.atkCd / p.mods.atkSpd;
    try { SFX.fire(p.heroId); } catch(_){}
    const dmg = h.dmg * p.mods.dmg;
    const range = h.range * p.mods.range;
    const ang = p.angle;
    const authoritative = canAuthorEnemies();
    queueAction({ t:'atk', a:+ang.toFixed(2) });

    switch (p.heroId) {
      case 'justin': {
        // Arcane bolt — fast, pierces 2
        spawnBullet({
          x: p.x + Math.cos(ang)*18, y: p.y + Math.sin(ang)*18,
          vx: Math.cos(ang)*640, vy: Math.sin(ang)*640,
          dmg: authoritative ? dmg : 0, owner: p.id,
          color: h.color, radius: 8, life: range/640*1.05,
          piercing: 2, ghost: !authoritative,
        });
        break;
      }
      case 'jian': {
        // Hitscan laser beam — instant damage to nearest enemy in a narrow cone
        let hit = 0;
        if (authoritative) {
          for (const e of state.enemies){
            const dx=e.x-p.x, dy=e.y-p.y, d=Math.hypot(dx,dy);
            if (d < range + (e.r||0)){
              const a=Math.atan2(dy,dx);
              const da=Math.atan2(Math.sin(a-ang),Math.cos(a-ang));
              if (Math.abs(da) < 0.06) { damageEnemy(e, dmg, p); hit++; if (hit>=3) break; }
            }
          }
        }
        // Beam fx — line of dots from player to range
        for (let i=0;i<24;i++){
          const t=i/24, r=range*t;
          state.fx.push({ x:p.x+Math.cos(ang)*r, y:p.y+Math.sin(ang)*r, vx:0,vy:0, life:0.12,life0:0.12, color:h.color, r:3 });
        }
        if (hit>0) shake(2);
        break;
      }
      case 'joseph': {
        // Wide melee scythe cleave — like james but wider arc, slight self-pull
        let hit = 0;
        if (authoritative){
          for (const e of state.enemies){
            const dx=e.x-p.x, dy=e.y-p.y, d=Math.hypot(dx,dy);
            if (d < range + (e.r||0)){
              const a=Math.atan2(dy,dx);
              const da=Math.atan2(Math.sin(a-ang),Math.cos(a-ang));
              if (Math.abs(da) < 1.4) { damageEnemy(e, dmg, p); hit++; }
            }
          }
        }
        for (let i=0;i<14;i++){
          const t=i/14, a=ang-1.4+t*2.8;
          state.fx.push({ x:p.x+Math.cos(a)*range*0.85, y:p.y+Math.sin(a)*range*0.85, vx:0,vy:0, life:0.22,life0:0.22, color:h.color, r:5 });
        }
        if (hit>0) shake(4);
        break;
      }
      case 'jaballas': {
        // Shotgun — 6 pellets in a 30-degree cone
        const pellets = 6, spread = 0.5;
        for (let i=0;i<pellets;i++){
          const a = ang + (i/(pellets-1) - 0.5) * spread;
          spawnBullet({
            x: p.x+Math.cos(a)*18, y: p.y+Math.sin(a)*18,
            vx: Math.cos(a)*720, vy: Math.sin(a)*720,
            dmg: authoritative ? dmg : 0, owner: p.id,
            color: h.color, radius: 5, life: range/720*1.1,
            piercing: 0, ghost: !authoritative,
          });
        }
        shake(2);
        break;
      }
      case 'joshua': {
        // Single fast arrow — long range, high damage
        spawnBullet({
          x: p.x+Math.cos(ang)*20, y: p.y+Math.sin(ang)*20,
          vx: Math.cos(ang)*900, vy: Math.sin(ang)*900,
          dmg: authoritative ? dmg : 0, owner: p.id,
          color: h.color, radius: 4, life: range/900*1.05,
          piercing: 1, ghost: !authoritative,
        });
        break;
      }
      case 'jazmine': {
        // Rapid plasma — single bolt, very fast cooldown
        spawnBullet({
          x: p.x+Math.cos(ang)*14, y: p.y+Math.sin(ang)*14,
          vx: Math.cos(ang)*740, vy: Math.sin(ang)*740,
          dmg: authoritative ? dmg : 0, owner: p.id,
          color: h.color, radius: 6, life: range/740*1.05,
          piercing: 0, ghost: !authoritative,
        });
        break;
      }
    }
  };

  const _origDoAbility = doAbility;
  doAbility = function(p){
    if (!NEW_HEROES[p.heroId]) return _origDoAbility(p);
    const h = HEROES[p.heroId];
    p.abiCd = h.abiCd * p.mods.cdr;
    try { SFX.ability(p.heroId); } catch(_){}
    const authoritative = canAuthorEnemies();
    const ang = p.angle;
    queueAction({ t:'abi', a:+ang.toFixed(2) });

    switch (p.heroId) {
      case 'justin': {
        // Spirit Beasts — spawn 18 fast bolts in waves over 1.5s, each
        // launched from player toward random nearby enemies (or random ring
        // direction if none). Visually feels like summoned spirits hunting.
        const waves = 3;
        for (let w=0; w<waves; w++){
          setTimeout(()=>{
            const targets = state.enemies.slice().sort((a,b)=>{
              const da=(a.x-p.x)**2+(a.y-p.y)**2, db=(b.x-p.x)**2+(b.y-p.y)**2; return da-db;
            }).slice(0, 6);
            for (let i=0;i<6;i++){
              const t = targets[i];
              const a = t ? Math.atan2(t.y-p.y, t.x-p.x) : (Math.PI*2*Math.random());
              spawnBullet({
                x: p.x, y: p.y, vx: Math.cos(a)*560, vy: Math.sin(a)*560,
                dmg: authoritative ? h.dmg*1.0*p.mods.dmg : 0, owner: p.id,
                color: h.color, radius: 7, life: 1.0, piercing: 1,
                ghost: !authoritative,
              });
            }
            try { particles(p.x, p.y, h.color, 16, 220, 0.5, 3); } catch(_){}
          }, w*350);
        }
        try { shake(4); } catch(_){}
        break;
      }
      case 'jian': {
        // Overcharge — wide piercing megabeam, dmg = 4x along a line
        const beamLen = h.range * 1.6 * p.mods.range;
        const beamHalfWidth = 36;
        if (authoritative){
          for (const e of state.enemies){
            const dx=e.x-p.x, dy=e.y-p.y;
            const along = dx*Math.cos(ang) + dy*Math.sin(ang);
            const perp  = -dx*Math.sin(ang) + dy*Math.cos(ang);
            if (along > 0 && along < beamLen && Math.abs(perp) < beamHalfWidth + (e.r||0)){
              damageEnemy(e, h.dmg * 4 * p.mods.dmg, p);
            }
          }
        }
        for (let i=0;i<60;i++){
          const t=i/60, r=beamLen*t;
          state.fx.push({ x:p.x+Math.cos(ang)*r, y:p.y+Math.sin(ang)*r, vx:0,vy:0, life:0.5,life0:0.5, color:h.color, r:8 });
        }
        try { shake(8); } catch(_){}
        break;
      }
      case 'joseph': {
        // Soul Harvest — big AoE pulse around player, heals 8 per enemy hit
        const radius = 220;
        let hit = 0;
        if (authoritative){
          for (const e of state.enemies){
            if (Math.hypot(e.x-p.x, e.y-p.y) < radius + (e.r||0)){
              damageEnemy(e, h.dmg*2.2*p.mods.dmg, p); hit++;
            }
          }
        }
        if (hit > 0) p.hp = Math.min(p.hpMax, p.hp + 8*hit);
        state.fx.push({ ring:true, x:p.x, y:p.y, color:h.color, life:0.6,life0:0.6, r:0, _maxR:radius });
        try { particles(p.x, p.y, h.color, 60, 280, 0.7, 3); shake(8); } catch(_){}
        break;
      }
      case 'jaballas': {
        // Slug Round — single super-piercing high-dmg projectile in aim direction
        spawnBullet({
          x: p.x+Math.cos(ang)*20, y: p.y+Math.sin(ang)*20,
          vx: Math.cos(ang)*820, vy: Math.sin(ang)*820,
          dmg: authoritative ? h.dmg*9*p.mods.dmg : 0, owner: p.id,
          color: '#ffd166', radius: 14, life: 1.4, piercing: 99,
          ghost: !authoritative,
        });
        try { shake(8); } catch(_){}
        break;
      }
      case 'joshua': {
        // Arrow Volley — 12 arrows fall around the player's aim point with delays
        const targetX = p.x + Math.cos(ang)*420, targetY = p.y + Math.sin(ang)*420;
        for (let i=0;i<12;i++){
          setTimeout(()=>{
            const ox = (Math.random()-0.5)*240, oy = (Math.random()-0.5)*240;
            const tx = targetX+ox, ty = targetY+oy;
            // Spawn from above (shoot from offscreen point straight down for fx)
            spawnBullet({
              x: tx - Math.cos(ang)*120, y: ty - Math.sin(ang)*120,
              vx: Math.cos(ang)*800, vy: Math.sin(ang)*800,
              dmg: authoritative ? h.dmg*1.0*p.mods.dmg : 0, owner: p.id,
              color: h.color, radius: 4, life: 0.25, piercing: 1,
              ghost: !authoritative,
            });
            state.fx.push({ x:tx, y:ty, vx:0,vy:0, life:0.3,life0:0.3, color:h.color, r:6 });
          }, i*70);
        }
        try { shake(4); } catch(_){}
        break;
      }
      case 'jazmine': {
        // Plasma Storm — 16 plasma orbs in a 360 ring with high pierce
        const ring = 16;
        for (let i=0;i<ring;i++){
          const a = (i/ring)*Math.PI*2;
          spawnBullet({
            x: p.x, y: p.y, vx: Math.cos(a)*420, vy: Math.sin(a)*420,
            dmg: authoritative ? h.dmg*1.6*p.mods.dmg : 0, owner: p.id,
            color: h.color, radius: 9, life: 1.1, piercing: 3,
            ghost: !authoritative,
          });
        }
        try { particles(p.x, p.y, h.color, 50, 280, 0.8, 3); shake(6); } catch(_){}
        break;
      }
    }
  };

  // Touch cooldown UI uses HEROES[p.heroId].abiCd / atkCd, which we already
  // populated, so no change needed there.

  // ---------- Clamp state.hero if it was a locked one previously ----------
  if (LOCKED_IDS.includes(state.hero) && !profile.unlocked.has(state.hero)){
    state.hero = 'james';
    localStorage.setItem('ns_hero', 'james');
  }

  // ---------- Boot: refresh unlocks from server, handle ?paid=true ----------
  (async function boot(){
    try {
      // Refresh unlocks from server if we have stored credentials
      if (profile.name && profile.pin){
        try {
          const data = await apiLogin(profile.name, profile.pin);
          applyUnlocksFromServer(data.unlockedHeroes);
        } catch (e) {
          console.warn('Profile refresh failed:', e.message);
        }
      }

      // After PayMongo redirect, finalize unlock
      const params = new URLSearchParams(window.location.search);
      const paid = params.get('paid');
      const heroParam = params.get('hero');
      if (paid === 'true' && heroParam && NEW_HEROES[heroParam] && profile.name && profile.pin){
        try {
          const data = await apiUnlock(profile.name, profile.pin, heroParam);
          applyUnlocksFromServer(data.unlockedHeroes);
          // Auto-select the new hero
          state.hero = heroParam; localStorage.setItem('ns_hero', heroParam);
          try { renderHeroGrid(); } catch(_){}
          try { toast(`${HEROES[heroParam].name.toUpperCase()} UNLOCKED!`, 3000); } catch(_){}
        } catch(e){
          console.error('Unlock failed:', e);
          try { toast('Unlock failed: ' + e.message, 3000); } catch(_){}
        }
        // Strip params from URL
        const clean = window.location.pathname;
        history.replaceState({}, '', clean);
      } else if (paid === 'cancel'){
        try { toast('Payment cancelled', 2000); } catch(_){}
        history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) {
      console.error('DLC boot error:', e);
    }
  })();

  // Expose for debugging
  window.NS_DLC = { profile, NEW_HEROES, LOCKED_IDS, showProfileModal, showBuyModal };
})();
