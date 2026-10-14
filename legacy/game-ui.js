// HUD, dragon action menu, and the dragon info / cleanse (tẩy tủy) / shop / gift panels.
// DOM overlay on top of the Phaser canvas. Talks to the scene through index.html globals:
// dragon, scene, manifest, play, flyTo, farGrassPoint, spawnSwirl, W, H, DRAGON_SCALE, depthScale.

const SAVE_KEY = 'dragon-island-save-v1';
const CLEANSE_GEMS = 50;     // used when there is no Tẩy Tủy Đan left
const PILL_PRICE = 40;       // gems per Tẩy Tủy Đan in the shop
const TRAIN_COST = 100, TRAIN_EXP = 150;
const DAILY_GIFT = { coins: 200, gems: 20, pills: 1 };

const STATS = [  // key, label, base value at level 0 with 50 aptitude
  ['hp', 'Sinh lực', 1200], ['atk', 'Công', 180], ['def', 'Thủ', 140], ['spd', 'Tốc', 90],
];
const GRADES = [[90, 'S', '#ffb020'], [75, 'A', '#c46bff'], [60, 'B', '#3fa9ff'], [40, 'C', '#45c486'], [0, 'D', '#9aa5b1']];

const DRAGON_ACTIONS = [
  { id: 'info', label: 'Thông tin', icon: 'cards' },
  { id: 'cleanse', label: 'Tẩy tủy', icon: 'potion' },
  { id: 'train', label: 'Huấn luyện', icon: 'achievement' },
  { id: 'fly', label: 'Bay', emoji: '🪽' },
  { id: 'sleep', label: 'Ngủ', emoji: '💤' },
  { id: 'battle', label: 'Chiến đấu', icon: 'battle' },
];
const SIDE_BUTTONS = [
  { id: 'quest', label: 'Nhiệm vụ' }, { id: 'achievement', label: 'Thành tựu' },
  { id: 'ranking', label: 'Xếp hạng' }, { id: 'mail', label: 'Thư' }, { id: 'gift', label: 'Quà' },
];
const BOTTOM_BUTTONS = [
  { id: 'bag', label: 'Túi' }, { id: 'shop', label: 'Cửa hàng' }, { id: 'cards', label: 'Bộ sưu tập' },
  { id: 'battle', label: 'Chiến đấu' }, { id: 'map', label: 'Bản đồ' }, { id: 'friends', label: 'Bạn bè' },
  { id: 'settings', label: 'Cài đặt' },
];

// ---- save data -------------------------------------------------------------------------------

const STARTER_DRAGONS = {
  hac_long: { species: 'hac_long', name: 'Hắc Long', element: 'Băng', rarity: 'SR', level: 12, exp: 340,
              aptitude: { hp: 72, atk: 85, def: 61, spd: 78 }, cleanses: 0 },
  rong_xuong: { species: 'rong_xuong', name: 'Rồng Xương', element: 'Ám', rarity: 'SSR', level: 1, exp: 0,
                aptitude: { hp: 80, atk: 74, def: 88, spd: 52 }, cleanses: 0 },
};
const ELEMENT_ICON = { 'Băng': '❄', 'Ám': '☠' };

// state.dragon = the dragon shown on the island (not saved; derived from state.active)
function withActive(s) {
  Object.defineProperty(s, 'dragon', { get() { return this.dragons[this.active]; }, enumerable: false, configurable: true });
  return s;
}
const defaultState = () => withActive({
  player: { name: 'Người chơi', coins: 1500, gems: 300, pills: 3, giftDay: null },
  dragons: Object.values(STARTER_DRAGONS).map(d => structuredClone(d)),
  active: 0,
});
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.player && s.dragon && !s.dragons) {   // v1 save: one dragon -> list
      s.dragons = [{ ...s.dragon, species: 'hac_long' }, structuredClone(STARTER_DRAGONS.rong_xuong)];
      s.active = 0;
      delete s.dragon;
    }
    if (s && s.player && s.dragons) {
      for (const sp of Object.keys(STARTER_DRAGONS))   // newly added species join old saves
        if (!s.dragons.some(d => d.species === sp)) s.dragons.push(structuredClone(STARTER_DRAGONS[sp]));
      return withActive(s);
    }
  } catch (e) { /* private mode / blocked storage: start fresh */ }
  return defaultState();
}
function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* not persisted */ }
}
let state = loadState();

const gradeOf = v => GRADES.find(([min]) => v >= min);
const expMax = lv => 200 + lv * 70;
const statValue = (key, base, apt = state.dragon.aptitude) =>
  Math.round(base * (1 + state.dragon.level * 0.08) * (0.5 + apt[key] / 100));
const power = (apt = state.dragon.aptitude) =>
  Math.round(STATS.reduce((sum, [k, , base]) => sum + statValue(k, base, apt) * (k === 'hp' ? 0.25 : 1), 0));

// new aptitude: centred on 65, rarely above 90
function rollAptitude() {
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;  // ~[-1, 1]
  return Object.fromEntries(STATS.map(([k]) => [k, Math.max(20, Math.min(100, Math.round(65 + gauss() * 32)))]));
}

// ---- helpers ---------------------------------------------------------------------------------

const $ = sel => document.querySelector(sel);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  kids.flat().forEach(k => n.append(k));
  return n;
};
const iconImg = name => el('img', { src: `ui/${name}.png`, alt: '', draggable: false });
const fmt = n => n.toLocaleString('vi-VN');

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}

// text that rises from the dragon's head and fades
function floatText(text, color = '#ffe27a') {
  const s = DRAGON_SCALE * depthScale(dragon.y);
  const t = scene.add.text(dragon.x, dragon.y - dragon.alt - 170 * s, text, {
    fontFamily: 'system-ui, sans-serif', fontSize: '22px', fontStyle: 'bold', color, stroke: '#0b1a2a', strokeThickness: 5,
  }).setOrigin(0.5).setDepth(20);
  scene.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1400, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
}

// ---- HUD -------------------------------------------------------------------------------------

const GameUI = {
  menuOpen: false,
  modalOpen: false,
  get busy() { return this.menuOpen || this.modalOpen; },

  init() {
    const hud = el('div', { id: 'hud' });
    const hudBtn = ({ id, label }) => {
      const b = el('button', { className: 'hud-btn', title: label }, iconImg(id), el('span', { textContent: label }));
      b.dataset.panel = id;
      b.onclick = () => openPanel(id);
      return b;
    };
    hud.append(
      el('div', { className: 'hud-top' },
        el('button', { className: 'player', onclick: () => openPanel('profile') }, iconImg('profile'),
          el('div', {}, el('b', { id: 'player-name' }), el('span', { textContent: 'Đảo Băng' }))),
        el('div', { className: 'wallet' },
          el('span', { className: 'pill' }, iconImg('currency'), el('b', { id: 'coins' })),
          el('span', { className: 'pill' }, el('span', { className: 'gem', textContent: '💎' }), el('b', { id: 'gems' }),
            el('button', { className: 'plus', textContent: '+', title: 'Cửa hàng', onclick: () => openPanel('shop') })))),
      el('div', { className: 'hud-side' }, SIDE_BUTTONS.map(hudBtn)),
      el('div', { className: 'hud-bottom' }, BOTTOM_BUTTONS.map(hudBtn)),
      el('div', { id: 'dragon-menu' }),
      el('div', { id: 'toast' }),
      el('div', { id: 'modal', hidden: true, onclick: e => { if (e.target.id === 'modal') closeModal(); } }),
    );
    $('#game').append(hud);
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (this.modalOpen) closeModal(); else if (this.menuOpen) this.closeMenu();
    });
    refreshHud();
  },

  // Phaser pointerdown: returns true when the UI consumed the click
  onCanvasPointer(p) {
    if (this.menuOpen) { this.closeMenu(); return true; }
    if (hitDragon(p.worldX, p.worldY)) { this.openMenu(); return true; }
    return false;
  },

  openMenu() {
    if (dragon.key === 'walk') play('idle');
    const menu = $('#dragon-menu');
    menu.replaceChildren(...DRAGON_ACTIONS.map((a, i) => {
      const angle = -Math.PI / 2 + (i / DRAGON_ACTIONS.length) * Math.PI * 2;
      const b = el('button', { className: 'menu-btn', title: a.label },
        a.icon ? iconImg(a.icon) : el('span', { className: 'emoji', textContent: a.emoji }),
        el('span', { className: 'label', textContent: a.label }));
      b.style.setProperty('--dx', `${Math.cos(angle) * 105}px`);
      b.style.setProperty('--dy', `${Math.sin(angle) * 95}px`);
      b.style.transitionDelay = `${i * 25}ms`;
      b.onclick = () => { this.closeMenu(); dragonAction(a.id); };
      return b;
    }));
    menu.append(el('div', { className: 'menu-name', textContent: `${state.dragon.name} · Lv ${state.dragon.level}` }));
    this.menuOpen = true;
    this.tick();
    requestAnimationFrame(() => menu.classList.add('open'));
  },

  closeMenu() {
    this.menuOpen = false;
    $('#dragon-menu').classList.remove('open');
  },

  // keep the ring centred on the dragon (it may still be landing or turning)
  tick() {
    if (!this.menuOpen) return;
    const canvas = scene.game.canvas, rect = canvas.getBoundingClientRect(), box = $('#game').getBoundingClientRect();
    const q = rect.width / W, s = DRAGON_SCALE * depthScale(dragon.y);
    const x = rect.left - box.left + dragon.x * q;
    const y = rect.top - box.top + (dragon.y - dragon.alt - 80 * s) * q;
    const m = 120;  // keep the whole ring inside the play area
    const menu = $('#dragon-menu');
    menu.style.left = `${Math.max(m, Math.min(box.width - m, x))}px`;
    menu.style.top = `${Math.max(m, Math.min(box.height - m, y))}px`;
  },
};

function refreshHud() {
  $('#player-name').textContent = state.player.name;
  $('#coins').textContent = fmt(state.player.coins);
  $('#gems').textContent = fmt(state.player.gems);
  const giftBtn = document.querySelector('.hud-btn[data-panel="gift"]');
  giftBtn.classList.toggle('dot', state.player.giftDay !== new Date().toDateString());
}

// pixel-accurate: the click must land on an opaque pixel of the frame being shown
function hitDragon(x, y) {
  if (dragon.rig.hit(x, y, scene)) return true;
  for (const sp of [dragon.a, dragon.b]) {
    if (!sp.visible) continue;
    if (sp.alpha < 0.5) continue;
    const pt = sp.getLocalPoint(x, y);
    if (pt.x < 0 || pt.y < 0 || pt.x >= sp.frame.width || pt.y >= sp.frame.height) continue;
    if (scene.textures.getPixelAlpha(Math.floor(pt.x), Math.floor(pt.y), sp.texture.key, sp.frame.name) > 60) return true;
  }
  return false;
}

// ---- dragon actions --------------------------------------------------------------------------

function dragonAction(id) {
  const p = state.player, d = state.dragon;
  if (id === 'info') return openPanel('dragon');
  if (id === 'cleanse') return openPanel('cleanse');
  if (id === 'fly') return flyTo(...farGrassPoint());
  if (id === 'sleep') return play('sleep');
  if (id === 'battle') return toast('Đấu trường sắp mở');
  if (id === 'train') {
    if (p.coins < TRAIN_COST) return toast(`Cần ${TRAIN_COST} vàng để huấn luyện`);
    p.coins -= TRAIN_COST;
    d.exp += TRAIN_EXP;
    if (dragon.key === 'sleep') play('idle');
    floatText(`+${TRAIN_EXP} EXP`);
    let ups = 0;
    while (d.exp >= expMax(d.level)) { d.exp -= expMax(d.level); d.level++; ups++; }
    if (ups) setTimeout(() => { floatText(`LÊN CẤP ${d.level}!`, '#7fe8ff'); spawnSwirl(); }, 650);
    saveState(); refreshHud();
  }
}

// ---- panels ----------------------------------------------------------------------------------

function openPanel(id) {
  const build = PANELS[id] || comingSoon(id);
  const { title, icon, body } = build();
  const sheet = el('div', { className: 'sheet' },
    el('header', {}, icon ? iconImg(icon) : '', el('h2', { textContent: title }),
      el('button', { className: 'close', textContent: '✕', title: 'Đóng', onclick: closeModal })),
    el('div', { className: 'sheet-body' }, body));
  const modal = $('#modal');
  modal.replaceChildren(sheet);
  modal.hidden = false;
  GameUI.modalOpen = true;
  GameUI.closeMenu();
}

function closeModal() {
  $('#modal').hidden = true;
  GameUI.modalOpen = false;
}

const LABELS = Object.fromEntries([...SIDE_BUTTONS, ...BOTTOM_BUTTONS].map(b => [b.id, b.label]));
const comingSoon = id => () => ({
  title: LABELS[id] || 'Đang phát triển', icon: id,
  body: el('p', { className: 'muted center', textContent: 'Tính năng này đang được phát triển.' }),
});

function dragonPortrait() {
  // the rig's assembled rest pose (tools/build_rig.py), so it matches the dragon on the island
  return el('div', { className: 'portrait' }, el('img', { src: `dragons/${state.dragon.species}/portrait.png`, alt: state.dragon.name, draggable: false }));
}

function aptitudeRow([key, label], apt, prev) {
  const v = apt[key], [, g, color] = gradeOf(v);
  const diff = prev ? v - prev[key] : 0;
  return el('div', { className: 'apt-row' },
    el('span', { className: 'apt-label', textContent: label }),
    el('div', { className: 'bar' }, el('i', { style: `width:${v}%;background:${color}` })),
    el('b', { className: 'grade', style: `color:${color}`, textContent: g }),
    el('span', { className: 'apt-val', textContent: v }),
    prev ? el('span', { className: `diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}`,
                        textContent: diff > 0 ? `▲${diff}` : diff < 0 ? `▼${-diff}` : '=' }) : '');
}

const PANELS = {
  dragon: () => {
    const d = state.dragon, max = expMax(d.level);
    return {
      title: 'Thông tin rồng', icon: 'cards',
      body: [
        // owned dragons: tap one to view it and send it to the island
        el('div', { className: 'roster' }, state.dragons.map((x, i) => el('button', {
          className: `roster-item${i === state.active ? ' on' : ''}`, title: x.name,
          onclick: () => { if (i !== state.active) selectDragon(i); },
        }, el('img', { src: `dragons/${x.species}/portrait.png`, alt: '' }), el('span', { textContent: x.name })))),
        el('div', { className: 'dragon-head' }, dragonPortrait(),
          el('div', {},
            el('h3', {}, d.name, el('button', { className: 'link', textContent: '✎', title: 'Đổi tên', onclick: renameDragon })),
            el('div', { className: 'tags' },
              el('span', { className: `tag el-${d.species}`, textContent: `${ELEMENT_ICON[d.element] || '◆'} ${d.element}` }),
              el('span', { className: 'tag rare', textContent: d.rarity }),
              el('span', { className: 'tag', textContent: `Lv ${d.level}` })),
            el('div', { className: 'exp' }, el('i', { style: `width:${(d.exp / max) * 100}%` })),
            el('small', { className: 'muted', textContent: `EXP ${d.exp} / ${max}` }),
            el('div', { className: 'power' }, 'Lực chiến ', el('b', { textContent: fmt(power()) })))),
        el('table', { className: 'stats' },
          el('tr', {}, el('th', { textContent: 'Chỉ số' }), el('th', { textContent: 'Giá trị' }), el('th', { textContent: 'Tư chất' })),
          STATS.map(([k, label, base]) => {
            const [, g, color] = gradeOf(d.aptitude[k]);
            return el('tr', {}, el('td', { textContent: label }), el('td', { textContent: fmt(statValue(k, base)) }),
              el('td', {}, el('b', { style: `color:${color}`, textContent: g }), ` ${d.aptitude[k]}`));
          })),
        el('div', { className: 'actions' },
          el('button', { className: 'btn gold', textContent: 'Tẩy tủy', onclick: () => openPanel('cleanse') }),
          el('button', { className: 'btn', textContent: `Huấn luyện (${TRAIN_COST} vàng)`, onclick: () => { closeModal(); dragonAction('train'); } })),
      ],
    };
  },

  cleanse: () => {
    const body = el('div', {});
    const render = (apt, prev) => {
      const p = state.player, d = state.dragon;
      const cost = p.pills > 0 ? `1 Tẩy Tủy Đan (còn ${p.pills})` : `${CLEANSE_GEMS} 💎`;
      body.replaceChildren(
        el('p', { className: 'muted', textContent: 'Tẩy tủy quay lại ngẫu nhiên tư chất của cả 4 chỉ số. Sau khi tẩy có thể chọn giữ kết quả mới hoặc cũ.' }),
        el('div', { className: 'apt-list' }, STATS.map(s => aptitudeRow(s, apt, prev))),
        el('div', { className: 'power' }, 'Lực chiến ', el('b', { textContent: fmt(power(apt)) }),
          prev ? el('span', { className: `diff ${power(apt) >= power(prev) ? 'up' : 'down'}`,
                              textContent: ` (${power(apt) >= power(prev) ? '+' : ''}${fmt(power(apt) - power(prev))})` }) : ''),
        prev
          ? el('div', { className: 'actions' },
              el('button', { className: 'btn gold', textContent: 'Giữ chỉ số mới', onclick: () => {
                d.aptitude = apt; saveState(); closeModal();
                spawnSwirl(); floatText(power(apt) >= power(prev) ? 'Tư chất tăng!' : 'Đã đổi tư chất', '#7fe8ff');
              } }),
              el('button', { className: 'btn', textContent: 'Giữ chỉ số cũ', onclick: () => render(prev, null) }))
          : el('div', { className: 'actions' },
              el('button', { className: 'btn gold', textContent: 'Tẩy tủy', onclick: () => roll(apt) }),
              el('small', { className: 'muted', textContent: `Tiêu hao: ${cost} · đã tẩy ${d.cleanses} lần` })),
      );
    };
    const roll = current => {
      const p = state.player;
      if (p.pills > 0) p.pills--;
      else if (p.gems >= CLEANSE_GEMS) p.gems -= CLEANSE_GEMS;
      else return toast(`Cần Tẩy Tủy Đan hoặc ${CLEANSE_GEMS} kim cương`);
      state.dragon.cleanses++;
      saveState(); refreshHud();
      const result = rollAptitude();
      // flicker random values briefly, then settle on the result
      let n = 0;
      const timer = setInterval(() => {
        if (++n < 12) return render(rollAptitude(), null);
        clearInterval(timer);
        render(result, current);
      }, 60);
    };
    render(state.dragon.aptitude, null);
    return { title: 'Tẩy tủy', icon: 'potion', body };
  },

  bag: () => ({
    title: 'Túi đồ', icon: 'bag',
    body: el('div', { className: 'items' },
      el('div', { className: 'item' }, iconImg('potion'), el('b', { textContent: state.player.pills }), el('span', { textContent: 'Tẩy Tủy Đan' })),
      ...Array.from({ length: 7 }, () => el('div', { className: 'item empty' }))),
  }),

  shop: () => {
    const buy = () => {
      if (state.player.gems < PILL_PRICE) return toast('Không đủ kim cương');
      state.player.gems -= PILL_PRICE; state.player.pills++;
      saveState(); refreshHud(); openPanel('shop'); toast('Đã mua 1 Tẩy Tủy Đan');
    };
    return {
      title: 'Cửa hàng', icon: 'shop',
      body: el('div', { className: 'shop' },
        el('div', { className: 'shop-item' }, iconImg('potion'),
          el('div', {}, el('b', { textContent: 'Tẩy Tủy Đan' }), el('small', { className: 'muted', textContent: `Đang có ${state.player.pills}` })),
          el('button', { className: 'btn gold', textContent: `${PILL_PRICE} 💎`, onclick: buy })),
        el('div', { className: 'shop-item' }, iconImg('currency'),
          el('div', {}, el('b', { textContent: 'Nạp kim cương' }), el('small', { className: 'muted', textContent: 'Chưa mở' })),
          el('button', { className: 'btn', textContent: 'Sắp có', disabled: true }))),
    };
  },

  gift: () => {
    const today = new Date().toDateString(), claimed = state.player.giftDay === today;
    return {
      title: 'Quà hằng ngày', icon: 'gift',
      body: el('div', { className: 'center' },
        iconImg('chest'),
        el('p', { textContent: `${DAILY_GIFT.coins} vàng · ${DAILY_GIFT.gems} 💎 · ${DAILY_GIFT.pills} Tẩy Tủy Đan` }),
        el('button', { className: 'btn gold', textContent: claimed ? 'Đã nhận hôm nay' : 'Nhận quà', disabled: claimed, onclick: () => {
          Object.assign(state.player, { giftDay: today, coins: state.player.coins + DAILY_GIFT.coins,
            gems: state.player.gems + DAILY_GIFT.gems, pills: state.player.pills + DAILY_GIFT.pills });
          saveState(); refreshHud(); openPanel('gift'); toast('Đã nhận quà!');
        } })),
    };
  },

  profile: () => ({
    title: 'Hồ sơ', icon: 'profile',
    body: [
      el('p', {}, 'Tên: ', el('b', { textContent: state.player.name })),
      el('p', {}, 'Rồng: ', el('b', { textContent: `${state.dragon.name} (Lv ${state.dragon.level})` })),
      el('div', { className: 'actions' },
        el('button', { className: 'btn', textContent: 'Chơi lại từ đầu', onclick: () => {
          if (!confirm('Xoá dữ liệu và chơi lại từ đầu?')) return;
          state = defaultState(); saveState(); refreshHud(); setSpecies(state.dragon.species); closeModal(); toast('Đã đặt lại dữ liệu');
        } })),
    ],
  }),
};

function selectDragon(i) {
  state.active = i;
  saveState();
  setSpecies(state.dragon.species);
  play('idle');
  openPanel('dragon');
  toast(`${state.dragon.name} ra đảo`);
}

function renameDragon() {
  const name = prompt('Tên mới cho rồng:', state.dragon.name);
  if (!name || !name.trim()) return;
  state.dragon.name = name.trim().slice(0, 24);
  saveState();
  openPanel('dragon');
}
