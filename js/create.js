/* ==========================================================
   定数
   ========================================================== */

/** 天賦タイプ */
const TALENT_TYPES = [
  { value: 'normal', label: '通常攻撃' },
  { value: 'skill',  label: '元素スキル' },
  { value: 'burst',  label: '元素爆発' },
];

/** 元素定義（アイコン画像パス + 表示名 + CSSカラー変数） */
const ELEMENTS = [
  { value: 'pyro',    label: '炎 (Pyro)',    color: 'var(--c-pyro)' },
  { value: 'hydro',   label: '水 (Hydro)',   color: 'var(--c-hydro)' },
  { value: 'anemo',   label: '風 (Anemo)',   color: 'var(--c-anemo)' },
  { value: 'electro', label: '雷 (Electro)', color: 'var(--c-electro)' },
  { value: 'dendro',  label: '草 (Dendro)',  color: 'var(--c-dendro)' },
  { value: 'cryo',    label: '氷 (Cryo)',    color: 'var(--c-cryo)' },
  { value: 'geo',     label: '岩 (Geo)',     color: 'var(--c-geo)' },
];

/** 元素アイコン <img> HTMLを返す（create.js用） */
function elIconHTML(element, size = 18) {
  return `<img src="images/elements/${element}.png"
               alt="${element}" width="${size}" height="${size}"
               style="object-fit:contain;vertical-align:middle"
               onerror="this.style.display='none'">`;
}

/** 武器種 */
const WEAPONS = [
  { value: 'sword',    label: '片手剣 (Sword)' },
  { value: 'claymore', label: '両手剣 (Claymore)' },
  { value: 'polearm',  label: '長柄武器 (Polearm)' },
  { value: 'bow',      label: '弓 (Bow)' },
  { value: 'catalyst', label: '法器 (Catalyst)' },
];

/** 天賦カウンター（ユニークIDに使用） */
let talentCounter  = 0;
/** 固有天賦カウンター */
let passiveCounter = 0;

/* ==========================================================
   初期化
   ========================================================== */
/**
 * initFormPage — 管理フォームを初期化する
 * 通常は DOMContentLoaded で自動実行。
 * 認証済みページ（tools-fysmrqjp/）から動的呼び出し可。
 */
function initFormPage() {
  initElementSelector();
  initTalentSection();
  initPassiveSection();
  initConstellationSection();
  initJsonActions();

  addTalentBlock('normal');
  addTalentBlock('skill');
  addTalentBlock('burst');

  addPassiveBlock();

  // リアルタイムJSON更新
  const form = document.getElementById('formMain');
  if (form) {
    form.addEventListener('input', debounce(generateJSON, 400));
    form.addEventListener('change', debounce(generateJSON, 400));
  }
}

// DOMContentLoaded で自動実行（create-character.html 直接アクセス時）
document.addEventListener('DOMContentLoaded', () => {
  // tools-fysmrqjp 版から動的ロードされた場合スキップ
  if (document.getElementById('formMain')) {
    initFormPage();
  }
});

/* ==========================================================
   1. 元素セレクター
   ========================================================== */
function initElementSelector() {
  const select  = document.getElementById('elementSelect');
  const preview = document.getElementById('elementPreview');

  // セレクトの選択変更に応じてアイコンとカラーを更新
  select.addEventListener('change', () => {
    updateElementPreview(select.value, preview);
    generateJSON();
  });
}


function updateElementPreview(value, preview) {
  if (!value) {
    preview.classList.remove('has-value');
    preview.innerHTML = `
      <div class="element-preview__icon-empty">?</div>
      <span class="element-preview__name" style="color:var(--text-muted)">未選択</span>`;
    preview.style.removeProperty('--el-color');
    return;
  }

  const el = ELEMENTS.find(e => e.value === value);
  const iconSrc = `images/elements/${value}.png`;

  preview.classList.add('has-value');
  preview.style.setProperty('--el-color', el?.color || '');
  preview.innerHTML = `
    <img class="element-preview__icon"
         src="${iconSrc}"
         alt="${el?.label || value}"
         onerror="this.outerHTML='<div class=\\'element-preview__icon-empty\\'>${value[0].toUpperCase()}</div>'"/>
    <span class="element-preview__name">${el?.label || value}</span>`;
}

/* ==========================================================
   2. 天賦（動的追加）
   ========================================================== */
function initTalentSection() {
  const addBtn = document.getElementById('addTalentBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => addTalentBlock('normal'));
  }
}


function addTalentBlock(defaultType = 'normal') {
  talentCounter++;
  const tid = talentCounter;
  const container = document.getElementById('talentBlocks');

  const typeOptions = TALENT_TYPES.map(t =>
    `<option value="${t.value}" ${t.value === defaultType ? 'selected' : ''}>${t.label}</option>`
  ).join('');

  const block = document.createElement('div');
  block.className = 'talent-block';
  block.dataset.talentId = tid;
  block.innerHTML = `
    <div class="talent-block__header">
      <span class="talent-block__num">天賦 ${tid}</span>
      <select class="field-select talent-block__type" data-field="type" style="flex:1;max-width:180px">
        ${typeOptions}
      </select>
      <button type="button" class="btn-delete" onclick="removeTalentBlock(${tid})" title="削除">×</button>
    </div>
    <div class="talent-block__body">
      <div class="field">
        <label class="field-label">天賦名 <span>*</span></label>
        <input type="text" class="field-input" data-field="name" placeholder="例: 剣術・オペラ">
      </div>
      <div class="field">
        <label class="field-label">天賦説明</label>
        <textarea class="field-textarea" data-field="description" placeholder="天賦の詳細説明を入力してください..." rows="3"></textarea>
      </div>
      <!-- 倍率セクション -->
      <div class="multiplier-section">
        <div class="multiplier-section__head">
          <span class="multiplier-section__title">⚔ 攻撃倍率 (Lv.1〜15)</span>
        </div>
        <div class="mult-rows" id="multRows_${tid}">
          <!-- 倍率行は動的追加 -->
        </div>
        <div class="multiplier-section__foot">
          <button type="button" class="btn-add" onclick="addMultRow(${tid})">
            <span class="btn-add__icon">+</span> 倍率項目を追加
          </button>
        </div>
      </div>
    </div>`;

  container.appendChild(block);

  // デフォルト1行追加
  addMultRow(tid);

  // 番号更新
  refreshTalentNumbers();
  generateJSON();
}

/** 天賦ブロックを削除 */
function removeTalentBlock(tid) {
  const block = document.querySelector(`[data-talent-id="${tid}"]`);
  if (block) {
    block.remove();
    refreshTalentNumbers();
    generateJSON();
  }
}

/** 天賦番号を振り直し */
function refreshTalentNumbers() {
  document.querySelectorAll('.talent-block').forEach((block, i) => {
    const numEl = block.querySelector('.talent-block__num');
    if (numEl) numEl.textContent = `天賦 ${i + 1}`;
  });
}

/* ==========================================================
   3. 倍率行（動的追加）
   ========================================================== */

/** 倍率ラベルのサジェスト */
const MULT_SUGGESTIONS = [
  '1段ダメージ', '2段ダメージ', '3段ダメージ', '4段ダメージ', '5段ダメージ',
  '6段ダメージ', '重撃ダメージ', '落下攻撃ダメージ',
  'スキルダメージ', '爆発ダメージ', 'HP回復量',
];

let multSuggestionIdx = 0;

/**
 * 天賦に倍率行を追加
 * @param {number} tid - 天賦ID
 */
function addMultRow(tid) {
  const container = document.getElementById(`multRows_${tid}`);
  if (!container) return;

  const rowIdx = container.querySelectorAll('.mult-row').length;
  const suggestion = MULT_SUGGESTIONS[rowIdx % MULT_SUGGESTIONS.length] || '';

  // Lv.1-15 の入力グループを生成（5列×3行で表示）
  const levelInputs = Array.from({length: 15}, (_, i) => {
    const lv = i + 1;
    return `
      <div class="mult-level-group">
        <div class="mult-level-group__label">Lv.${lv}</div>
        <input type="number"
               class="mult-level-group__input"
               data-lv="${lv}"
               min="0" max="9999" step="0.1"
               placeholder="-">
      </div>`;
  }).join('');

  const row = document.createElement('div');
  row.className = 'mult-row';
  row.innerHTML = `
    <div class="mult-row__top">
      <input type="text"
             class="mult-row__label-input"
             placeholder="項目名（例: ${suggestion}）"
             data-mult-label>
      <button type="button" class="btn-delete" onclick="this.closest('.mult-row').remove(); generateJSON();" title="削除">×</button>
    </div>
    <div class="mult-row__levels">
      ${levelInputs}
    </div>`;

  container.appendChild(row);
  generateJSON();
}

/* ==========================================================
   4. 固有天賦（動的追加）
   ========================================================== */
function initPassiveSection() {
  const addBtn = document.getElementById('addPassiveBtn');
  if (addBtn) {
    addBtn.addEventListener('click', addPassiveBlock);
  }
}

/** 固有天賦ブロックを追加 */
function addPassiveBlock() {
  passiveCounter++;
  const pid = passiveCounter;
  const container = document.getElementById('passiveBlocks');

  const block = document.createElement('div');
  block.className = 'passive-block';
  block.dataset.passiveId = pid;
  block.innerHTML = `
    <div class="passive-block__num">固有 ${pid}</div>
    <div class="field">
      <label class="field-label">天賦名</label>
      <input type="text" class="field-input" data-field="name" placeholder="例: 赤蝶転生">
    </div>
    <div class="field">
      <label class="field-label">説明</label>
      <textarea class="field-textarea" data-field="description" rows="3"
        placeholder="固有天賦の効果説明を入力してください..."></textarea>
    </div>
    <button type="button" class="btn-delete"
      onclick="removePassiveBlock(${pid})"
      style="position:absolute;bottom:10px;right:10px"
      title="削除">×</button>`;

  container.appendChild(block);
  refreshPassiveNumbers();
  generateJSON();
}

/** 固有天賦ブロックを削除 */
function removePassiveBlock(pid) {
  const block = document.querySelector(`[data-passive-id="${pid}"]`);
  if (block) {
    block.remove();
    refreshPassiveNumbers();
    generateJSON();
  }
}

/** 固有天賦番号を振り直し */
function refreshPassiveNumbers() {
  document.querySelectorAll('.passive-block').forEach((block, i) => {
    const numEl = block.querySelector('.passive-block__num');
    if (numEl) numEl.textContent = `固有 ${i + 1}`;
  });
}

/* ==========================================================
   5. 命ノ星座
   ========================================================== */
function initConstellationSection() {
  const container = document.getElementById('constellationBlocks');
  for (let i = 1; i <= 6; i++) {
    const block = document.createElement('div');
    block.className = 'constellation-block';
    block.innerHTML = `
      <div class="constellation-block__num">C${i}</div>
      <div class="constellation-block__fields">
        <div class="field">
          <input type="text" class="field-input" data-const-field="name" data-const="${i}"
                 placeholder="星座名（例: 劇中の呼び声）">
        </div>
        <div class="field">
          <textarea class="field-textarea" data-const-field="effect" data-const="${i}"
                    rows="2" placeholder="効果説明（例: スキルダメージが+15%...）"></textarea>
        </div>
      </div>`;
    container.appendChild(block);
  }
}

/* ==========================================================
   6. JSON生成
   ========================================================== */
function initJsonActions() {
  document.getElementById('generateBtn')?.addEventListener('click', () => {
    generateJSON(true);
  });

  document.getElementById('copyBtn')?.addEventListener('click', copyJSON);
  document.getElementById('downloadBtn')?.addEventListener('click', downloadJSON);
  document.getElementById('clearBtn')?.addEventListener('click', clearForm);
}

/**
 * フォーム全体のデータを元にJSONを生成
 * @param {boolean} userTriggered - ユーザーが明示的にボタンを押した場合true
 */
function generateJSON(userTriggered = false) {
  try {
    const obj = collectFormData();
    const json = JSON.stringify(obj, null, 2);

    const output = document.getElementById('jsonOutput');
    if (output) output.value = json;

    // ステータスバッジ更新
    updatePreviewStatus(obj);

    if (userTriggered) {
      showToast('✅ JSONを生成しました', 'success');
    }
  } catch (e) {
    console.error('JSON生成エラー:', e);
    if (userTriggered) {
      showToast('⚠️ エラーが発生しました', 'error');
    }
  }
}

/**
 * フォームデータを収集してオブジェクトを返す
 * characters.json のキャラクター1件分の構造に対応
 */
function collectFormData() {
  // --- 基本情報 ---
  const id      = v('charId');
  const name    = v('charName');
  const nameEn  = v('charNameEn');
  const element = v('elementSelect');
  const rarity  = parseInt(document.querySelector('input[name="rarity"]:checked')?.value || '5');
  const weapon  = v('weaponSelect');
  const region  = v('charRegion');
  const description = v('charDesc');

  // --- ステータス ---
  const stats = {
    baseHP:          numOrNull('baseHP'),
    baseATK:         numOrNull('baseATK'),
    baseDEF:         numOrNull('baseDEF'),
    ascensionStat:   v('ascensionStat')   || undefined,
    ascensionValue:  v('ascensionValue')  || undefined,
    specialStat:     v('specialStat')     || undefined,
    specialValue:    v('specialValue')    || undefined,
  };

  // undefinedキーを除去
  cleanObj(stats);

  // --- 天賦 ---
  const talents = collectTalents();

  // --- 固有天賦 ---
  const passiveTalents = collectPassives();

  // --- 命ノ星座 ---
  const constellations = collectConstellations();

  // --- 組み---
  return {
    id:             id     || `char_${Date.now()}`,
    name:           name   || '名称未設定',
    nameEn:         nameEn || '',
    element:        element,
    weapon:         weapon,
    rarity:         rarity,
    region:         region || '',
    image:          `images/characters/${id || 'unknown'}.png`,
    description:    description || '',
    stats,
    talents,
    passiveTalents,
    constellations,
  };
}

/**
 * 天賦ブロックのデータを収集
 * @returns {Array}
 */
function collectTalents() {
  const blocks = document.querySelectorAll('.talent-block');
  return Array.from(blocks).map((block, idx) => {
    const tid = block.dataset.talentId;
    const type = block.querySelector('[data-field="type"]')?.value || 'normal';
    const name = block.querySelector('[data-field="name"]')?.value || '';
    const desc = block.querySelector('[data-field="description"]')?.value || '';

    // 倍率行を参照
    const multipliers = collectMultipliers(block);

    return {
      id:          `${type}_${idx + 1}`,
      type,
      name,
      description: desc,
      multipliers,
    };
  });
}

/**
 * 天賦ブロック内の倍率行を参照
 */
function collectMultipliers(block) {
  const rows = block.querySelectorAll('.mult-row');
  return Array.from(rows).map(row => {
    const label = row.querySelector('[data-mult-label]')?.value || '';
    const values = Array.from({length: 15}, (_, i) => {
      const input = row.querySelector(`[data-lv="${i + 1}"]`);
      const raw = input?.value.trim();
      return raw ? parseFloat(raw) : 0;
    });
    return { label, values };
  }).filter(m => m.label || m.values.some(v => v !== 0));
}

/**
 * 固有天賦のデータを収集する
 */
function collectPassives() {
  const blocks = document.querySelectorAll('.passive-block');
  return Array.from(blocks)
    .map(block => ({
      name:        block.querySelector('[data-field="name"]')?.value || '',
      description: block.querySelector('[data-field="description"]')?.value || '',
    }))
    .filter(p => p.name || p.description);
}

/**
 * 命ノ星座のデータを収集する
 */
function collectConstellations() {
  const result = [];
  for (let i = 1; i <= 6; i++) {
    const name   = document.querySelector(`[data-const="${i}"][data-const-field="name"]`)?.value || '';
    const effect = document.querySelector(`[data-const="${i}"][data-const-field="effect"]`)?.value || '';
    result.push({ name, effect });
  }
  return result;
}

/* ==========================================================
   7. JSONコピー / ダウンロード
   ========================================================== */

/** JSONをクリップボードにコピー */
async function copyJSON() {
  const output = document.getElementById('jsonOutput');
  const text = output?.value || '';
  if (!text) { showToast('⚠️ JSONが生成されていません', 'error'); return; }

  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ コピーしました！', 'success');
    flashBtn('copyBtn');
  } catch (e) {
    // フォールバック
    output.select();
    document.execCommand('copy');
    showToast('✅ コピーしました！', 'success');
  }
}

/** JSONファイルをダウンロード */
function downloadJSON() {
  const output = document.getElementById('jsonOutput');
  const text = output?.value || '';
  if (!text) { showToast('⚠️ JSONが生成されていません', 'error'); return; }

  // キャラクターIDをファイル名に
  let fileName;
  try {
    const obj = JSON.parse(text);
    fileName = `${obj.id || 'character'}.json`;
  } catch {
    fileName = 'character.json';
  }

  const blob = new Blob([text], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`✅ ${fileName} をダウンロード`, 'success');
}

/** フォームをリセット */
function clearForm() {
  if (!confirm('フォームの内容をリセットしますか？')) return;
  document.getElementById('formMain').reset();
  document.getElementById('talentBlocks').innerHTML = '';
  document.getElementById('passiveBlocks').innerHTML = '';
  document.getElementById('constellationBlocks').innerHTML = '';
  document.getElementById('jsonOutput').value = '';
  talentCounter  = 0;
  passiveCounter = 0;

  // 再初期化
  initConstellationSection();
  updateElementPreview('', document.getElementById('elementPreview'));
  updatePreviewStatus(null);

  showToast('🗑️ リセットしました', 'success');
}

/* ==========================================================
   8. プレビューステータス更新
   ========================================================== */
function updatePreviewStatus(obj) {
  const badge = document.getElementById('previewStatus');
  if (!badge) return;

  if (!obj) {
    badge.textContent = '未生成';
    badge.className = 'preview-card__status';
    return;
  }

  const hasId   = !!obj.id && obj.id !== `char_${Date.now()}`;
  const hasName = !!obj.name && obj.name !== '名称未設定';

  if (hasId && hasName) {
    badge.textContent = '✓ 有効';
    badge.className = 'preview-card__status is-valid';
  } else {
    badge.textContent = '入力中';
    badge.className = 'preview-card__status';
  }
}

/* ==========================================================
   ユーティリティ
   ========================================================== */

/** トリム済みのフォームフィールドの値を返す */
function v(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

/** 数値フィールドの値を返す（空の場合null） */
function numOrNull(id) {
  const val = document.getElementById(id)?.value?.trim();
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

/** オブジェクトからnull/undefined値のキーを除去 */
function cleanObj(obj) {
  Object.keys(obj).forEach(key => {
    if (obj[key] == null) delete obj[key];
  });
}

/** ボタンを一時的に成功状態 */
function flashBtn(id) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.add('is-success');
  setTimeout(() => btn.classList.remove('is-success'), 2000);
}

/** debounce */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** トースト通知を表示 */
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = msg;
  toast.className = `toast is-${type}`;

  // 強制reflow後にアニメーション
  void toast.offsetWidth;
  toast.classList.add('is-visible');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2600);
}
