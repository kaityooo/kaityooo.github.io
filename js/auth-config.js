const AUTH_CONFIG = Object.freeze({
  /**
   * パスワードの SHA-256 ハッシュ値
   * 変更方法: tools/gen-hash.html にアクセスして新しいハッシュを取得
   */
  passwordHash: '8a89a5c3e4d9ddee085f13d1a32ea50a9ed60ae854c4e13d82d96b2a15828a70',

  /**
   * sessionStorage / localStorage のキー名
   */
  sessionKey: '_gw_sa_9bk2m',

  /**
   * 認証の有効期限（ミリ秒）
   * デフォルト: 8時間（ブラウザを閉じてもこの時間は維持）
   * セッションのみにしたい場合は sessionStorage を使う（auth.js 参照）
   */
  maxAge: 8 * 60 * 60 * 1000,

  /**
   * ログイン失敗のロックアウト設定
   */
  lockout: {
    maxAttempts: 5,       // 最大試行回数
    lockDuration: 5 * 60 * 1000, // ロック時間（5分）
  },
});
