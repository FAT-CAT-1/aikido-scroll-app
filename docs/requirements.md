# 要件定義書 ― 合氣道徹底解説アプリ

版: 0.1（2026-09-08）／作成: 企画（Fable 5.1）／承認: ユーザー

## 1. 目的
合氣道部員が、初段までの技を「取り／受け」両視点のアニメーションで理解し、一時停止時に
6部位（目・顔・肩・腹＝丹田/帯・膝・足）の要点を段階的に深掘りできる、和風・墨絵テーマの
オフライン対応PWAを提供する。

## 2. 想定ユーザー
- 獨協大学合氣道部員（関東学生合氣道連盟系・合気会）。日本語主体、技名は英語併記。
- スマホ主体（iOS Safari / Android Chrome）。稽古前後の予習復習・審査対策に使う。

## 3. 機能要件
| ID | 要件 | 優先 |
|---|---|---|
| F-01 | トップは和風「巻物」形式で横スクロール。沿革／理念／基礎動作／技一覧／単語集へ導線 | 必須 |
| F-02 | 各技を「取り(tori)」「受け(uke)」の視点切替でアニメーション表示 | 必須 |
| F-03 | アニメーションを任意位置で一時停止でき、6部位に一言解説（l1）の吹き出しを表示 | 必須 |
| F-04 | 吹き出しはトグル。開くと該当部位にズームし詳細（l2）→超詳細（l3）の深層構造 | 必須 |
| F-05 | トグルはタップ／ピンチアウト（開く）／ピンチイン（閉じる）で操作可能 | 必須 |
| F-06 | スマホの戻るボタンでトグルを1段ずつ閉じられる | 必須 |
| F-07 | 専門用語は `[[用語]]` リンクで単語集の該当語へ遷移し、戻るで元位置（巻物位置・トグル深さ）へ復帰 | 必須 |
| F-08 | 単語集画面（200語以上）を五十音／分類で閲覧・検索 | 必須 |
| F-09 | 初段までの技を網羅（一〜五教、四方投げ、入身投げ、小手返し、回転投げ、天地投げ、腰投げ、十字投げ、呼吸投げ、座技・半身半立ち） | 必須 |
| F-10 | オフラインで全コンテンツ閲覧可（PWA、ホーム画面追加） | 必須 |
| F-11 | 級ごとの審査科目表から技へジャンプ | 推奨 |
| F-12 | 「よく間違えるポイント」の横断一覧 | 任意 |

## 4. 非機能要件
- **性能**: 初回LCP < 2.5s（3G相当）、技アニメ60fps目標、初期JSバンドル < 150KB gzip。
- **オフライン**: precache で全JSON・SVG・フォントサブセットをキャッシュ。更新は autoUpdate。
- **対応ブラウザ**: iOS Safari 16+（scroll-driven animations は 26+ で強化、旧版は GSAP フォールバック）／Android Chrome 最新2版。
- **アクセシビリティ**: WCAG 2.2 AA 目安。ページ標準ズームを禁止しない。ARIA付与。`prefers-reduced-motion` 対応。キーボード操作可。コントラスト 4.5:1 以上。
- **保守性**: 解説文は全て `content/` の md から生成。コードに解説文をハードコードしない。

## 5. 画面一覧
| # | 画面 | 主要素 |
|---|---|---|
| S-01 | 巻物トップ | 横スナップの章カード、縦書きタイトル、筆線プログレス |
| S-02 | 技一覧 | 級別／攻撃法別フィルタ、技カード |
| S-03 | 技詳細 | アニメ領域（tori/uke切替・再生/一時停止・スクラブ）＋6部位トグル＋表裏切替＋関連技 |
| S-04 | 単語集一覧 | 五十音／分類インデックス、検索 |
| S-05 | 用語詳細 | 読み・英語・定義・関連語・出現技 |
| S-06 | 沿革／理念／基礎動作／海外 | 章ページ（縦書き見出し） |

## 6. データ構造

### 6.1 技（`techniques.json` の1要素）
```jsonc
{
  "id": "shomen-uchi-ikkyo",
  "name_ja": "正面打ち一教",
  "name_en": "Shomen-uchi Ikkyo (First Control)",
  "category": "katame",
  "rank": "5kyu",
  "attack": "shomen-uchi",
  "omote_ura": "both",
  "summary": "相手の正面打ちを制し、肘を伸ばして腹這いに抑える基本の第一教。",
  "roles": {
    "tori": {
      "anim": "anim/shomen-uchi-ikkyo-tori.svg",
      "keyframes": [
        { "t": 0.00, "label": "接触" },
        { "t": 0.35, "label": "崩し完了" },
        { "t": 0.60, "label": "入身の頂点" },
        { "t": 0.85, "label": "極め直前" },
        { "t": 1.00, "label": "残心" }
      ],
      "parts": {
        "eye":      { "l1": "相手全体を制するつもりで見る", "l2": "…", "l3": "…" },
        "face":     { "l1": "…", "l2": "…", "l3": "…" },
        "shoulder": { "l1": "…", "l2": "…", "l3": "…" },
        "hara":     { "l1": "丹田を相手中心へ向け体重を乗せる", "l2": "…", "l3": "…" },
        "knee":     { "l1": "…", "l2": "…", "l3": "…" },
        "foot":     { "l1": "…", "l2": "…", "l3": "…" }
      }
    },
    "uke": { "anim": "anim/shomen-uchi-ikkyo-uke.svg", "keyframes": [], "parts": { } }
  },
  "steps": { "tori": ["…"], "uke": ["…"] },
  "omote_vs_ura": "…",
  "related": ["shomen-uchi-nikyo", "shomen-uchi-iriminage"],
  "terms": ["ikkyo", "omote", "ura", "kuzushi", "kiza"]
}
```

### 6.2 用語（`glossary.json` の1要素）
```jsonc
{ "slug": "irimi", "term_ja": "入身", "reading": "いりみ", "romaji": "irimi",
  "term_en": "Irimi (entering)", "category": "taisabaki",
  "def_html": "相手の攻撃線を外し…", "related": ["tenkan"], "used_in": ["shomen-uchi-iriminage"] }
```

## 7. 技術スタック（推奨構成）
Vite + Svelte 5 (runes) + TypeScript／GSAP（Timeline・ScrollTrigger）／inline SVG + CSS／
vite-plugin-pwa（Workbox）／remark + gray-matter + remark-wiki-link／Google Fonts（Yuji Syuku, Shippori Mincho, Zen Old Mincho）／
GitHub Pages + GitHub Actions／テスト: Vitest + Playwright + axe-core。
選定根拠は `docs/research.md`。

## 8. 制約
- 無料ツールのみ。単独開発（企画 Fable 5.1／実装 Opus 5）。認証なし。静的ホスティング。
- Higgsfield は無料枠（透かし・商用不可）のため、公開素材には使わない（探索用のみ）。
- Google Stitch はデザイントークン・画面骨格の取得に限定し、インタラクションは実装側で書く。

## 9. 受け入れ基準
- F-01〜F-10 が iOS Safari 実機で破綻なく動作する。
- 一教・表（正面打ち）で 全キーフレーム × 取り/受け × 6部位 × l1〜l5 が全て表示・ズーム・戻る動作可（docs/content-spec.md 準拠）。
- `build:content` が未定義 `[[用語]]` 0 で通る。
- Lighthouse PWA / Performance / Accessibility 各 90 以上、axe 違反 0。

## 10. リスクと対策
| リスク | 対策 |
|---|---|
| scroll-driven animations が旧iOSで非対応 | `@supports` 分岐＋GSAP ScrollTrigger フォールバック |
| ピンチ実装が標準ズームを妨げ a11y 違反化 | アニメ領域内限定・タップ併用・`user-scalable` を触らない |
| 部位付きSVGの制作工数 | 共通ボディをテンプレ化し技ごとにキーフレームだけ差し替え |
| 深層トグルが複雑で部員が迷う | 部員レビューで l3 の要否を判断、2段へ縮小できる設計にする |
| 技解説の流派差 | 「一般的な指導」「師範差」を明記し、部の師範の指導を優先と注記 |

## 11. スコープ外
ユーザー認証、動画アップロード、コメント／SNS、ネイティブアプリ配信、多言語UI（英語は技名併記のみ）、稽古記録機能。
