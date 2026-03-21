/**
 * create.js — キャラクター作成・編集フォーム スクリプト
 * ============================================================
 * 機能:
 *   1. フォーム入力 → キャラクターJSON生成
 *   2. 既存 {id}.json 読み込み → フォーム自動入力（編集）
 *   3. 編集後 → {id}.json としてダウンロード
 *   4. data/index.json の管理補助
 * ============================================================
 */

/* ── 元素・武器・天賦定数 ── */

const ELEMENTS = [
  { value: 'pyro',    label: '炎 (Pyro)',    color: 'var(--c-pyro)' },
  { value: 'hydro',   label: '水 (Hydro)',   color: 'var(--c-hydro)' },
  { value: 'anemo',   label: '風 (Anemo)',   color: 'var(--c-anemo)' },
  { value: 'electro', label: '雷 (Electro)', color: 'var(--c-electro)' },
  { value: 'dendro',  label: '草 (Dendro)',  color: 'var(--c-dendro)' },
  { value: 'cryo',    label: '氷 (Cryo)',    color: 'var(--c-cryo)' },
  { value: 'geo',     label: '岩 (Geo)',     color: 'var(--c-geo)' },
];

const TALENT_TYPES = [
  { value: 'normal', label: '通常攻撃' },
  { value: 'skill',  label: '元素スキル' },
  { value: 'burst',  label: '元素爆発' },
];

const WEAPONS = {
  sword:    '⚔️ 片手剣',
  claymore: '🗡️ 両手剣',
  polearm:  '🔱 長柄武器',
  bow:      '🏹 弓',
  catalyst: '📖 法器',
};

const MULT_SUGGESTIONS = [
  '1段ダメージ', '2段ダメージ', '3段ダメージ', '4段ダメージ', '5段ダメージ',
  '6段ダメージ', '重撃ダメージ', '落下攻撃ダメージ',
  'スキルダメージ', '爆発ダメージ', 'HP回復量',
];

/* ── 状態 ── */

let talentCounter  = 0;
let passiveCounter = 0;
let loadedIndexData = null; // data/index.json のキャッシュ

/* ── 初期化 ── */

/**
 * initFormPage — 認証後にフォームを初期化する
 * guardPage() のコールバックまたは DOMContentLoaded から呼ばれる
 */
function initFormPage() {
  initElementSelector();
  initTalentSection();
  initPassiveSection();
  initConstellationSection();
  initJsonActions();

  // デフォルト天賦3つを追加（通常・スキル・爆発）
  addTalentBlock('normal');
  addTalentBlock('skill');
  addTalentBlock('burst');

  // デフォルト固有天賦を1つ追加
  addPassiveBlock();

  // リアルタイムJSON更新（入力ごとに400ms遅延）
  const form = document.getElementById('formMain');
  if (form) {
    form.addEventListener('input',  debounce(generateJSON, 400));
    form.addEventListener('change', debounce(generateJSON, 400));
  }

  // バックグラウンドで data/index.json を取得（index.json管理補助用）
  fetchIndexJson();
}

// DOMContentLoaded でも動作（直接アクセス時）
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('formMain')) initFormPage();
});

/* ============================================================
   1. 元素セレクター
   ============================================================ */

function initElementSelector() {
  const select  = document.getElementById('elementSelect');
  const preview = document.getElementById('elementPreview');
  select?.addEventListener('change', () => {
    updateElementPreview(select.value, preview);
    generateJSON();
  });
}

function updateElementPreview(value, preview) {
  if (!preview) return;
  if (!value) {
    preview.classList.remove('has-value');
    preview.innerHTML = `<div class="element-preview__icon-empty">?</div>
      <span class="element-preview__name" style="color:var(--text-muted)">未選択</span>`;
    preview.style.removeProperty('--el-color');
    return;
  }
  const el = ELEMENTS.find(e => e.value === value);
  preview.classList.add('has-value');
  preview.style.setProperty('--el-color', el?.color || '');
  preview.innerHTML = `
    <img class="element-preview__icon"
         src="../images/elements/${value}.png"
         alt="${el?.label || value}"
         width="30" height="30" style="object-fit:contain;border-radius:50%"
         onerror="this.outerHTML='<div class=\\'element-preview__icon-empty\\'>${value[0].toUpperCase()}</div>'"/>
    <span class="element-preview__name">${el?.label || value}</span>`;
}

/** 元素アイコン <img> HTML（フォーム内表示用） */
function elIconHTML(element, size = 18) {
  return `<img src="../images/elements/${element}.png"
               alt="${element}" width="${size}" height="${size}"
               style="object-fit:contain;vertical-align:middle"
               onerror="this.style.display='none'">`;
}

/* ============================================================
   2. 天賦ブロック（動的追加）
   ============================================================ */

function initTalentSection() {
  document.getElementById('addTalentBtn')
    ?.addEventListener('click', () => addTalentBlock('normal'));
}

/**
 * 天賦ブロックを追加する
 * @param {string} defaultType - デフォルトの天賦タイプ
 * @param {Object|null} data   - 初期値データ（編集時に使用）
 */
function addTalentBlock(defaultType = 'normal', data = null) {
  talentCounter++;
  const tid = talentCounter;

  const typeOptions = TALENT_TYPES.map(t =>
    `<option value="${t.value}" ${t.value === defaultType ? 'selected' : ''}>${t.label}</option>`
  ).join('');

  const block = document.createElement('div');
  block.className = 'talent-block';
  block.dataset.talentId = tid;
  block.innerHTML = `
    <div class="talent-block__header">
      <span class="talent-block__num">天賦 ${talentCounter}</span>
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
        <textarea class="field-textarea" data-field="description" rows="3"
          placeholder="天賦の詳細説明..."></textarea>
      </div>
      <div class="multiplier-section">
        <div class="multiplier-section__head">
          <span class="multiplier-section__title">⚔ 攻撃倍率 (Lv.1〜15)</span>
        </div>
        <div class="mult-rows" id="multRows_${tid}"></div>
        <div class="multiplier-section__foot">
          <button type="button" class="btn-add" onclick="addMultRow(${tid})">
            <span class="btn-add__icon">+</span> 倍率項目を追加
          </button>
        </div>
      </div>
    </div>`;

  document.getElementById('talentBlocks').appendChild(block);

  // data がある場合は既存データで埋める、なければデフォルト1行追加
  if (data) {
    block.querySelector('[data-field="name"]').value        = data.name        || '';
    block.querySelector('[data-field="description"]').value = data.description || '';
    block.querySelector('[data-field="type"]').value        = data.type        || defaultType;

    // 倍率行を data から生成
    const multContainer = document.getElementById(`multRows_${tid}`);
    if (data.multipliers?.length) {
      data.multipliers.forEach(m => {
        addMultRow(tid);
        populateLastMultRow(multContainer, m);
      });
    } else {
      addMultRow(tid); // 倍率なし → デフォルト1行
    }
  } else {
    addMultRow(tid); // 新規 → デフォルト1行
  }

  refreshTalentNumbers();
  generateJSON();
}

function removeTalentBlock(tid) {
  document.querySelector(`[data-talent-id="${tid}"]`)?.remove();
  refreshTalentNumbers();
  generateJSON();
}

function refreshTalentNumbers() {
  document.querySelectorAll('.talent-block').forEach((block, i) => {
    const numEl = block.querySelector('.talent-block__num');
    if (numEl) numEl.textContent = `天賦 ${i + 1}`;
  });
}

/* ============================================================
   3. 倍率行（動的追加）
   ============================================================ */

function addMultRow(tid) {
  const container = document.getElementById(`multRows_${tid}`);
  if (!container) return;

  const rowIdx     = container.querySelectorAll('.mult-row').length;
  const suggestion = MULT_SUGGESTIONS[rowIdx % MULT_SUGGESTIONS.length] || '';

  // Lv.1-15 の入力グループ（5列×3行）
  const levelInputs = Array.from({length: 15}, (_, i) => {
    const lv = i + 1;
    return `<div class="mult-level-group">
        <div class="mult-level-group__label">Lv.${lv}</div>
        <input type="number" class="mult-level-group__input"
               data-lv="${lv}" min="0" max="9999" step="0.1" placeholder="-">
      </div>`;
  }).join('');

  const row = document.createElement('div');
  row.className = 'mult-row';
  row.innerHTML = `
    <div class="mult-row__top">
      <input type="text" class="mult-row__label-input"
             placeholder="項目名（例: ${suggestion}）" data-mult-label>
      <label class="mult-percent-toggle" title="% を付けて表示する">
        <input type="checkbox" class="mult-percent-check" checked>
        <span class="mult-percent-text">%</span>
      </label>
      <button type="button" class="btn-delete"
              onclick="this.closest('.mult-row').remove(); generateJSON();" title="削除">×</button>
    </div>
    <div class="mult-row__levels">${levelInputs}</div>`;

  container.appendChild(row);
  generateJSON();
}

/**
 * 直前に追加した倍率行をデータで埋める
 * @param {HTMLElement} container - .mult-rows 要素
 * @param {Object} data - { label, usePercent, values }
 */
function populateLastMultRow(container, data) {
  const rows   = container.querySelectorAll('.mult-row');
  const newRow = rows[rows.length - 1];
  if (!newRow) return;

  const labelInput   = newRow.querySelector('[data-mult-label]');
  const percentCheck = newRow.querySelector('.mult-percent-check');

  if (labelInput)   labelInput.value   = data.label || '';
  if (percentCheck) percentCheck.checked = data.usePercent !== false;

  // Lv.1-15 の値をセット（null は空欄のまま）
  data.values?.forEach((val, i) => {
    const lvInput = newRow.querySelector(`[data-lv="${i + 1}"]`);
    if (lvInput && val !== null && val !== undefined) {
      lvInput.value = val;
    }
  });
}

/* ============================================================
   4. 固有天賦ブロック（動的追加）
   ============================================================ */

function initPassiveSection() {
  document.getElementById('addPassiveBtn')
    ?.addEventListener('click', () => addPassiveBlock());
}

/**
 * 固有天賦ブロックを追加する
 * @param {Object|null} data - 初期値データ（編集時に使用）
 */
function addPassiveBlock(data = null) {
  passiveCounter++;
  const pid = passiveCounter;

  const block = document.createElement('div');
  block.className = 'passive-block';
  block.dataset.passiveId = pid;
  block.innerHTML = `
    <div class="passive-block__num">固有 ${pid}</div>
    <div class="field">
      <label class="field-label">天賦名</label>
      <input type="text" class="field-input" data-field="name"
             placeholder="例: 赤蝶転生" value="${data?.name || ''}">
    </div>
    <div class="field">
      <label class="field-label">説明</label>
      <textarea class="field-textarea" data-field="description" rows="3"
        placeholder="固有天賦の効果説明...">${data?.description || ''}</textarea>
    </div>
    <button type="button" class="btn-delete"
      onclick="removePassiveBlock(${pid})"
      style="position:absolute;bottom:10px;right:10px" title="削除">×</button>`;

  document.getElementById('passiveBlocks').appendChild(block);
  refreshPassiveNumbers();
  generateJSON();
}

function removePassiveBlock(pid) {
  document.querySelector(`[data-passive-id="${pid}"]`)?.remove();
  refreshPassiveNumbers();
  generateJSON();
}

function refreshPassiveNumbers() {
  document.querySelectorAll('.passive-block').forEach((block, i) => {
    const numEl = block.querySelector('.passive-block__num');
    if (numEl) numEl.textContent = `固有 ${i + 1}`;
  });
}

/* ============================================================
   5. 命ノ星座（固定C1-C6）
   ============================================================ */

function initConstellationSection() {
  const container = document.getElementById('constellationBlocks');
  for (let i = 1; i <= 6; i++) {
    const block = document.createElement('div');
    block.className = 'constellation-block';
    block.innerHTML = `
      <div class="constellation-block__num">C${i}</div>
      <div class="constellation-block__fields">
        <div class="field">
          <input type="text" class="field-input"
                 data-const-field="name" data-const="${i}"
                 placeholder="星座名（例: 劇中の呼び声）">
        </div>
        <div class="field">
          <textarea class="field-textarea"
                    data-const-field="effect" data-const="${i}"
                    rows="2" placeholder="効果説明..."></textarea>
        </div>
      </div>`;
    container.appendChild(block);
  }
}

/* ============================================================
   6. フォーム自動入力（既存JSONを読み込んで編集）
   ============================================================ */

/**
 * 個別キャラクターJSONを読み込み、フォームに自動入力する
 * @param {Event} event - file input の change イベント
 */
async function handleLoadCharacterJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const char = JSON.parse(text);

    // 基本的なバリデーション
    if (!char.id || !char.name) {
      throw new Error('"id" または "name" フィールドがありません');
    }

    populateForm(char);

  } catch (err) {
    console.error('Load error:', err);
    showToast(`⚠️ 読み込みエラー: ${err.message}`, 'error');
  }

  // 同じファイルを再選択できるようリセット
  event.target.value = '';
}

/**
 * キャラクターオブジェクトをフォーム全体に反映する
 * @param {Object} char - キャラクターデータ
 */
function populateForm(char) {
  /* ── 基本情報 ─────────────────────────────────── */
  setVal('charId',    char.id);
  setVal('charName',  char.name);
  setVal('charNameEn', char.nameEn);
  setVal('charRegion', char.region);
  setVal('charDesc',   char.description);

  // 元素セレクター
  const elSelect = document.getElementById('elementSelect');
  if (elSelect) {
    elSelect.value = char.element || '';
    updateElementPreview(char.element || '', document.getElementById('elementPreview'));
  }

  // 武器種
  const wpSelect = document.getElementById('weaponSelect');
  if (wpSelect) wpSelect.value = char.weapon || '';

  // レアリティラジオ
  const rarityRadio = document.querySelector(`input[name="rarity"][value="${char.rarity}"]`);
  if (rarityRadio) rarityRadio.checked = true;

  /* ── ステータス ──────────────────────────────── */
  const s = char.stats || {};
  setVal('baseHP',        s.baseHP);
  setVal('baseATK',       s.baseATK);
  setVal('baseDEF',       s.baseDEF);
  setVal('ascensionStat', s.ascensionStat);
  setVal('ascensionValue', s.ascensionValue);
  setVal('specialStat',   s.specialStat);
  setVal('specialValue',  s.specialValue);

  /* ── 天賦 ────────────────────────────────────── */
  // 既存ブロックを全削除して再構築
  document.getElementById('talentBlocks').innerHTML = '';
  talentCounter = 0;

  if (char.talents?.length) {
    char.talents.forEach(t => addTalentBlock(t.type || 'normal', t));
  } else {
    addTalentBlock('normal');
  }

  /* ── 固有天賦 ────────────────────────────────── */
  document.getElementById('passiveBlocks').innerHTML = '';
  passiveCounter = 0;

  if (char.passiveTalents?.length) {
    char.passiveTalents.forEach(p => addPassiveBlock(p));
  } else {
    addPassiveBlock();
  }

  /* ── 命ノ星座 ────────────────────────────────── */
  char.constellations?.forEach((c, i) => {
    const num = i + 1;
    const nameEl   = document.querySelector(`[data-const="${num}"][data-const-field="name"]`);
    const effectEl = document.querySelector(`[data-const="${num}"][data-const-field="effect"]`);
    if (nameEl)   nameEl.value   = c.name   || '';
    if (effectEl) effectEl.value = c.effect || '';
  });

  /* ── 完了 ────────────────────────────────────── */
  generateJSON();
  showToast(`✅ 「${char.name}」のデータを読み込みました`, 'success');

  // 読み込んだキャラの情報を表示
  const infoEl = document.getElementById('loadedCharInfo');
  if (infoEl) {
    infoEl.textContent = `編集中: ${char.name}（ID: ${char.id}）`;
    infoEl.style.display = 'block';
  }

  // index.json ヘルパーを更新
  updateIndexHelper(char.id);
}

/* ============================================================
   7. JSON 生成
   ============================================================ */

function initJsonActions() {
  document.getElementById('generateBtn')?.addEventListener('click', () => generateJSON(true));
  document.getElementById('copyBtn')?.addEventListener('click', copyJSON);
  document.getElementById('downloadBtn')?.addEventListener('click', downloadJSON);
  document.getElementById('clearBtn')?.addEventListener('click', clearForm);

  // キャラクターJSON 読み込み（編集用）
  document.getElementById('charJsonFile')?.addEventListener('change', handleLoadCharacterJson);

  // index.json ダウンロード
  document.getElementById('downloadIndexBtn')?.addEventListener('click', downloadUpdatedIndex);
}

function generateJSON(userTriggered = false) {
  try {
    const obj  = collectFormData();
    const json = JSON.stringify(obj, null, 2);

    const output = document.getElementById('jsonOutput');
    if (output) output.value = json;

    updatePreviewStatus(obj);
    if (userTriggered) showToast('✅ JSONを生成しました', 'success');

    // index.json ヘルパーを更新
    if (obj.id && obj.id !== `char_${Date.now()}`) {
      updateIndexHelper(obj.id);
    }

  } catch (e) {
    console.error('JSON generation error:', e);
    if (userTriggered) showToast('⚠️ エラーが発生しました', 'error');
  }
}

/* ── フォームデータ収集 ── */

function collectFormData() {
  const id     = v('charId');
  const rarity = parseInt(document.querySelector('input[name="rarity"]:checked')?.value || '5');

  const stats = {
    baseHP:         numOrNull('baseHP'),
    baseATK:        numOrNull('baseATK'),
    baseDEF:        numOrNull('baseDEF'),
    ascensionStat:  v('ascensionStat')  || undefined,
    ascensionValue: v('ascensionValue') || undefined,
    specialStat:    v('specialStat')    || undefined,
    specialValue:   v('specialValue')   || undefined,
  };
  cleanObj(stats);

  return {
    id:             id     || `char_${Date.now()}`,
    name:           v('charName')  || '名称未設定',
    nameEn:         v('charNameEn') || '',
    element:        v('elementSelect'),
    weapon:         v('weaponSelect'),
    rarity,
    region:         v('charRegion') || '',
    image:          `images/characters/${id || 'unknown'}.png`,
    description:    nlToBr(v('charDesc')) || '',
    stats,
    talents:          collectTalents(),
    passiveTalents:   collectPassives(),
    constellations:   collectConstellations(),
  };
}

function collectTalents() {
  return Array.from(document.querySelectorAll('.talent-block')).map((block, idx) => ({
    id:          `${block.querySelector('[data-field="type"]')?.value || 'normal'}_${idx + 1}`,
    type:        block.querySelector('[data-field="type"]')?.value || 'normal',
    name:        block.querySelector('[data-field="name"]')?.value || '',
    description: nlToBr(block.querySelector('[data-field="description"]')?.value || ''),
    multipliers: collectMultipliers(block),
  }));
}

function collectMultipliers(block) {
  return Array.from(block.querySelectorAll('.mult-row')).map(row => {
    const label      = row.querySelector('[data-mult-label]')?.value || '';
    const usePercent = row.querySelector('.mult-percent-check')?.checked !== false;
    const values = Array.from({length: 15}, (_, i) => {
      const raw = row.querySelector(`[data-lv="${i + 1}"]`)?.value?.trim();
      if (!raw) return null;
      const n = parseFloat(raw);
      return isNaN(n) ? null : n;
    });
    return { label, usePercent, values };
  }).filter(m => m.label || m.values.some(v => v !== null));
}

function collectPassives() {
  return Array.from(document.querySelectorAll('.passive-block')).map(block => ({
    name:        block.querySelector('[data-field="name"]')?.value || '',
    description: nlToBr(block.querySelector('[data-field="description"]')?.value || ''),
  })).filter(p => p.name || p.description);
}

function collectConstellations() {
  return Array.from({length: 6}, (_, i) => ({
    name:   document.querySelector(`[data-const="${i+1}"][data-const-field="name"]`)?.value   || '',
    effect: nlToBr(document.querySelector(`[data-const="${i+1}"][data-const-field="effect"]`)?.value || ''),
  }));
}

/* ============================================================
   8. JSON コピー / ダウンロード
   ============================================================ */

async function copyJSON() {
  const text = document.getElementById('jsonOutput')?.value || '';
  if (!text) { showToast('⚠️ JSONが生成されていません', 'error'); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ コピーしました！', 'success');
  } catch {
    document.getElementById('jsonOutput')?.select();
    document.execCommand('copy');
    showToast('✅ コピーしました！', 'success');
  }
}

function downloadJSON() {
  const text = document.getElementById('jsonOutput')?.value || '';
  if (!text) { showToast('⚠️ JSONが生成されていません', 'error'); return; }

  let fileName = 'character.json';
  try {
    const obj = JSON.parse(text);
    fileName = `${obj.id || 'character'}.json`;
  } catch { /* ignore */ }

  downloadFile(text, fileName, 'application/json');
  showToast(`✅ ${fileName} をダウンロードしました`, 'success');

  // index.json ヘルパーを表示
  try {
    const obj = JSON.parse(text);
    if (obj.id) updateIndexHelper(obj.id);
  } catch { /* ignore */ }
}

/* ============================================================
   9. data/index.json 管理補助
   ============================================================ */

/** バックグラウンドで data/index.json を取得 */
async function fetchIndexJson() {
  try {
    const res = await fetch('../data/index.json');
    if (res.ok) {
      loadedIndexData = await res.json();
      console.log('[create.js] data/index.json を読み込みました:', loadedIndexData.characters?.length, '件');
    }
  } catch {
    // GitHub Pages でパスが違う場合など。サイレントに失敗させる
  }
}

/**
 * index.json ヘルパーUIを更新する
 * キャラクターID が index.json に含まれているか確認して案内する
 */
function updateIndexHelper(charId) {
  const helperEl = document.getElementById('indexHelper');
  const addNoteEl = document.getElementById('indexAddNote');
  if (!helperEl || !addNoteEl || !charId) return;

  helperEl.style.display = 'block';

  if (!loadedIndexData) {
    addNoteEl.innerHTML = `
      <code style="font-size:.72rem">data/index.json</code> の
      <code style="font-size:.72rem">"characters"</code> 配列に
      <code style="font-size:.72rem">"${charId}"</code> を追加してください。`;
    document.getElementById('downloadIndexBtn').style.display = 'none';
    return;
  }

  const exists = loadedIndexData.characters?.includes(charId);
  if (exists) {
    addNoteEl.innerHTML = `✅ <code style="font-size:.72rem">"${charId}"</code> は既に index.json に含まれています`;
    document.getElementById('downloadIndexBtn').style.display = 'none';
  } else {
    addNoteEl.innerHTML = `
      <code style="font-size:.72rem">"${charId}"</code> は index.json に未登録です。
      下のボタンから更新した index.json をダウンロードできます。`;
    document.getElementById('downloadIndexBtn').style.display = 'flex';
  }
}

/** 更新した data/index.json をダウンロードする */
function downloadUpdatedIndex() {
  const output = document.getElementById('jsonOutput')?.value || '';
  let charId;
  try {
    charId = JSON.parse(output).id;
  } catch { /* ignore */ }

  if (!charId) {
    showToast('⚠️ まずJSONを生成してください', 'error');
    return;
  }

  // 既存の index.json をベースに新しいIDを追加
  const base        = loadedIndexData ? JSON.parse(JSON.stringify(loadedIndexData)) : { characters: [] };
  const alreadyIn   = base.characters.includes(charId);
  if (!alreadyIn) base.characters.push(charId);

  downloadFile(JSON.stringify(base, null, 2), 'index.json', 'application/json');
  showToast('✅ index.json をダウンロードしました', 'success');

  // キャッシュを更新
  loadedIndexData = base;
  updateIndexHelper(charId);
}

/* ============================================================
   10. フォームリセット
   ============================================================ */

function clearForm() {
  if (!confirm('フォームの内容をリセットしますか？')) return;

  document.getElementById('formMain')?.reset();
  document.getElementById('talentBlocks').innerHTML   = '';
  document.getElementById('passiveBlocks').innerHTML  = '';
  document.getElementById('constellationBlocks').innerHTML = '';
  document.getElementById('jsonOutput').value = '';

  talentCounter  = 0;
  passiveCounter = 0;

  // 星座フォームを再生成
  initConstellationSection();

  // デフォルト天賦を再追加
  addTalentBlock('normal');
  addTalentBlock('skill');
  addTalentBlock('burst');
  addPassiveBlock();

  updateElementPreview('', document.getElementById('elementPreview'));
  updatePreviewStatus(null);

  // 読み込み情報をクリア
  const infoEl = document.getElementById('loadedCharInfo');
  if (infoEl) { infoEl.textContent = ''; infoEl.style.display = 'none'; }
  const helperEl = document.getElementById('indexHelper');
  if (helperEl) helperEl.style.display = 'none';

  showToast('🗑️ リセットしました', 'success');
}

/* ============================================================
   11. プレビューステータス
   ============================================================ */

function updatePreviewStatus(obj) {
  const badge = document.getElementById('previewStatus');
  if (!badge) return;

  if (!obj) {
    badge.textContent = '未生成';
    badge.className   = 'preview-card__status';
    return;
  }

  const isValid = obj.id && !obj.id.startsWith('char_') && obj.name !== '名称未設定';
  badge.textContent = isValid ? '✓ 有効' : '入力中';
  badge.className   = `preview-card__status${isValid ? ' is-valid' : ''}`;
}

/* ============================================================
   ユーティリティ
   ============================================================ */

/** フォームフィールドの値を取得 */
function v(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

/** テキスト内の改行（\n）を <br> タグに変換する */
function nlToBr(text) {
  if (!text) return '';
  return String(text).replace(/\n/g, '<br>');
}
/** フォームフィールドに値をセット */
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.value = val;
}

/** 数値フィールドの値を返す（空の場合 null） */
function numOrNull(id) {
  const val = document.getElementById(id)?.value?.trim();
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

/** オブジェクトから null/undefined のキーを除去 */
function cleanObj(obj) {
  Object.keys(obj).forEach(key => { if (obj[key] == null) delete obj[key]; });
}

/** ファイルダウンロードを実行 */
function downloadFile(content, fileName, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** debounce */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** トースト通知 */
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = Object.assign(document.createElement('div'), { id: 'toast', className: 'toast' });
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className   = `toast is-${type}`;
  void toast.offsetWidth;
  toast.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}
