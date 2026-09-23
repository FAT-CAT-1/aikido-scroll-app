# 合氣道徹底解説アプリ（aikido-scroll-app）

獨協大学合氣道部向け。和風（墨絵・『大神』風）の巻物横スクロールUIで、初段までの技を
「取り／受け」の3D（Three.js）アニメーションと6部位×5階層（キーフレームごと）のトグル解説で学べる PWA。
単独開発・認証なし・GitHub Pages 公開。

## 分業
- **企画（Claude Fable 5.1）**: 要件の咀嚼、情報設計、Stitch用メタプロンプト、レビュー観点の言語化。
- **実装（Claude Opus 5）**: `docs/requirements.md` と `docs/design-complete.md` に従ってコードを書く。
  `.claude/skills/aikido-scroll-app/SKILL.md` を必ず読んでから着手する。

## 着手前の儀式（ユーザーの流儀）
1. 要件定義に不明点があれば **grill me**（疑問を全部ユーザーに質問して回答を得る）。
2. 納品までのロードマップ（`docs/roadmap.md`）を提示し合意を取る。
3. 実装 → ユーザーがレビュー → 次のロードマップ項目へ。
4. ディレクトリ削除・force push・依存の大量変更など危険な操作は必ずユーザーに確認。

## 絶対ルール（違反はレビューで差し戻し）
1. 技アニメ本体は **3D（Three.js の WebGL）**。3D ポーズの無い技・WebGL が使えない端末は **inline SVG** の 2D。進捗の制御は GSAP。AI生成動画（Higgsfield等）・Lottie・Unity 等のゲームエンジンは技アニメに使わない（2026-09-23 決定。docs/decisions.md D-36、animation-spec §13）。
2. 部位IDは `#{role}-{part}[-{f|b}]` 命名を厳守（role=uke|tori, part=eye|face|shoulder|hara|knee|foot, f=手前/b=奥。3D では f＝カメラに近い側。`docs/animation-spec.md` が正）。
3. データ構造は `technique(表裏別) → keyframes[] → (tori|uke) → parts(6) → {l1..l5}`（`docs/content-spec.md` が正）。
4. `user-scalable=no` やページ全体の `touch-action:none` でズームを殺さない（a11y）。ピンチ判定はアニメ領域内限定。
5. トグルを開くたび `history.pushState`、`popstate` で1段閉じる。多段は depth スタックで管理。
6. スタック固定: Vite + Svelte 5 (runes) + TypeScript / vite-plugin-pwa / GSAP / Three.js（技の 3D。2026-09-23 追加）/ Google Fonts（Yuji Syuku, Shippori Mincho, Zen Old Mincho）。
7. 原稿の専門用語は `[[用語]]` 記法。ビルド時に単語集リンクへ変換し、未定義用語は警告。

## コマンド
- 開発: `npm run dev` ／ ビルド: `npm run build` ／ プレビュー: `npm run preview`
- コンテンツ: `npm run build:content`（`content/**/*.md` → `src/generated/*.json`）
- テスト: `npm run test`（Vitest）／ `npm run test:e2e`（Playwright）／ a11y: `npm run test:a11y`（axe）

## ディレクトリ
```
content/   原稿md（技ごと1ファイル・単語集・章ページ）
docs/      content-spec / animation-spec / backlog（正）+ requirements / design-complete / research / roadmap / stitch-prompts / higgsfield-guide
src/       lib(anim, gesture, history, content) / components / styles / generated
scripts/   build-content.mjs
public/    manifest, icons, fonts(サブセット)
```
詳細は `docs/design-complete.md`。

## 進め方
**まず一教・表（ikkyo-omote、既定攻撃法＝正面打ち）1技だけを、巻物→アニメ→一時停止吹き出し→深層トグル→
ピンチ→戻るボタンまで縦に貫通させる（技術検証スパイク）。** 成功後に Stitch で本デザイン化し、全技へ横展開する。

## 文書の優先順位（矛盾したらこの順）
1. `docs/content-spec.md`（原稿の構造：技×表裏で1ファイル、キーフレームごと、5階層、信頼マーク、`[[用語]]`）
2. `docs/animation-spec.md`（15関節 f/b 命名、pose.json、視点切替、再生/スクロール同期、ポーズエディタ、§13 の 3D）
3. `docs/backlog.md`（タスク順・完了条件・レビュー基準）
4. `docs/design-complete.md`（A部 基本設計＋B部 デザインシステム。旧 design.md / design-system.md を統合）
5. `docs/requirements.md` / `docs/research.md` / `docs/roadmap.md`（初期版。上位と食い違う記述は上位が正）
`.claude/skills/aikido-scroll-app/references/content-format.md` は旧版のため参照しない（content-spec.md を読む）。
