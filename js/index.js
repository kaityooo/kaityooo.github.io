/* --- 元素定義 --- */
const ELEMENTS = {
  pyro:    { name: '炎' },
  hydro:   { name: '水' },
  anemo:   { name: '風' },
  electro: { name: '雷' },
  dendro:  { name: '草' },
  cryo:    { name: '氷' },
  geo:     { name: '岩' },
};

/** 元素アイコンのHTMLを返す（<img> タグ） */
function elIconHTML(element, size = 18) {
  const info = ELEMENTS[element] || { name: element };
  return `<img src="images/elements/${element}.png"
               alt="${info.name}"
               width="${size}" height="${size}"
               style="object-fit:contain;vertical-align:middle"
               onerror="this.style.display='none'">`;
}

let allCharacters = [];

/* --- 初期化 --- */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const data = await fetch('data/characters.json').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    allCharacters = data.characters;
    buildFilters(allCharacters);
    renderGrid(allCharacters);
  } catch (e) {
    console.error(e);
    showGridError();
  }
}

/* --- フィルターバー生成 --- */
function buildFilters(chars) {
  const bar = document.getElementById('filterBar');
  const elements = [...new Set(chars.map(c => c.element))];

  // 全てボタン
  bar.appendChild(makeFilterBtn('all', '全て', true));

  // 元素別ボタン アイコン画像 + テキスト
  elements.forEach(el => {
    const info = ELEMENTS[el] || { name: el };
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = el;
    btn.dataset.element = el;
    btn.innerHTML = `${elIconHTML(el, 16)} ${info.name}`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const filtered = allCharacters.filter(c => c.element === el);
      renderGrid(filtered);
    });
    bar.appendChild(btn);
  });
}

function makeFilterBtn(value, label, active) {
  const btn = document.createElement('button');
  btn.className = 'filter-btn' + (active ? ' is-active' : '');
  btn.textContent = label;
  btn.dataset.filter = value;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    renderGrid(allCharacters);
  });
  return btn;
}

/* --- キャラクターグリッド描画 --- */
function renderGrid(chars) {
  const grid = document.getElementById('characterGrid');
  const loading = document.getElementById('loadingState');
  if (loading) loading.remove();

  grid.innerHTML = '';

  if (!chars.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>条件に一致するキャラクターがいません</p></div>';
    return;
  }

  chars.forEach(c => grid.appendChild(makeCard(c)));
}

/* --- キャラカード生成 --- */
function makeCard(c) {
  const info  = ELEMENTS[c.element] || { name: c.element };
  const stars = '★'.repeat(c.rarity);

  // キャラクター画像（なければプレースホルダー）
  const imageHTML = c.image
    ? `<img src="${c.image}" alt="${c.name}" loading="lazy"
         onerror="this.parentElement.innerHTML='<div class=\\'char-card__placeholder\\'>${elIconHTML(c.element, 56)}</div>`
    : `<div class="char-card__placeholder">${elIconHTML(c.element, 56)}</div>`;

  // カード右上の元素バッジ（画像アイコン）
  const elBadgeHTML = `
    <div class="char-card__element-icon">
      <img src="images/elements/${c.element}.png"
           alt="${info.name}"
           width="18" height="18"
           style="object-fit:contain"
           onerror="this.style.display='none'">
    </div>`;

  const a = document.createElement('a');
  a.href = `character.html?id=${c.id}`;
  a.className = 'char-card';
  a.dataset.rarity = c.rarity;
  a.dataset.element = c.element;
  a.innerHTML = `
    <div class="char-card__rarity-line"></div>
    <div class="char-card__image" data-element="${c.element}">
      ${imageHTML}
      ${elBadgeHTML}
    </div>
    <div class="char-card__body">
      <div class="char-card__name">${c.name}</div>
      <div class="char-card__meta">
        <span class="char-card__element-text" data-element="${c.element}">
          ${elIconHTML(c.element, 14)} ${info.name}
        </span>
        <span class="char-card__stars">${stars}</span>
      </div>
    </div>`;
  return a;
}

function showGridError() {
  const grid = document.getElementById('characterGrid');
  grid.innerHTML = `
    <div class="error-state" style="grid-column:1/-1">
      <h2>⚠️ 読み込みエラー</h2>
      <p>キャラクターデータの取得に失敗しました。<br>
     管理者に連絡してください。</code>）</p>
    </div>`;
}
