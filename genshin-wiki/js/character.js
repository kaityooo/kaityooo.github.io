/**
 * character.js — キャラクター詳細ページ
 *
 * 主な変更点（UI再設計版）:
 *  - 倍率テーブルを Lv.1〜15 全列横並び表示に変更
 *  - スライダーで「現在レベル列」をハイライト
 *  - 全セクションをカード形式で統一
 */

/* --- 定数 --- */
const ELEMENTS = {
  pyro:    { name: '炎' },
  hydro:   { name: '水' },
  anemo:   { name: '風' },
  electro: { name: '雷' },
  dendro:  { name: '草' },
  cryo:    { name: '氷' },
  geo:     { name: '岩' },
};

/** 元素アイコン画像の <img> HTMLを返す */
function elIconHTML(element, size = 18) {
  const info = ELEMENTS[element] || { name: element };
  return `<img src="images/elements/${element}.png"
               alt="${info.name}"
               width="${size}" height="${size}"
               style="object-fit:contain;vertical-align:middle"
               onerror="this.style.display='none'">`;
}

const TALENT_TYPES = {
  normal: '通常攻撃',
  skill:  '元素スキル',
  burst:  '元素爆発',
};

const WEAPONS = {
  sword:    '⚔️ 片手剣',
  claymore: '🗡️ 両手剣',
  polearm:  '🔱 長柄武器',
  bow:      '🏹 弓',
  catalyst: '📖 法器',
};

/* --- 初期化 --- */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { showError('キャラクターIDが指定されていません。'); return; }

  try {
    const data = await fetch('data/characters.json').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    const char = data.characters.find(c => c.id === id);
    if (!char) { showError(`ID "${id}" のキャラクターが見つかりません。`); return; }

    document.title = `${char.name} — 原神 Wiki`;
    render(char);
  } catch (e) {
    console.error(e);
    showError('データの読み込みに失敗しました。<br>管理者に連絡してください。');
  }
}

/* ============================================================
   メイン描画
   ============================================================ */
function render(char) {
  const el = ELEMENTS[char.element] || { name: char.element };
  const container = document.getElementById('charContent');

  container.innerHTML = `
    <div class="char-detail-layout">
      ${buildHero(char, el)}
      ${buildStats(char)}
      ${buildTalents(char)}
      ${buildPassives(char)}
      ${buildConstellations(char)}
    </div>`;

  // スライダー初期化（DOM生成後）
  initSliders(char);
}

/* ============================================================
   1. ヒーローカード
   ============================================================ */
function buildHero(char, el) {
  const stars = '★'.repeat(char.rarity);
  const rarityClass = `char-rarity--${char.rarity}`;
  const imageHTML = char.image
    ? `<img src="${char.image}" alt="${char.name}"
         onerror="this.parentElement.innerHTML='<div class=\\'char-portrait__placeholder\\'>' + elIconHTML(char.element, 80) + '</div>'">`
    : `<div class="char-portrait__placeholder">${elIconHTML(char.element, 80)}</div>`;

  return `
    <div class="char-hero-card" data-element="${char.element}">
      <div class="char-hero-card__banner" style="background:var(--c-${char.element}, var(--gold))"></div>
      <div class="char-hero-card__inner">

        <div class="char-portrait">
          <div class="char-portrait__image-wrap">${imageHTML}</div>
          <div class="char-rarity ${rarityClass}">${stars}</div>
        </div>

        <div class="char-info">
          <div class="char-info__name-en">${char.nameEn || char.id.toUpperCase()}</div>
          <h1 class="char-info__name-ja">${char.name}</h1>
          <div class="char-info__tags">
            <span class="badge badge--element" data-element="${char.element}"
              style="--el-color:var(--c-${char.element})">
              ${elIconHTML(char.element, 16)} ${el.name}
            </span>
            <span class="badge badge--weapon">${WEAPONS[char.weapon] || char.weapon}</span>
            ${char.region ? `<span class="badge badge--region">🗺️ ${char.region}</span>` : ''}
          </div>
          ${char.description ? `<p class="char-info__description">${char.description}</p>` : ''}
        </div>

      </div>
    </div>`;
}

/* ============================================================
   2. ステータス
   ============================================================ */
function buildStats(char) {
  const s = char.stats;
  if (!s) return '';

  return `
    <div class="stats-section">
      <h2 class="section-title">基礎ステータス</h2>
      <div class="stats-grid">
        <div class="stat-cell">
          <div class="stat-cell__label">BASE HP</div>
          <div class="stat-cell__value">${fmt(s.baseHP)}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__label">BASE ATK</div>
          <div class="stat-cell__value">${fmt(s.baseATK)}</div>
        </div>
        <div class="stat-cell">
          <div class="stat-cell__label">BASE DEF</div>
          <div class="stat-cell__value">${fmt(s.baseDEF)}</div>
        </div>
        ${s.ascensionStat ? `
        <div class="stat-cell">
          <div class="stat-cell__label">突破ステータス</div>
          <div class="stat-cell__value" style="font-size:0.95rem">${s.ascensionStat}</div>
          <div class="stat-cell__unit">${s.ascensionValue || ''}</div>
        </div>` : ''}
        ${s.specialStat ? `
        <div class="stat-cell stat-cell--special">
          <div class="stat-cell__label">特殊ステータス</div>
          <div class="stat-cell__value">${s.specialStat}</div>
          <div class="stat-cell__unit">${s.specialValue || ''}</div>
        </div>` : ''}
      </div>
    </div>`;
}

/* ============================================================
   3. 天賦セクション
   ============================================================ */
function buildTalents(char) {
  if (!char.talents?.length) return '';
  return `
    <div class="talents-section">
      <h2 class="section-title">天賦</h2>
      ${char.talents.map(t => buildTalentCard(t)).join('')}
    </div>`;
}

function buildTalentCard(talent) {
  const typeLabel = TALENT_TYPES[talent.type] || talent.type;
  const hasMultipliers = talent.multipliers?.length > 0;

  return `
    <div class="talent-card">
      <div class="talent-card__header">
        <span class="talent-type-badge talent-type-badge--${talent.type}">${typeLabel}</span>
        <span class="talent-card__name">${talent.name}</span>
      </div>
      <div class="talent-card__body">
        <p class="talent-card__description">${talent.description || ''}</p>
        ${hasMultipliers ? `
          <!-- スライダー -->
          <div class="talent-level-control">
            <span class="talent-level-control__label">天賦 Lv.</span>
            <span class="talent-level-control__current" id="lv_${talent.id}">1</span>
            <input type="range" min="1" max="15" value="1"
              class="level-slider"
              id="slider_${talent.id}"
              data-talent-id="${talent.id}"
              style="--pct:0%"
              aria-label="天賦レベル" />
          </div>
          <!-- 倍率テーブル（Lv1〜15 全列） -->
          ${buildMultiplierTable(talent)}
        ` : ''}
      </div>
    </div>`;
}

/* ============================================================
   4. 倍率テーブル（Lv.1〜15 全列横並び）
   ============================================================ */
function buildMultiplierTable(talent) {
  const LEVELS = Array.from({length: 15}, (_, i) => i + 1); // [1,2,...,15]

  // ヘッダー行
  const headerCells = LEVELS.map(lv =>
    `<th data-lv="${lv}" class="${lv === 1 ? 'is-active-level' : ''}" id="th_${talent.id}_${lv}">Lv.${lv}</th>`
  ).join('');

  // データ行（倍率ごと）
  const rows = talent.multipliers.map(m => {
    const cells = LEVELS.map(lv => {
      const idx = Math.min(lv - 1, m.values.length - 1);
      const val = m.values[idx] ?? '—';
      return `<td data-lv="${lv}" class="${lv === 1 ? 'is-active-level' : ''}" id="td_${talent.id}_${sanitize(m.label)}_${lv}">${fmtMult(val)}</td>`;
    }).join('');
    return `<tr><td>${m.label}</td>${cells}</tr>`;
  }).join('');

  return `
    <div class="multiplier-table-wrap">
      <table class="multiplier-table">
        <thead>
          <tr>
            <th>攻撃項目</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ============================================================
   5. スライダー初期化（DOM生成後に実行）
   ============================================================ */
function initSliders(char) {
  char.talents?.forEach(talent => {
    if (!talent.multipliers?.length) return;

    const slider  = document.getElementById(`slider_${talent.id}`);
    const display = document.getElementById(`lv_${talent.id}`);
    if (!slider) return;

    slider.addEventListener('input', () => {
      const lv = parseInt(slider.value, 10);

      // レベル数値更新
      if (display) display.textContent = lv;

      // スライダーの塗り（CSSカスタムプロパティ）
      slider.style.setProperty('--pct', `${((lv - 1) / 14) * 100}%`);

      // テーブルのハイライト列を切り替える
      const tableWrap = slider.closest('.talent-card__body').querySelector('.multiplier-table-wrap');
      if (!tableWrap) return;

      // 全セルのハイライトをいったん除去
      tableWrap.querySelectorAll('.is-active-level').forEach(el => el.classList.remove('is-active-level'));

      // 選択中レベルの th / td にクラスを付与
      tableWrap.querySelectorAll(`th[data-lv="${lv}"], td[data-lv="${lv}"]`).forEach(el => {
        el.classList.add('is-active-level');
      });
    });
  });
}

/* ============================================================
   6. 固有天賦
   ============================================================ */
function buildPassives(char) {
  if (!char.passiveTalents?.length) return '';
  return `
    <div class="passives-section">
      <h2 class="section-title">固有天賦</h2>
      <div class="passives-grid">
        ${char.passiveTalents.map(p => `
          <div class="passive-card">
            <div class="passive-card__name">${p.name}</div>
            <div class="passive-card__desc">${p.description}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ============================================================
   7. 命ノ星座
   ============================================================ */
function buildConstellations(char) {
  if (!char.constellations?.length) return '';
  return `
    <div class="constellations-section">
      <h2 class="section-title">命ノ星座</h2>
      <div class="constellation-list">
        ${char.constellations.map((c, i) => `
          <div class="constellation-card">
            <div class="constellation-card__num">C${i + 1}</div>
            <div class="constellation-card__content">
              <div class="constellation-card__name">${c.name}</div>
              <div class="constellation-card__effect">${c.effect}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ============================================================
   ユーティリティ
   ============================================================ */

/** 数値を 3桁カンマ区切りにフォーマット */
function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('ja-JP');
}

/** 倍率をフォーマット（小数1桁 + % 付与） */
function fmtMult(v) {
  if (v == null || v === '—') return '—';
  const n = Number(v);
  return isNaN(n) ? v : `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

/** 文字列を HTML id に使える形式にサニタイズ */
function sanitize(s) {
  return s.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function showError(msg) {
  document.getElementById('charContent').innerHTML = `
    <div class="error-state">
      <h2>⚠️ キャラクターが見つかりません</h2>
      <p>${msg}</p>
      <div style="margin-top:20px">
        <a href="index.html" class="back-btn">← 一覧に戻る</a>
      </div>
    </div>`;
}
