# ロードマップ ― 納品までの工程と最初の2週間

## 1. 改良版ワークフロー
| # | 工程 | 担当 | 成果物 | 完了条件 |
|---|---|---|---|---|
| 0 | 要件定義 | ユーザー＋Fable | `docs/requirements.md` | F-01〜F-10 確定・受入基準合意 |
| 1 | 情報設計／データ構造 | Fable | JSONスキーマ・部位ID規則・原稿規約 | 正面打ち一教の原稿md＋JSONが揃う |
| 2 | **技術検証スパイク** | Opus | 正面打ち一教の縦貫通MVP | iOS実機で F-02〜F-07 動作 |
| 3 | デザイントークン／画面骨格 | Fable→Stitch | `docs/stitch-prompts.md`→Stitchカンプ→`tokens.css` | 墨五彩トークン・3画面カンプ |
| 4 | 装飾素材 | ユーザー（自作/Higgsfield探索） | 和紙・朱印・章扉 | 透かしなしで公開可（CSS/SVG自作 or 有料） |
| 5 | 実装（横展開） | Opus | 全技・単語集・章ページ・PWA | `build:content` 警告0・全技表示 |
| 6 | テスト／a11y | Opus | Vitest/Playwright/axe 結果 | Lighthouse 90+・axe 違反0 |
| 7 | デプロイ | Opus | GitHub Actions→Pages | 公開URLでオフライン動作 |
| 8 | 部員レビュー | ユーザー＋部員 | フィードバック票 | 主要動線で致命バグ0 |
| 9 | 最終調整 | Fable＋Opus | 修正・トークン整合 | 受入基準を全て充足 |

## 2. 最初の2週間（技術検証スパイク：正面打ち一教のみ）
| 日 | 作業 | 完了の目安 |
|---|---|---|
| 1-2 | リポジトリ作成、Vite+Svelte5+TS 雛形、vite-plugin-pwa、GitHub Actions→Pages（`base`）、フォントサブセット | 空の巻物1画面が公開URLで開く |
| 3-4 | `content/techniques/ikkyo-omote.md` → `build:content` → JSON。取り/受けの墨絵SVGボディ（部位id付き）を生成 | JSONに全kf×6部位×5階層が入る |
| 5-6 | GSAP Timeline で技アニメ、巻物 scrub 同期。停止検知→6部位座標→l1吹き出し | 一時停止で吹き出し6つが出る |
| 7-8 | PartToggle（details/ARIA）で l2/l3。Zoomable（transform-origin=部位座標） | タップで5段まで開閉できる |
| 9-10 | Pointer Events 自前ピンチ（out=開く/in=閉じる、アニメ領域内限定）、タップ併用 | ピンチで1段ずつ開閉 |
| 11-12 | History API 状態機械（pushState/popstate、depthスタック、手動クローズ同期）。`[[用語]]`→単語集→戻る位置復元 | 戻るボタンで1段ずつ閉じる |
| 13 | iOS Safari／Android Chrome 実機、`prefers-reduced-motion`、axe、Lighthouse | 受入基準の項目を確認 |
| 14 | 部員数名で試用、フィードバック | 横展開の可否を判断 |

## 3. 判断の閾値
- Day11 までに iOS 実機で「一時停止→吹き出し→展開→ピンチ→戻る」が破綻しなければ、工程3（Stitch）と工程5（横展開）へ。
- 破綻する場合: ①GSAP ScrollTrigger 一本化 ②ピンチをタップのみに簡素化 ③トグルを2段に縮小、の順で要件を段階導入。
- SVG+GSAP で 60fps が出ない技が続く → Rive への部分移行を検討。
- 部員から「深層トグルが複雑」の声が多数 → l3 を折り畳み既定とし2段運用。

## 4. Claude Code での最初の指示（コピペ用）
```
CLAUDE.md と .claude/skills/aikido-scroll-app/SKILL.md、docs/requirements.md、docs/design-complete.md を読んで、
docs/roadmap.md の Day1-2 を実行してください。着手前に不明点があれば全て質問してください（grill me）。
危険な操作（削除・force push）は必ず確認を取ってください。
```
