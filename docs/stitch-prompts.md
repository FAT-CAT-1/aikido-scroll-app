# Google Stitch 用メタプロンプト（日英）

> Stitch は**静的カンプとデザイントークンの取得**に使う。ピンチ・多段トグル・SVGアニメは含めず、Claude Code で実装する。
> 各プロンプトの冒頭に「デザインシステム」を毎回貼る（Stitch はプロジェクト内で文脈を保つが、明示した方が安定する）。

## 0. デザインシステム（共通・毎回冒頭に貼る）

**JP**
> デザインシステム: 和風・墨絵（カプコン『大神』風）。モバイル縦画面（390×844）。
> 色: 墨の五彩＝焦 #1a1a1a／濃 #333333／重 #555555／淡 #8a8a8a／清 #c9c4b8、朱 #b7282e、和紙 #efe8d8。
> フォント: 見出し・技名＝Yuji Syuku（筆文字）、本文＝Shippori Mincho、補助＝Zen Old Mincho。
> 余白: 8pxグリッド、ゆったり。罫線は筆致の細い墨線。見出しは縦書き。質感: 和紙テクスチャ＋薄い墨のにじみ。アクセントは朱印（角印）。
> 禁止: グラデーションの多用、角丸カード、マテリアル/iOS標準風のUI。

**EN**
> Design system: Japanese sumi-e ink style inspired by Capcom's Okami. Mobile portrait (390×844).
> Colors: five ink shades — #1a1a1a, #333333, #555555, #8a8a8a, #c9c4b8; vermilion #b7282e; washi paper #efe8d8.
> Fonts: headings/technique names in "Yuji Syuku" (brush calligraphy), body in "Shippori Mincho", secondary "Zen Old Mincho".
> Spacing: 8px grid, generous whitespace. Thin brush-stroke rules. Vertical (tategaki) headings. Washi paper texture with faint ink bleed. Accents: red square seal stamps.
> Avoid: heavy gradients, rounded cards, Material/iOS-default look.

## 1. S-01 巻物トップ
**JP**
> 横スクロールの「巻物」トップ画面。左端に縦書きの筆文字タイトル「合氣道」。章カード（沿革／理念／基礎動作／技一覧／単語集）を横一列に並べ、各カードは墨で描いた不揃いな枠線と右下に小さな朱印。画面下部に細い筆線のプログレスバー。背景は生成りの和紙。静謐で余白が多い。

**EN**
> Horizontally scrolling "emaki" home screen. Vertical brush-calligraphy title at the left edge. Chapter cards (History, Philosophy, Fundamentals, Techniques, Glossary) in a single row; each framed by uneven ink strokes with a small red seal at bottom-right. Thin brush-line progress bar at the bottom. Off-white washi background. Serene, lots of negative space.

## 2. S-03 技詳細
**JP**
> 技詳細画面。上半分は墨のラインアートで描いた人物2体（取り・受け）の「アニメーション領域」。領域上部に「取り／受け」の切替タブ（筆文字）、領域下に再生・一時停止と横長のスクラブバー（筆線）。右端に縦書きで技名「正面打ち一教」と小さく英名。下半分は6部位（目・顔・肩・腹・膝・足）の折り畳みリスト。各行は墨枠、左に部位名、右に短い一言。1行だけ展開状態で詳細テキストを表示し、本文中の専門用語は朱色の下線リンク。

**EN**
> Technique detail screen. Top half: an "animation area" with two ink line-art figures (tori and uke). Above it, brush-lettered toggle tabs "Tori / Uke"; below it, play/pause and a wide brush-line scrub bar. Vertical technique title on the right edge with a small English name. Bottom half: a collapsible list of six body parts (Eyes, Face, Shoulders, Hara, Knees, Feet). Each row framed in ink, part name on the left, a short hint on the right. Show one row expanded with detail text; jargon in the text appears as vermilion underlined links.

## 3. S-04 単語集
**JP**
> 単語集一覧。上部に筆致の下線だけの検索バー。五十音（あ・か・さ…）のインデックスを縦書きで右端に。用語カードは墨枠、用語（大）・読み（小）・英語（薄い墨色）の3行。分類タグ（基本／体捌き／技／思想）は小さな朱印風。

**EN**
> Glossary list. A search bar drawn as a single brush underline at the top. Vertical kana index (a, ka, sa…) on the right edge. Term cards framed in ink with three lines: term (large), reading (small), English (light ink). Category tags (basics, body movement, techniques, philosophy) as tiny red seal stamps.

## 4. S-06 章ページ（沿革）
**JP**
> 章ページ「沿革」。縦書きの大見出し、年表は筆線の縦軸に年と出来事を並べる。人物名は朱色リンク。和紙背景、余白広め。

**EN**
> Chapter page "History". Large vertical heading; a timeline drawn as a vertical brush line with years and events. Person names as vermilion links. Washi background, generous margins.

## 5. Stitch 出力の受け取り方
1. 各画面を「HTMLエクスポート」し `design/stitch/<screen>.html` に保存（git管理）。
2. Fable が色・フォント・余白を抽出して `src/styles/tokens.css` に転記（値は本ドキュメントの五彩を正とする）。
3. Opus は Stitch の HTML を**参考にするだけ**で、コンポーネントは Svelte で書き直す（Stitch のDOMをそのまま使わない）。
4. MCP を使う場合は公式リモート `https://stitch.googleapis.com/mcp`（`STITCH_API_KEY`）。まずは手動エクスポートで十分。
