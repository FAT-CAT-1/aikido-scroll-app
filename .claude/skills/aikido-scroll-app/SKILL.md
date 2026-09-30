---
name: aikido-scroll-app
description: >
  合氣道徹底解説PWA（和風巻物の横スクロール＋技の取り/受けの 3D・2D アニメ＋6部位×5階層トグル（キーフレームごと）＋
  ピンチズーム展開＋戻るボタン制御＋[[用語]]単語集リンク）の実装の細部をまとめたスキル。
  このリポジトリで「技を追加」「部位解説」「巻物」「ピンチ」「トグル」「単語集」「PWA」「和風テーマ」
  「アニメーション」「3D ポーズ」などに触れる作業では、頼まれていなくても使う。
  部位ID命名・データ構造・ジェスチャー/history設計・デザイントークン・完了条件を含む。
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npm:*), Bash(npx:*), Bash(git:*)
---

# aikido-scroll-app 実装スキル

## 0. 最初に読むもの
0. `docs/content-spec.md` と `docs/animation-spec.md`（データ構造・アニメの正。このスキルと食い違えば docs が正）
1. `CLAUDE.md`（根幹の制約・資料の優先順位・学習の手順）
2. `docs/requirements.md`（F-01〜F-10・受入基準）
3. `docs/design-complete.md`（ディレクトリ・命名・状態機械）
4. 必要に応じて `references/gesture-history.md`

## 1. 技術スタック（現在の採用。変えるときは理由と代案を添えて提案）
| 領域 | 採用 | 使わないもの |
|---|---|---|
| フレームワーク | Vite + Svelte 5 (runes) + TypeScript | React/Vue等への差し替え |
| 技アニメ | 3D（Three.js の WebGL。`content/poses3d/`）＋ WebGL が使えない端末・3D ポーズが無い技は inline SVG。進捗は GSAP（巻物スクロールで scrub）。docs/animation-spec.md §13 | AI生成動画・Lottie・GIF・Unity 等のゲームエンジンを技アニメ本体に使用 |
| 巻物 | CSS Scroll Snap（x mandatory）+ `overscroll-behavior-x: contain` / scroll-driven animations は `@supports` 付き、旧iOSは GSAP ScrollTrigger でフォールバック | — |
| PWA | vite-plugin-pwa（Workbox, `registerType:'autoUpdate'`） | 手書きService Worker |
| コンテンツ | gray-matter + remark + remark-wiki-link（`[[用語]]`→単語集アンカー） | 実行時の正規表現置換 |
| フォント | Yuji Syuku（見出し/技名）/ Shippori Mincho（本文）/ Zen Old Mincho（補助）をローカルサブセット | 未サブセットの全量読込 |
| ホスティング | GitHub Pages + GitHub Actions。`vite.config.ts` の `base: '/<repo>/'` | — |

## 2. 部位ID命名規則（正は docs/animation-spec.md §6）
```
#{role}-{part}[-{f|b}]
role : uke | tori
part : eye | face | shoulder | hara | knee | foot
f|b  : 手前 | 奥（任意。3D ではカメラに近い側が f）
例 : #tori-knee-f  #uke-shoulder-b  #tori-hara
```
- 2D は SVG の各部位要素に、3D は重ねた DOM の印（`.anchor`）にこの id を付ける。
- 一時停止時に部位の位置（`getBoundingClientRect()`）を取り、吹き出しとズーム原点に使う。
- 2D の体は `src/lib/anim/Figure.svelte`（ポーズは `content/poses/`）、3D は `src/lib/anim3d/`（ポーズは `content/poses3d/`、初版は `tools/pose3d-seed/`）。

## 3. データ構造（正は docs/content-spec.md）
```
technique（表裏で1ファイル）→ keyframes[] → tori | uke → parts（6部位）→ l1〜l5
```
- 階層の意味・信頼マーク・`[[用語]]`・出典の書き方は `docs/content-spec.md`。原稿は `content/techniques/<id>.md`（frontmatter＋本文）。

## 4. ジェスチャー / history 必須要件
- **ピンチ**: Pointer Events で2ポインタをキャッシュし距離差分を計算（MDN方式）。
  `pinch out` → 1段開く＋`transform-origin` を部位座標にしてズーム／`pinch in` → 1段閉じる。
  `touch-action: none` は **技アニメ領域の要素にのみ**付与。ページ標準ズームは殺さない。
- **タップ**でも同じトグルが開閉できること（ジェスチャーは補助）。
- **戻る**: 開くたび `history.pushState({depth, part, role})`。`popstate` で depth を1つ減らし閉じる。
  手動クローズ時は `history.back()` を呼びスタックと同期（二重push防止フラグ必須）。
- 状態機械は `docs/design-complete.md` の Mermaid 図に一致させる。実装は `src/lib/history/toggleStack.ts`。

## 5. 和風デザイントークン（`src/styles/tokens.css`）
```
--sumi-shou:#1a1a1a  --sumi-nou:#333333  --sumi-juu:#555555
--sumi-tan:#8a8a8a   --sumi-sei:#c9c4b8
--shu:#b7282e        --washi:#efe8d8
--line-ui:#7a7a7a（操作部品の枠線。和紙の上で 3:1 以上）
余白: 8pxグリッド / 縦書き: writing-mode: vertical-rl
筆線: SVG pathLength="1" + stroke-dasharray/offset アニメ
和紙・にじみ: feTurbulence(+feDisplacementMap)
```
- `prefers-reduced-motion: reduce` で筆線・ズームアニメを無効化。
- コントラスト比 4.5:1 以上（`--sumi-tan` を本文に使わない）。操作部品の枠線は 3:1 以上（`--line-ui`）。
- 文字は 14px 以上（`--text-xs` も 14px）、押せる部品は 44×44px 以上（`--tap-min`）。デジタル庁デザインシステムとの照合（docs/decisions.md D-43）。

## 6. 避けること（理由は CLAUDE.md の根幹の制約）
- 技アニメ本体に AI生成動画 / Lottie / GIF を使う
- `user-scalable=no`、`maximum-scale=1`、ページ全体の `touch-action:none`
- 部位ID規約外の id、l1〜l5 以外の階層名、キーフレームを持たない解説構造
- 1回の変更で新しい依存を3つ以上足す（足すときは理由を添えて提案）
- `content/` を経由しないハードコードの解説文

## 7. 完了条件（Definition of Done）
- 対象技で 全キーフレーム × 取り/受け × 6部位 × l1〜l5 が表示され、タップ＆ピンチで開閉、戻るボタンで1段ずつ閉じる。
- iOS Safari 実機で破綻なし・60fps目標。`prefers-reduced-motion` 対応。
- ARIA（`aria-expanded`, `role="region"`, `aria-controls`）付与、axe 違反 0。
- `npm run build:content` が未定義 `[[用語]]` 0 で通る。
- Lighthouse PWA / Performance / Accessibility 各 90+。

## 8. テスト手順
```bash
npm run build:content      # md→JSON、未定義用語=0を確認
npm run check              # 型（svelte-check / tsc）
npm run test               # Vitest: loader / gesture / toggleStack / pose3d / security
npm run test:e2e           # Playwright: 一時停止→吹き出し→展開→ピンチ→戻る
npm run test:a11y          # axe-core
```

## 9. 参照ファイル
- `references/gesture-history.md` — ピンチ/戻るの実装メモ（擬似コード）
- `references/content-format.md` — 旧版（使わない。原稿の形は `docs/content-spec.md` が正）
