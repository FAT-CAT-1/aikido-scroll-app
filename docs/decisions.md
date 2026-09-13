# 実装判断ログ（docs/decisions.md）

> ディレクター未回答の質問（初回報告 C-Q1〜Q5）と、文書間の矛盾・曖昧さ（初回報告 B-1〜28）に対して
> 実装担当（Opus）が置いた**仮置き**の記録。変更したい場合は ID を指定して指示してください。
> 上位文書（content-spec / animation-spec / backlog / design-complete）を書き換えるものではありません。

| ID | 論点 | 決定（仮置き） | 根拠 |
|---|---|---|---|
| D-01 | 公開範囲（Q1） | GitHub の public リポジトリで公開。`docs/references/*.txt`（第三者動画の文字起こし全文）は `.gitignore` で除外しローカル保持 | Pages 無料枠は public 必須。全文の再配布を避ける |
| D-02 | コミット作成者（Q2） | リポジトリローカル設定で `FAT-CAT-1` ／ GitHub noreply アドレス | 個人メールを公開履歴に残さない |
| D-03 | フォント（Q3） | google/fonts（OFL・RFN なし）の固定コミットから原本を取得し sha256 検証 → `subset-font` で woff2 化。書体の役割ごとに収録文字を分ける：Yuji Syuku＝見出し・技名・用語名・UI の文字／Shippori Mincho 400＝第1水準＋原稿／Shippori 700・Zen Old Mincho＝原稿の文字。合計約 1.6MB。原稿追加でサブセット外の文字が出たら `npm run fonts` | 全量 4.1MB → 1.6MB。3G での初回表示と precache 容量。Shippori Mincho は B1 ではない方 |
| D-04 | PWA の完了条件（Q4） | Lighthouse v12 で PWA カテゴリが廃止されたため、「DevTools > Application > Manifest の警告 0 ＋ Service Worker activated ＋ 機内モード起動」に置換。Performance / Accessibility 90+ は維持 | 計測不能な基準を残さない |
| D-05 | 説明のみの kf（Q5） | 全 kf で 取り/受け × 6部位 × l1〜l5 を必須（kamae も書く） | content-spec §6 のエラー条件・backlog T06 と一致 |
| D-06 | 無印（一般的な指導）の文字色 | `--trust-general` を `--sumi-tan`(#8a8a8a) ではなく `--sumi-juu`(#555) に。事実＝焦墨、師範差＝朱。色以外の手掛かりとして文末に小さな印（事／師）を付ける | l2〜l5 の大半が無印文で、#8a8a8a は和紙上 2.8:1 と本文 4.5:1・axe 0 を満たせない。B-4「値は上書き可」 |
| D-07 | 依存追加のルール | 「1タスク2個まで・追加理由を1行」。公式テンプレート相当の雛形（T02）と、design-complete A-2 / A-11 が名指しする依存は例外 | SKILL「1PR 2個まで」は main 直 push 運用と合わないため |
| D-08 | CI の `build:content` | `npm run build:content --if-present`（T08 までスキップ） | A-10 の手順を固定したまま T04 を先行できる |
| D-09 | manifest の置き場所 | `vite.config.ts` の VitePWA 設定で定義（`public/manifest.webmanifest` は置かない） | 二重定義を避ける |
| D-10 | PWA アイコン | 自作の仮 SVG（和紙地に墨の円相）から PNG を生成してコミット。本デザインは E10 | 仕様未定義 |
| D-11 | manifest の色 | `background_color` #efe8d8（和紙）／`theme_color` #1a1a1a（焦墨） | A-9「テーマ色 --washi/--sumi-shou」の読み |
| D-12 | 画面の向き | 仕様どおり `orientation: portrait`（WCAG 2.2 SC 1.3.4 に抵触しうる点は要判断として残す） | A-9 |
| D-13 | Node | CI は Node 22、`engines` は `>=22.12.0`（Vite 8 の要件） | backlog §0 |
| D-14 | TypeScript | `~6.0`（svelte-check 4.7 が TS 7 未対応。Vite 公式テンプレートと同じ） | 互換性 |
