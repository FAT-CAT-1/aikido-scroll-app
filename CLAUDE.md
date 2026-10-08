# 合氣道徹底解説アプリ（aikido-scroll-app）

獨協大学合氣道部のための PWA。和風の巻物を横に送りながら、初段までの技を取り・受けの 3D アニメと、6部位×5階層（キーフレームごと）の解説で学ぶ。単独開発・認証なし・GitHub Pages で公開。
ディレクター（利用者）が要件と裁定を持ち、Claude が設計・実装・検証を担う。実装の方法は、下の制約の内側で自由に提案・選択してよい。

## 根幹の制約
変える必要があるときは、理由と代案を添えてディレクターに提案する。

- **スタック**：Vite + Svelte 5（runes）+ TypeScript、vite-plugin-pwa、GSAP、Three.js、Google Fonts（Yuji Syuku / Shippori Mincho / Zen Old Mincho）。一人で保守し続けられる範囲に保つため。
- **技アニメ**：3D（Three.js）で描き、WebGL が使えない端末では inline SVG の 2D にする。AI 生成動画・Lottie・ゲームエンジンは使わない。動きの正しさを原稿と師範の校閲で確かめられる形にしておくため（D-36）。推定の動きには注記を出す（D-41）。
- **原稿が唯一の出どころ**：技の解説・用語は `content/` の原稿（出典・信頼マーク付き）から生成し、コードに書かない。校閲と出典を一か所で管理するため。
- **共通の契約**：部位 ID `#{role}-{part}[-{f|b}]` とデータ構造（技 → キーフレーム → 取り／受け → 6部位 → l1〜l5）。原稿・2D・3D・テストがこれを共有する。正は `docs/content-spec.md` と `docs/animation-spec.md`。
- **ズームを止めない**：`user-scalable=no` やページ全体の `touch-action: none` は使わない。拡大して読む人がいるため（ピンチ判定はアニメ領域の中だけ）。
- **安全**：原稿から作る HTML は `scripts/content/` の検証を通し、CSP を弱めない。原稿を `{@html}` で描いているため（D-44・D-46）。
- **取り返しのつかない操作は先に確認**：フォルダの削除（rm -rf）、force push、依存の大量追加、設定ファイルの全面書き換え。

## 資料（食い違ったら上が正）
1. `docs/content-spec.md` — 原稿の構造
2. `docs/animation-spec.md` — 部位・ポーズ・3D（§13）
3. `docs/backlog.md` — タスクと完了条件
4. `docs/design-complete.md` — 設計とデザイントークン
5. `docs/requirements.md` / `docs/research.md` / `docs/roadmap.md` — 初期資料

記録の置き場：裁定は `docs/decisions.md`（D-xx）、ディレクター・師範の確認は `docs/content-review-notes.md`。実装の細部は `.claude/skills/aikido-scroll-app/`。

## コマンド
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run build:content` — 原稿 → `src/generated/*.json`（未定義の `[[用語]]` を警告）
- `node tools/check-manuscript.mjs <原稿>` — 原稿1本だけを同じ規則で検証（生成物は書かない）
- `npm run check`（型）/ `npm run test`（Vitest）/ `npm run test:e2e`（Playwright）/ `npm run test:a11y`（axe）
- 3D ポーズの初版：`node tools/pose3d-seed/<技>.mjs --force`

## 進め方
- 結果が変わる選択肢があるときは、案と推奨・理由を添えて聞く。それ以外は判断して進め、報告に理由を書く。
- 大きな作業は先に計画を示して合意する。仕上げは型・単体・E2E を通し、画面で動きを確かめてから報告する。
- 提案や設計の説明は、図や比較表を入れた HTML（Artifact）で見せる。

## 作業場所（PC とクラウド）
- 手元の PC でも、クラウド（claude.ai/code）でも作業できる。クラウドの環境は「デフォルト」、権限のモードは Auto。
- クラウドのセッションは main に直接 push しない。main に入ると GitHub Pages に自動で公開されるため。ブランチ → PR → ディレクターがマージ。
- 毎晩 2:00（日本時間）に、クラウドの夜間テスト（原稿検証・型・単体・Pixel の E2E）が走り、結果を報告する。
- クラウドではできない（手元の PC で行う）：`fonts-src/`（git に入れないフォント原本）を使う `npm run fonts`／動画の文字起こし（`docs/references/*.txt`。公開できないので git に入れない）を読む作業／iPhone（WebKit）の E2E（クラウドではブラウザを取り寄せられない）／実機での見た目の確認。

## 学習・リフレクト
ディレクターの修正・指摘を反映したあと（反映そのものは feedback-round スキルの手順）、次の順で振り返る。

1. **原因を1行に**：知らなかった事実／誤った思い込み／好みの違い、のどれか。
2. **汎用化できるか**：同じ種類の誤りがほかの技・画面・ファイルでも起こりうる、確かめ方を書ける、既存の制約や学んだルールと矛盾しない — の3つを満たすもの。一度きりの事実は `docs/decisions.md` か `docs/content-review-notes.md` に記録するだけにする。
3. **提案**：ルール案（1〜2行）、元の指摘、適用範囲、確かめ方を HTML で示し、承認を求める。
4. **反映**：承認されたら「学んだルール」に追記する。テストや検査で確かめられるものは、そちらにも入れる（文章より確実）。見送られた案は「見送った案」に1行残し、同じ提案を繰り返さない。
5. **見直し**：学んだルールが10件を超えたら、統合・削除・資料や `.claude/rules/` への移動を提案する。Claude Code の公式ガイダンス（memory・best practices）が変わったときも、この文書の形を見直す。

## 学んだルール
書式：`- ルール — 理由（元の指摘・日付）`

- （まだ無い）

## 見送った案
- （まだ無い）
