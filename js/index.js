/**
 * index.js — キャラクター一覧ページ
 * ============================================================
 * データ読み込みフロー:
 *   1. data/index.json からキャラクターID一覧を取得
 *   2. 各IDに対して data/{id}.json を並行fetch
 *   3. 成功分のみ統合してグリッド表示（一部失敗しても継続）
 *
 * フィルター仕様:
 *   - 元素   : 7元素を固定リストで「常に全種類表示」
 *   - 武器   : 全5種類を常時表示
 *   - レアリティ: データ内に存在する値を動的生成（★4 / ★5 など）
 *   - 全条件 : AND で結合
 * ============================================================
 */

/* ── 元素: 固定7種（データ有無に関係なく全て表示） ── */
const ALL_ELEMENTS = [
  { value: 'pyro',    name: '炎' },
  { value: 'hydro',   name: '水' },
  { value: 'anemo',   name: '風' },
  { value: 'electro', name: '雷' },
  { value: 'dendro',  name: '草' },
  { value: 'cryo',    name: '氷' },
  { value: 'geo',     name: '岩' },
];

/* ── 武器: 固定5種（常時表示） ── */
const ALL_WEAPONS = [
  { value: 'sword',    name: '片手剣',   icon: '' },
  { value: 'claymore', name: '両手剣',   icon: '' },
  { value: 'polearm',  name: '長柄武器', icon: '' },
  { value: 'bow',      name: '弓',       icon: '' },
  { value: 'catalyst', name: '法器',     icon: '' },
];

/* ── フィルター状態（初期値はすべて "all"） ── */
const filterState = {
  element: 'all',
  weapon:  'all',
  rarity:  'all',
};

/* ── キャッシュ ── */
let allCharacters = [];

/* ============================================================
   初期化
   ============================================================ */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    // Step 1: data/index.json からID一覧取得
    const indexRes = await fetch('data/index.json');
    if (!indexRes.ok) throw new Error(`data/index.json の取得失敗 (HTTP ${indexRes.status})`);

    const indexData = await indexRes.json();
    if (!Array.isArray(indexData.characters) || !indexData.characters.length) {
      throw new Error('data/index.json に有効な characters 配列がありません');
    }

    // Step 2: 各 {id}.json を並行fetch（失敗した個別ファイルはスキップ）
    const results = await Promise.allSettled(
      indexData.characters.map(id =>
        fetch(`data/${id}.json`).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
      )
    );

    allCharacters = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        allCharacters.push(result.value);
      } else {
        console.warn(`[index.js] 読み込み失敗: data/${indexData.characters[i]}.json`, result.reason?.message);
      }
    });

    // Step 3: フィルターUI構築 → 初期表示
    buildFilters();
    applyFilters();

  } catch (e) {
    console.error('[index.js] 初期化エラー:', e);
    showGridError(e.message);
  }
}

/* ============================================================
   フィルターUI構築
   ============================================================ */

function buildFilters() {
  const bar = document.getElementById('filterBar');
  bar.innerHTML = '';

  /* ── 元素（固定7種、常時表示） ─────────────────────── */
  bar.appendChild(createLabel('元素'));
  bar.appendChild(makeFilterBtn('element', 'all', '全て', /* active */ true));
  ALL_ELEMENTS.forEach(el => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filterType  = 'element';
    btn.dataset.filterValue = el.value;
    btn.dataset.element     = el.value; // 元素カラー用
    btn.innerHTML = `${elIconHTML(el.value, 15)} ${el.name}`;
    btn.addEventListener('click', () => onFilterClick('element', el.value, btn));
    bar.appendChild(btn);
  });

  bar.appendChild(makeSeparator());

  /* ── 武器（固定5種、常時表示） ─────────────────────── */
  bar.appendChild(createLabel('武器'));
  bar.appendChild(makeFilterBtn('weapon', 'all', '全て', true));
  ALL_WEAPONS.forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filterType  = 'weapon';
    btn.dataset.filterValue = w.value;
    btn.innerHTML = `${w.icon} ${w.name}`;
    btn.addEventListener('click', () => onFilterClick('weapon', w.value, btn));
    bar.appendChild(btn);
  });

  bar.appendChild(makeSeparator());

  /* ── レアリティ（データ内の値を収集して動的生成） ─── */
  bar.appendChild(createLabel('レアリティ'));
  bar.appendChild(makeFilterBtn('rarity', 'all', '全て', true));

  // データ内のレアリティ値を重複なく降順で収集
  const rarities = [...new Set(allCharacters.map(c => c.rarity).filter(Boolean))]
    .sort((a, b) => b - a); // 5★ → 4★ の順

  rarities.forEach(r => {
    const stars = '★'.repeat(r);
    const btn = document.createElement('button');
    btn.className = `filter-btn filter-btn--rarity filter-btn--rarity-${r}`;
    btn.dataset.filterType  = 'rarity';
    btn.dataset.filterValue = String(r);
    btn.textContent = stars;
    btn.addEventListener('click', () => onFilterClick('rarity', String(r), btn));
    bar.appendChild(btn);
  });
}

/* ── ラベル要素を生成 ── */
function createLabel(text) {
  const span = document.createElement('span');
  span.className   = 'filter-bar__label';
  span.textContent = text;
  return span;
}

/* ── セパレーター（横一線） ── */
function makeSeparator() {
  const div = document.createElement('div');
  div.style.cssText = [
    'width:100%',
    'height:1px',
    'background:rgba(255,255,255,.06)',
    'flex-shrink:0',
    'margin:2px 0',
  ].join(';');
  return div;
}

/**
 * フィルターボタンを生成する（汎用）
 * @param {string} type     - フィルター種別 ('element'|'weapon'|'rarity')
 * @param {string} value    - フィルター値 ('all' or 具体値)
 * @param {string} label    - 表示テキスト
 * @param {boolean} isActive - 初期アクティブ状態
 */
function makeFilterBtn(type, value, label, isActive = false) {
  const btn = document.createElement('button');
  btn.className = 'filter-btn' + (isActive ? ' is-active' : '');
  btn.textContent = label;
  btn.dataset.filterType  = type;
  btn.dataset.filterValue = value;
  btn.addEventListener('click', () => onFilterClick(type, value, btn));
  return btn;
}

/* ============================================================
   フィルタークリック処理
   ============================================================ */

/**
 * ボタンのアクティブ状態を切り替えて filterState を更新し再描画する
 * @param {string}      type       - フィルター種別
 * @param {string}      value      - 選択値
 * @param {HTMLElement} clickedBtn - クリックされたボタン
 */
function onFilterClick(type, value, clickedBtn) {
  // 同種のボタンをすべて非アクティブにしてから選択ボタンだけ ON
  document.querySelectorAll(`.filter-btn[data-filter-type="${type}"]`)
    .forEach(b => b.classList.remove('is-active'));
  clickedBtn.classList.add('is-active');

  filterState[type] = value;
  applyFilters();
}

/* ============================================================
   フィルター適用（AND条件）
   ============================================================ */

/** filterState の3条件をすべてANDで適用してグリッドを再描画 */
function applyFilters() {
  const filtered = allCharacters.filter(c => {
    const elOk = filterState.element === 'all' || c.element === filterState.element;
    const wpOk = filterState.weapon  === 'all' || c.weapon  === filterState.weapon;
    const raOk = filterState.rarity  === 'all' || String(c.rarity) === filterState.rarity;
    return elOk && wpOk && raOk;
  });
  renderGrid(filtered);
}

/**
 * すべてのフィルターを初期状態（全て）にリセットして全件表示する
 * 0件メッセージ内の「リセット」ボタンから呼ばれる
 */
function resetFilters() {
  filterState.element = 'all';
  filterState.weapon  = 'all';
  filterState.rarity  = 'all';

  // 全「全て」ボタンをアクティブに、他を非アクティブに
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.filterValue === 'all');
  });

  renderGrid(allCharacters);
}

/* ============================================================
   グリッド描画
   ============================================================ */

function renderGrid(chars) {
  const grid    = document.getElementById('characterGrid');
  const loading = document.getElementById('loadingState');
  if (loading) loading.remove();

  grid.innerHTML = '';

  /* ── 0件: 専用メッセージ ── */
  if (!chars.length) {
    const empty = document.createElement('div');
    empty.className       = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.innerHTML = `
      <div style="font-size:2.2rem;margin-bottom:10px">🔍</div>
      <p style="margin-bottom:16px">該当するキャラクターはいません</p>
      <button
        onclick="resetFilters()"
        style="padding:6px 18px;border-radius:var(--radius-pill);
               border:1px solid var(--border-light);background:transparent;
               color:var(--text-secondary);font-size:.8rem;cursor:pointer;
               font-family:inherit;transition:all .18s"
        onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--text-gold-light)'"
        onmouseout="this.style.borderColor='var(--border-light)';this.style.color='var(--text-secondary)'">
        フィルターをリセット
      </button>`;
    grid.appendChild(empty);
    return;
  }

  chars.forEach(c => grid.appendChild(makeCard(c)));
}

/* ============================================================
   キャラクターカード生成
   ============================================================ */

function makeCard(c) {
  const elInfo = ALL_ELEMENTS.find(e => e.value === c.element) || { name: c.element };
  const stars  = '★'.repeat(c.rarity);

  const imageHTML = c.image
    ? `<img src="${c.image}" alt="${c.name}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=\\'char-card__placeholder\\'>${elIconHTML(c.element, 56)}</div>`
    : `<div class="char-card__placeholder">${elIconHTML(c.element, 56)}</div>`;

  const a = document.createElement('a');
  a.href = `character.html?id=${c.id}`;
  a.className = 'char-card';
  a.dataset.rarity  = c.rarity;
  a.dataset.element = c.element;
  a.innerHTML = `
    <div class="char-card__rarity-line"></div>
    <div class="char-card__image" data-element="${c.element}">
      ${imageHTML}
      <div class="char-card__element-icon">
        <img src="images/elements/${c.element}.png"
             alt="${elInfo.name}" width="18" height="18"
             style="object-fit:contain"
             onerror="this.style.display='none'">
      </div>
    </div>
    <div class="char-card__body">
      <div class="char-card__name">${c.name}</div>
      <div class="char-card__meta">
        <span class="char-card__element-text" data-element="${c.element}">
          ${elIconHTML(c.element, 13)} ${elInfo.name}
        </span>
        <span class="char-card__stars">${stars}</span>
      </div>
    </div>`;
  return a;
}

/* ============================================================
   ユーティリティ
   ============================================================ */

/** 元素アイコン <img> HTML を返す */
function elIconHTML(element, size = 18) {
  const info = ALL_ELEMENTS.find(e => e.value === element) || { name: element };
  return `<img src="images/elements/${element}.png"
               alt="${info.name}" width="${size}" height="${size}"
               style="object-fit:contain;vertical-align:middle"
               onerror="this.style.display='none'">`;
}

/** グリッドにエラーメッセージを表示 */
function showGridError(msg = '') {
  const grid    = document.getElementById('characterGrid');
  const loading = document.getElementById('loadingState');
  if (loading) loading.remove();

  grid.innerHTML = `
    <div class="error-state" style="grid-column:1/-1">
      <h2>⚠️ 読み込みエラー</h2>
      <p>${msg || 'データの取得に失敗しました。'}<br>
         ローカルサーバーを使用してください（例: <code>npx serve .</code>）</p>
    </div>`;
}
