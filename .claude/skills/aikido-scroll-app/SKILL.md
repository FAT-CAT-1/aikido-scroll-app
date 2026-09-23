---
name: aikido-scroll-app
description: >
  合氣道徹底解説PWA（和風巻物の横スクロール＋技の取り/受けSVGアニメ＋6部位×5階層トグル（キーフレームごと）＋
  ピンチズーム展開＋戻るボタン制御＋[[用語]]単語集リンク）の実装ルールを固定するスキル。
  このリポジトリで「技を追加」「部位解説」「巻物」「ピンチ」「トグル」「単語集」「PWA」「和風テーマ」
  「アニメーション」「Stitchの出力を実装に落とす」などに触れる作業では、明示的に頼まれなくても必ず使うこと。
  SVGの部位ID命名・データ構造・ジェスチャー/history設計・禁止事項・完了条件を含む。
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npm:*), Bash(npx:*), Bash(git:*)
---

# aikido-scroll-app 実装スキル

## 0. 最初に読むもの
0. `docs/content-spec.md` と `docs/animation-spec.md`（データ構造・アニメの正。本SKILL内の古い記述より優先）
1. `CLAUDE.md`（絶対ルール）
2. `docs/requirements.md`（F-01〜F-10・受入基準）
3. `docs/design-complete.md`（ディレクトリ・命名・状態機械）
4. 必要に応じて `references/` 配下（下記）

## 1. 技術スタック（固定・変更禁止）
| 領域 | 採用 | 禁止 |
|---|---|---|
| フレームワーク | Vite + Svelte 5 (runes) + TypeScript | React/Vue等への差し替え |
| 技アニメ | 3D（Three.js の WebGL。`content/poses3d/`）＋ WebGL が使えない端末・3D ポーズが無い技は inline SVG。進捗は GSAP（巻物スクロールで scrub）。docs/animation-spec.md §13 | AI生成動画・Lottie・GIF・Unity 等のゲームエンジンを技アニメ本体に使用 |
| 巻物 | CSS Scroll Snap（x mandatory）+ `overscroll-behavior-x: contain` / scroll-driven animations は `@supports` 付き、旧iOSは GSAP ScrollTrigger でフォールバック | — |
| PWA | vite-plugin-pwa（Workbox, `registerType:'autoUpdate'`） | 手書きService Worker |
| コンテンツ | gray-matter + remark + remark-wiki-link（`[[用語]]`→単語集アンカー） | 実行時の正規表現置換 |
| フォント | Yuji Syuku（見出し/技名）/ Shippori Mincho（本文）/ Zen Old Mincho（補助）をローカルサブセット | 未サブセットの全量読込 |
| ホスティング | GitHub Pages + GitHub Actions。`vite.config.ts` の `base: '/<repo>/'` | — |

## 2. 部位ID命名規則（厳守）
```
#{role}-{part}[-{side}]
role : uke | tori
part : eye | face | shoulder | hara | knee | foot
side : l | r（任意）
例 : #tori-knee-l  #uke-shoulder-r  #tori-hara
```
- SVGの各部位要素（`<g>` or `<path>`）に必ず上記 id を付ける。
- 一時停止時に `getBoundingClientRect()` で座標を取り、吹き出しとズーム原点に使う。
- 共通ボディは `src/lib/anim/body/` のテンプレを継承し、技ごとにキーフレーム（関節角度・位置）だけ差し替える。

## 3. データ構造（厳守）
```
technique
 ├ id / name_ja / name_en / category / rank / summary / terms[]
 └ roles
    ├ tori: { anim, keyframes[], parts: { eye|face|shoulder|hara|knee|foot: { l1, l2, l3 } } }
    └ uke : { 同上 }
```
- `l1` = 一言（全角20字目安）、`l2` = 詳細、`l3` = 超詳細（よくある誤り・師範差・安全）。
- スキーマ本体は `docs/requirements.md` §データ構造。原稿は `content/techniques/<id>.md`（frontmatter＋本文）。
- 原稿の見出し規約は `references/content-format.md` を参照。

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

## 6. 禁止事項
- 技アニメ本体に AI生成動画 / Lottie / GIF を使う
- `user-scalable=no`、`maximum-scale=1`、ページ全体の `touch-action:none`
- 部位ID規約外の id、l1〜l5 以外の階層名、キーフレームを持たない解説構造
- スタック固定からの逸脱、依存の大量追加（1PRで新規依存は2つまで）
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
npm run test               # Vitest: loader / gesture / toggleStack
npm run test:e2e           # Playwright: 一時停止→吹き出し→展開→ピンチ→戻る
npm run test:a11y          # axe-core
```

## 9. 参照ファイル
- `references/content-format.md` — 原稿mdの見出し規約と frontmatter
- `references/gesture-history.md` — ピンチ/戻るの実装メモ（擬似コード）
