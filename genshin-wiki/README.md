# 原神キャラクター Wiki — セットアップ & 使い方

## 📁 フォルダ構成

```
genshin-wiki/
│
├── index.html              # キャラクター一覧ページ
├── character.html          # キャラクター詳細ページ
│
├── css/
│   └── style.css           # 全ページ共通スタイルシート
│
├── js/
│   ├── index.js            # 一覧ページ用スクリプト
│   └── character.js        # 詳細ページ用スクリプト
│
├── data/
│   └── characters.json     # ★ キャラクターデータ（ここを編集するだけ）
│
└── images/
    └── characters/         # キャラクター画像を配置するフォルダ
        ├── furina.png
        ├── hutao.png
        └── ...
```

---

## 🚀 起動方法

`fetch()` を使っているため、ローカルサーバーが必要です。

### 方法①：Node.js の `serve` を使う
```bash
npx serve .
```
→ http://localhost:3000 で起動

### 方法②：VS Code の Live Server 拡張機能
1. `index.html` を右クリック
2. 「Open with Live Server」をクリック

### 方法③：Python の HTTP サーバー
```bash
# Python 3
python -m http.server 8000
```
→ http://localhost:8000 で起動

---

## ✨ キャラクターの追加方法

### ステップ1：`data/characters.json` を編集する

`"characters"` 配列に新しいオブジェクトを追加するだけです。  
**HTML / CSS / JS を編集する必要はありません。**

```json
{
  "characters": [
    {
      "id": "キャラクターID（URLに使用, 英小文字）",
      "name": "キャラクター名（日本語）",
      "nameEn": "Character Name",
      "element": "元素（下記参照）",
      "weapon": "武器（下記参照）",
      "rarity": 5,
      "region": "地域名",
      "image": "images/characters/キャラID.png",
      "description": "キャラクター説明文",

      "stats": {
        "baseHP": 15307,
        "baseATK": 244,
        "baseDEF": 696,
        "ascensionStat": "突破ステータス名",
        "ascensionValue": "19.2%",
        "specialStat": "特殊ステータス名",
        "specialValue": "説明"
      },

      "talents": [
        {
          "id": "normal",
          "type": "normal",
          "name": "天賦名",
          "description": "天賦の説明",
          "multipliers": [
            {
              "label": "1段ダメージ",
              "values": [44.0, 47.6, 51.1, ... （Lv1〜15の15個の値）]
            }
          ]
        },
        {
          "id": "skill",
          "type": "skill",
          "name": "スキル名",
          "description": "スキル説明",
          "multipliers": [ ... ]
        },
        {
          "id": "burst",
          "type": "burst",
          "name": "爆発名",
          "description": "爆発説明",
          "multipliers": [ ... ]
        }
      ],

      "passiveTalents": [
        {
          "name": "固有天賦1名",
          "description": "説明"
        }
      ],

      "constellations": [
        { "name": "第1重の名前", "effect": "効果説明" },
        { "name": "第2重の名前", "effect": "効果説明" },
        { "name": "第3重の名前", "effect": "効果説明" },
        { "name": "第4重の名前", "effect": "効果説明" },
        { "name": "第5重の名前", "effect": "効果説明" },
        { "name": "第6重の名前", "effect": "効果説明" }
      ]
    }
  ]
}
```

### ステップ2：キャラクター画像を配置する（省略可）

`images/characters/` フォルダに  
`{キャラクターID}.png` （例：`furina.png`）を配置する。

画像がない場合は元素絵文字が自動表示されます。

---

## 🔧 対応値一覧

### 元素 (`element`)
| 値 | 表示 |
|---|---|
| `pyro` | 炎 🔥 |
| `hydro` | 水 💧 |
| `anemo` | 風 🌀 |
| `electro` | 雷 ⚡ |
| `dendro` | 草 🌿 |
| `cryo` | 氷 ❄️ |
| `geo` | 岩 🪨 |

### 武器 (`weapon`)
| 値 | 表示 |
|---|---|
| `sword` | 片手剣 |
| `claymore` | 両手剣 |
| `polearm` | 長柄武器 |
| `bow` | 弓 |
| `catalyst` | 法器 |

### 天賦タイプ (`type`)
| 値 | 表示 |
|---|---|
| `normal` | 通常攻撃 |
| `skill` | 元素スキル |
| `burst` | 元素爆発 |

---

## 📊 倍率データについて

`multipliers[].values` は天賦レベル1〜15の順に15個の値を並べた配列です：

```json
"values": [
  44.0,   // Lv.1
  47.6,   // Lv.2
  51.1,   // Lv.3
  56.2,   // Lv.4
  59.8,   // Lv.5
  63.9,   // Lv.6
  69.5,   // Lv.7
  75.2,   // Lv.8
  80.8,   // Lv.9
  86.9,   // Lv.10
  93.0,   // Lv.11（命の星座C3/C5 上限）
  99.2,   // Lv.12
  105.3,  // Lv.13
  111.4,  // Lv.14
  117.5   // Lv.15（最大）
]
```

詳細な倍率データはゲーム内または原神 Wiki を参照してください。

---

## 🌐 URLルール

| URL | 説明 |
|---|---|
| `/index.html` | キャラクター一覧 |
| `/character.html?id=furina` | フリーナの詳細ページ |
| `/character.html?id=hutao` | 胡桃の詳細ページ |

`?id=` の値はキャラクターJSONの `"id"` フィールドと一致させてください。
