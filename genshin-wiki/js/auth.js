/**
 * auth.js — 管理ページ認証モジュール
 * ============================================================
 * GitHub Pages 対応のクライアントサイド認証。
 *
 * 動作フロー:
 *   1. ページロード時に guardPage() を呼び出す
 *   2. 認証済み → コールバック関数を実行（管理画面を描画）
 *   3. 未認証 → ログインフォームを描画（管理コンテンツは一切描画しない）
 *   4. 正しいパスワード → sessionStorage に認証トークンを保存
 *   5. ログアウト → sessionStorage をクリアしてリロード
 *
 * 使い方:
 *   <script src="../js/auth-config.js"></script>
 *   <script src="../js/auth.js"></script>
 *   <script>
 *     guardPage(() => { /* 認証後に実行する処理 *\/ });
 *   </script>
 * ============================================================
 */

/* ============================================================
   内部ユーティリティ
   ============================================================ */

/**
 * 入力文字列の SHA-256 ハッシュを返す（Web Crypto API）
 * @param {string} str
 * @returns {Promise<string>} 小文字16進数ハッシュ
 */
async function sha256(str) {
  const buf  = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * ロックアウト状態を確認・更新する
 * @returns {{ locked: boolean, remaining: number }} ロック状態と残り秒数
 */
function checkLockout() {
  const key      = AUTH_CONFIG.sessionKey + '_lock';
  const raw      = sessionStorage.getItem(key);
  if (!raw) return { locked: false, remaining: 0 };

  const data = JSON.parse(raw);
  const now  = Date.now();

  if (data.attempts >= AUTH_CONFIG.lockout.maxAttempts) {
    const elapsed  = now - data.lastAttempt;
    const remaining = AUTH_CONFIG.lockout.lockDuration - elapsed;
    if (remaining > 0) {
      return { locked: true, remaining: Math.ceil(remaining / 1000) };
    }
    // ロック期間終了 → リセット
    sessionStorage.removeItem(key);
  }
  return { locked: false, remaining: 0 };
}

/**
 * 失敗回数を記録する
 */
function recordFailedAttempt() {
  const key  = AUTH_CONFIG.sessionKey + '_lock';
  const raw  = sessionStorage.getItem(key);
  const data = raw ? JSON.parse(raw) : { attempts: 0, lastAttempt: 0 };

  data.attempts += 1;
  data.lastAttempt = Date.now();
  sessionStorage.setItem(key, JSON.stringify(data));
  return data.attempts;
}

/**
 * 失敗カウンターをリセットする（ログイン成功時）
 */
function clearLockout() {
  sessionStorage.removeItem(AUTH_CONFIG.sessionKey + '_lock');
}

/* ============================================================
   認証状態管理
   ============================================================ */

/**
 * 認証済みかどうかを確認する
 * @returns {boolean}
 */
function isAuthenticated() {
  const raw = sessionStorage.getItem(AUTH_CONFIG.sessionKey);
  if (!raw) return false;

  try {
    const { token, expires } = JSON.parse(raw);
    // 有効期限チェック
    if (Date.now() > expires) {
      sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
      return false;
    }
    // トークン形式チェック（簡易）
    return typeof token === 'string' && token.length === 64;
  } catch {
    return false;
  }
}

/**
 * 認証セッションを保存する
 * @param {string} hash - パスワードのSHA-256ハッシュ
 */
function saveSession(hash) {
  const payload = {
    token:   hash,
    created: Date.now(),
    expires: Date.now() + AUTH_CONFIG.maxAge,
  };
  sessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(payload));
}

/**
 * ログアウト処理
 */
function logout() {
  sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
  clearLockout();
  // ログインページにリダイレクト
  location.reload();
}

/* ============================================================
   ログインUI
   ============================================================ */

/** 認証前にページコンテンツを非表示にする */
function hidePageContent() {
  document.documentElement.style.visibility = 'hidden';
}

/** ログインフォームを描画してコンテンツを保護する */
function showLoginScreen() {
  // <body> を完全にクリア（DOM inject 対策）
  document.body.innerHTML = '';
  document.documentElement.style.visibility = 'visible';
  document.title = 'Login — 原神 Wiki';

  // インラインスタイル（CSSファイルに依存しない）
  const style = document.createElement('style');
  style.textContent = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:'Noto Sans JP',sans-serif;
      background:#111;
      color:#f0f0f0;
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    }
    .login-wrap{
      width:100%;
      max-width:380px;
    }
    .login-logo{
      text-align:center;
      margin-bottom:28px;
    }
    .login-logo h1{
      font-size:1.1rem;
      font-weight:700;
      color:#e8c870;
      letter-spacing:.05em;
    }
    .login-logo p{
      font-size:.72rem;
      color:#555;
      margin-top:4px;
    }
    .login-card{
      background:#1e1e1e;
      border:1px solid rgba(255,255,255,.08);
      border-radius:14px;
      padding:28px 28px 24px;
    }
    .login-card h2{
      font-size:.9rem;
      font-weight:700;
      color:#f0f0f0;
      margin-bottom:20px;
      padding-bottom:10px;
      border-bottom:1px solid rgba(255,255,255,.06);
      display:flex;
      align-items:center;
      gap:8px;
    }
    .form-field{
      display:flex;
      flex-direction:column;
      gap:5px;
      margin-bottom:14px;
    }
    .form-field label{
      font-size:.72rem;
      font-weight:700;
      color:#666;
      letter-spacing:.06em;
      text-transform:uppercase;
    }
    .form-field input{
      width:100%;
      background:#252525;
      border:1px solid rgba(255,255,255,.1);
      border-radius:8px;
      padding:9px 12px;
      color:#f0f0f0;
      font-size:.88rem;
      font-family:inherit;
      outline:none;
      transition:border-color .18s,box-shadow .18s;
    }
    .form-field input:focus{
      border-color:#c8a840;
      box-shadow:0 0 0 2px rgba(200,168,64,.15);
    }
    .login-btn{
      width:100%;
      padding:10px;
      background:rgba(200,168,64,.1);
      border:1px solid #c8a840;
      border-radius:8px;
      color:#e8c870;
      font-size:.88rem;
      font-weight:700;
      font-family:inherit;
      cursor:pointer;
      transition:all .18s;
      margin-top:6px;
    }
    .login-btn:hover{
      background:rgba(200,168,64,.18);
      box-shadow:0 0 12px rgba(200,168,64,.2);
    }
    .login-btn:disabled{
      opacity:.5;
      cursor:not-allowed;
    }
    .login-error{
      background:rgba(232,85,85,.1);
      border:1px solid rgba(232,85,85,.35);
      border-radius:8px;
      padding:9px 12px;
      font-size:.78rem;
      color:#ee8080;
      margin-top:12px;
      display:none;
      line-height:1.6;
    }
    .login-error.show{display:block}
    .login-footer{
      text-align:center;
      margin-top:16px;
      font-size:.7rem;
      color:#444;
    }
    .lockout-timer{
      font-weight:700;
      color:#e8a060;
    }
    @keyframes shake{
      0%,100%{transform:translateX(0)}
      20%,60%{transform:translateX(-6px)}
      40%,80%{transform:translateX(6px)}
    }
    .shake{animation:shake .35s ease}
  `;
  document.head.appendChild(style);

  // ロックアウト確認
  const lockInfo = checkLockout();

  document.body.innerHTML = `
    <div class="login-wrap">
      <div class="login-logo">
        <h1>原神 Wiki</h1>
        <p>管理ツール — アクセス制限ページ</p>
      </div>
      <div class="login-card">
        <h2>🔒 認証が必要です</h2>
        <div class="form-field">
          <label for="pw">パスワード</label>
          <input type="password" id="pw" placeholder="パスワードを入力"
                 autocomplete="current-password"
                 ${lockInfo.locked ? 'disabled' : ''}>
        </div>
        <button class="login-btn" id="loginBtn"
                ${lockInfo.locked ? 'disabled' : ''}>
          ログイン
        </button>
        <div class="login-error" id="loginError"></div>
      </div>
      <div class="login-footer">
        <a href="/" style="color:#444;text-decoration:none">← Wiki トップへ戻る</a>
      </div>
    </div>`;

  const pwInput   = document.getElementById('pw');
  const loginBtn  = document.getElementById('loginBtn');
  const errorDiv  = document.getElementById('loginError');

  // ロック中の場合はカウントダウン表示
  if (lockInfo.locked) {
    startLockoutCountdown(errorDiv, lockInfo.remaining);
  }

  // Enterキー対応
  pwInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  loginBtn?.addEventListener('click', handleLogin);

  // 自動フォーカス
  pwInput?.focus();

  async function handleLogin() {
    const lockNow = checkLockout();
    if (lockNow.locked) return;

    const pw = pwInput.value.trim();
    if (!pw) {
      showError('パスワードを入力してください。');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = '確認中...';

    try {
      const hash = await sha256(pw);

      if (hash === AUTH_CONFIG.passwordHash) {
        // ✅ 認証成功
        clearLockout();
        saveSession(hash);
        location.reload();
      } else {
        // ❌ 認証失敗
        const attempts = recordFailedAttempt();
        const remain   = AUTH_CONFIG.lockout.maxAttempts - attempts;

        // シェイクアニメーション
        document.querySelector('.login-card')?.classList.add('shake');
        setTimeout(() => document.querySelector('.login-card')?.classList.remove('shake'), 400);

        if (remain <= 0) {
          const lock = checkLockout();
          startLockoutCountdown(errorDiv, lock.remaining);
          pwInput.disabled = true;
          loginBtn.disabled = true;
        } else {
          showError(`パスワードが正しくありません。残り ${remain} 回試行できます。`);
          loginBtn.disabled = false;
          loginBtn.textContent = 'ログイン';
        }
        pwInput.value = '';
        pwInput.focus();
      }
    } catch (err) {
      console.error('Auth error:', err);
      showError('認証処理中にエラーが発生しました。');
      loginBtn.disabled = false;
      loginBtn.textContent = 'ログイン';
    }
  }

  function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.classList.add('show');
  }
}

/**
 * ロックアウトのカウントダウンを表示する
 * @param {HTMLElement} el
 * @param {number} seconds - 残り秒数
 */
function startLockoutCountdown(el, seconds) {
  el.classList.add('show');
  let remain = seconds;

  function update() {
    const m = Math.floor(remain / 60);
    const s = remain % 60;
    const timeStr = m > 0
      ? `${m}分${s.toString().padStart(2,'0')}秒`
      : `${s}秒`;
    el.innerHTML = `ログイン試行回数の上限に達しました。<br>
      <span class="lockout-timer">${timeStr}</span> 後に再度お試しください。`;
  }

  update();
  const timer = setInterval(() => {
    remain--;
    if (remain <= 0) {
      clearInterval(timer);
      location.reload();
    } else {
      update();
    }
  }, 1000);
}

/* ============================================================
   ログアウトボタン注入
   ============================================================ */

/**
 * ページにログアウトボタンを追加する
 * 認証後のページ描画完了後に呼ぶ
 */
function injectLogoutButton() {
  // ヘッダーナビに追加
  const nav = document.querySelector('.header-nav');
  if (nav) {
    const btn = document.createElement('button');
    btn.className  = 'nav-link';
    btn.textContent = '🔓 ログアウト';
    btn.style.cssText = `
      background:transparent;
      border:1px solid rgba(232,85,85,.3);
      color:#cc6666;
      cursor:pointer;
      border-radius:6px;
      font-family:inherit;
    `;
    btn.addEventListener('click', () => {
      if (confirm('ログアウトしますか？')) logout();
    });
    nav.appendChild(btn);
  }
}

/* ============================================================
   メインエントリーポイント
   ============================================================ */

/**
 * 管理ページを保護する
 * ページの <script> から呼び出す。
 *
 * @param {Function} onAuthenticated - 認証成功後に実行するコールバック
 *
 * 使用例:
 *   guardPage(() => {
 *     // ここで管理画面の初期化処理を行う
 *     initAdminPage();
 *   });
 */
function guardPage(onAuthenticated) {
  // 認証前にコンテンツを隠す（フラッシュ防止）
  hidePageContent();

  if (isAuthenticated()) {
    // ✅ 認証済み → コンテンツを表示してコールバック実行
    document.documentElement.style.visibility = 'visible';
    // DOM構築完了後にコールバック
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectLogoutButton();
        onAuthenticated();
      });
    } else {
      injectLogoutButton();
      onAuthenticated();
    }
  } else {
    // ❌ 未認証 → ログイン画面を表示（コンテンツは描画しない）
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showLoginScreen);
    } else {
      showLoginScreen();
    }
  }
}
