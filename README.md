# aikido-scroll-app — 合氣道徹底解説アプリ

獨協大学合氣道部向け。和風（墨絵・『大神』風）の巻物横スクロールUIで、技を「取り／受け」のSVG骨格アニメと
キーフレームごとの6部位×5階層トグル解説で学べるPWA。実装は Claude Code（企画: Fable 5.1 / 実装: Opus 5）。

**公開 URL**: https://fat-cat-1.github.io/aikido-scroll-app/
（`main` に push すると GitHub Actions が原稿の検証・型チェック・単体テスト・ビルドを行い、GitHub Pages に公開する）

## いまの中身
- 技（5級）：一教（表・裏）、四方投げ（表・裏）、入身投げ、座技呼吸法。原稿はすべて `status: draft`（師範の校閲前。画面に「校閲前」と出る）、pose は記述から推定した初版
- 単語集 214語、章ページ（沿革・理念）
- 基礎動作の章は原稿準備中

## 開発
| やること | コマンド |
|---|---|
| 依存の導入 | `npm ci`（Node 22.12 以上） |
| 開発サーバー | `npm run dev` |
| 原稿のビルドと検証 | `npm run build:content`（エラー0・警告0 にする） |
| フォントのサブセット再生成 | `npm run fonts`（原稿に新しい字が出たとき。`build:content` が警告で知らせる） |
| 型チェック | `npm run check` |
| 単体テスト | `npm run test` |
| E2E（本番ビルド） | `npm run test:e2e`（開発サーバーで行うときは環境変数 `E2E_TARGET=dev`） |
| a11y（axe） | `npm run test:a11y` |
| 本番ビルドの確認 | `npm run build` → `npm run preview` |
| 1ファイル版（HTML 1つ・サーバー不要） | `npm run build:single` → `dist-single/aikido-scroll-app.html`（Service Worker なし。docs/decisions.md D-35） |

## 原稿を直す・足す
1. `content/techniques/*.md`・`content/glossary/*.md`・`content/pages/*.md` を編集する（書き方は `docs/content-spec.md`）。
2. `npm run build:content` でエラー・警告を 0 にする。サブセットに無い字の警告が出たら `npm run fonts`。
3. 校閲が済んだら frontmatter の `status` を `review` → `approved` にする。

## ポーズを直す
`tools/pose-editor.html` をブラウザで開き、`content/poses/*.pose.json` を読み込んで修正・保存する（手順は `docs/animation-spec.md` §8-3）。
保存したファイルを元の場所に上書きし、`npm run build:content` で検証する。

## 記録
- `docs/decisions.md` — 仕様に無い点・文書間の食い違いに置いた仮置きの決定（D-01〜）
- `docs/lighthouse-report.md` — Lighthouse・PWA・a11y の計測結果（backlog T31）

## 企画・仕様（まず読む）
1. `docs/KICKOFF-PROMPT.md` — Claude Code 新規セッションに貼るメタプロンプト
2. `CLAUDE.md` — 絶対ルールと**文書の優先順位**
3. `.claude/skills/aikido-scroll-app/SKILL.md` — 実装スキル

## docs/ の構成
| ファイル | 内容 | 位置づけ |
|---|---|---|
| `content-draft.md` | コンテンツ原稿（沿革・理念・基礎・技・海外・単語集・付録） | 元ネタ |
| `content-spec.md` | コンテンツ仕様書 v0.1（技×表裏、kfごと、5階層、信頼マーク） | **正** |
| `animation-spec.md` | アニメーション仕様書 v0.1（15関節 f/b、pose.json、視点切替、エディタ） | **正** |
| `backlog.md` | タスク分解（T01〜T33）＋レビューチェックリスト | **正** |
| `design-complete.md` | 設計書 完成版（A部 基本設計＋B部 デザインシステム） | **正** |
| `requirements.md` / `research.md` / `roadmap.md` / `stitch-prompts.md` / `higgsfield-guide.md` | 技術リサーチ＋要件定義＋基本設計（初期版） | 上位と食い違えば上位が正 |
| `KICKOFF-PROMPT.md` | Claude Code 用メタプロンプト（初回／再開／原稿執筆） | 運用 |

## content/ の構成
`techniques/`（技×表裏）`kihon/`（基礎）`glossary/`（1語1ファイル）`poses/`（pose.json）`pages/`（沿革・理念）

## 試験範囲（スパイク）
基礎（半身・構え・体捌き・膝行・受身・呼吸法・攻撃法）＋5級科目（一教 表/裏、四方投げ 表/裏、入身投げ、座技呼吸法）。
まず **一教・表（正面打ち）** を巻物→アニメ→一時停止吹き出し→深層トグル→ピンチ→戻るまで縦に貫通させる。
