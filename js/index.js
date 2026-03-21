/**
 * index.js — キャラクター一覧ページ
 * ============================================================
 * データ読み込みフロー:
 *   1. data/index.json からキャラクターID一覧を取得
 *   2. 各IDに対して data/{id}.json を並行fetch
 *   3. 成功分のみ統合してグリッド表示（一部失敗しても継続）
 *
 * フィルター仕様:
 *   - 元素: データに存在する元素のみ動的生成
 *   - 武器: 全5種類を常時表示（データ不在でも）
 *   - 両者はAND条件で絞り込み
 * ============================================================
 */

/* ── 元素定義 ── */
const ELEMENTS = {
  pyro:    { name: '炎' },
  hydro:   { name: '水' },
  anemo:   { name: '風' },
  electro: { name: '雷' },
  dendro:  { name: '草' },
  cryo:    { name: '氷' },
  geo:     { name: '岩' },
};

/* ── 武器定義（常に全種類表示） ── */
const ALL_WEAPONS = [
  { value: 'sword',    name: '片手剣',  icon: '' },
  { value: 'claymore', name: '両手剣',  icon: '' },
  { value: 'polearm',  name: '長柄武器', icon: '' },
  { value: 'bow',      name: '弓',      icon: '' },
  { value: 'catalyst', name: '法器',    icon: '' },
];

/* ── 状態 ── */
let allCharacters = [];    // 全キャラクターデータ
let activeElement = 'all'; // 現在の元素フィルター
let activeWeapon  = 'all'; // 現在の武器フィルター

/* ── 初期化 ── */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    // Step 1: data/index.json からキャラクターID一覧を取得
    const indexRes = await fetch('data/index.json');
    if (!indexRes.ok) throw new Error(`data/index.json の取得失敗 (HTTP ${indexRes.status})`);

    const indexData = await indexRes.json();
    if (!Array.isArray(indexData.characters) || indexData.characters.length === 0) {
      throw new Error('data/index.json に有効な characters 配列がありません');
    }

    // Step 2: 全キャラクターJSONを並行fetch（一部失敗しても継続）
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
        // 1件失敗しても残りは表示する
        console.warn(`[index.js] 読み込み失敗: data/${indexData.characters[i]}.json`, result.reason?.message);
      }
    });

    // Step 3: フィルターUI構築 → 一覧表示
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
  bar.innerHTML = ''; // クリア

  /* ── 元素フィルター ─────────────────────────────────── */
  bar.appendChild(createLabel('元素'));

  // データに存在する元素のみ動的生成
  const usedElements = [...new Set(allCharacters.map(c => c.element).filter(Boolean))];
  bar.appendChild(makeFilterBtn('all', '全て', 'element', true));
  usedElements.forEach(el => {
    const info = ELEMENTS[el] || { name: el };
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filterType  = 'element';
    btn.dataset.filterValue = el;
    btn.dataset.element     = el;
    btn.innerHTML = `${elIconHTML(el, 15)} ${info.name}`;
    btn.addEventListener('click', () => handleFilterClick('element', el, btn));
    bar.appendChild(btn);
  });

  /* ── 区切り線 ───────────────────────────────────────── */
  const sep = document.createElement('div');
  sep.style.cssText = 'width:100%;height:1px;background:rgba(255,255,255,.06);flex-shrink:0;margin:2px 0';
  bar.appendChild(sep);

  /* ── 武器フィルター（全種類常時表示） ────────────────── */
  bar.appendChild(createLabel('武器'));
  bar.appendChild(makeFilterBtn('all', '全て', 'weapon', true));
  ALL_WEAPONS.forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filterType  = 'weapon';
    btn.dataset.filterValue = w.value;
    btn.innerHTML = `${w.icon} ${w.name}`;
    btn.addEventListener('click', () => handleFilterClick('weapon', w.value, btn));
    bar.appendChild(btn);
  });
}

/** フィルターラベル要素を生成 */
function createLabel(text) {
  const el = document.createElement('span');
  el.className   = 'filter-bar__label';
  el.textContent = text;
  return el;
}

/** フィルターボタンを生成（汎用） */
function makeFilterBtn(value, label, type, isActive = false) {
  const btn = document.createElement('button');
  btn.className = 'filter-btn' + (isActive ? ' is-active' : '');
  btn.textContent = label;
  btn.dataset.filterType  = type;
  btn.dataset.filterValue = value;
  btn.addEventListener('click', () => handleFilterClick(type, value, btn));
  return btn;
}

/** フィルタークリック処理 */
function handleFilterClick(type, value, clickedBtn) {
  // 同タイプのボタンのアクティブ状態をリセット
  document.querySelectorAll(`.filter-btn[data-filter-type="${type}"]`)
    .forEach(b => b.classList.remove('is-active'));
  clickedBtn.classList.add('is-active');

  if (type === 'element') activeElement = value;
  if (type === 'weapon')  activeWeapon  = value;

  applyFilters();
}

/* ============================================================
   フィルター適用
   ============================================================ */

/** 現在のフィルター状態でグリッドを更新 */
function applyFilters() {
  const filtered = allCharacters.filter(c => {
    const elOk = activeElement === 'all' || c.element === activeElement;
    const wpOk = activeWeapon  === 'all' || c.weapon  === activeWeapon;
    return elOk && wpOk;
  });
  renderGrid(filtered);
}

/** 全フィルターをリセットして全件表示 */
function resetFilters() {
  activeElement = 'all';
  activeWeapon  = 'all';
  // 全ての「全て」ボタンをアクティブに、他を非アクティブに
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

  // フィルター結果0件の場合は専用メッセージを表示
  if (!chars.length) {
    const empty = document.createElement('div');
    empty.className       = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.innerHTML = `
      <div style="font-size:2.2rem;margin-bottom:10px">Sorry：（</div>
      <p style="margin-bottom:16px">該当するキャラクターがいません</p>
      <button onclick="resetFilters()"
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
  const info  = ELEMENTS[c.element] || { name: c.element };
  const stars = '★'.repeat(c.rarity);

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
             alt="${info.name}" width="18" height="18"
             style="object-fit:contain"
             onerror="this.style.display='none'">
      </div>
    </div>
    <div class="char-card__body">
      <div class="char-card__name">${c.name}</div>
      <div class="char-card__meta">
        <span class="char-card__element-text" data-element="${c.element}">
          ${elIconHTML(c.element, 13)} ${info.name}
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
  const info = ELEMENTS[element] || { name: element };
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
         </p>
    </div>`;
}
