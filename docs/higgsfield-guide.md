# Higgsfield 活用ガイド（無料枠前提）

## 1. 前提（事実）
- 無料枠は **1日10クレジット（繰越なし）**、動画1本≈8〜15クレジット → 実質1日1本。
- **全出力に透かし**。**無料クレジットの生成物は商用不可**（透かしを消しても不可）。Veo 3 非対応。
- したがって **公開アプリの素材には使わない**。ビジュアル探索・モック確認・Stitch への参考画像に限定する。

## 2. 使い所（探索用）
| 用途 | 生成物 | 目安 | 英語プロンプト例 | 受入基準 |
|---|---|---|---|---|
| 章扉背景 | 墨絵の和紙背景 | 3〜5枚 | `sumi-e ink wash on aged washi paper, minimal composition, large empty negative space for text, subtle ink bleed, Okami-inspired, muted palette, vertical 9:16` | 文字を載せる余白がある／派手すぎない |
| 朱印 | 角印スタンプ | 2〜3枚 | `traditional Japanese red square seal stamp (hanko), vermilion ink on white paper, weathered edges, centered, isolated` | 単色・切り抜きやすい |
| ムード映像 | 円相ループ | 1〜2本 | `slow cinematic single brush stroke forming an enso circle, black ink on washi paper, seamless loop, minimal, no people` | 技の正確性を示さない雰囲気に限定 |
| 人物の雰囲気参考 | 墨絵の武道家 | 2〜3枚 | `ink line-art of two aikido practitioners in keikogi and hakama, minimal brush strokes, no face detail, white background, Okami style` | SVGボディの筆致の参考にする（そのまま使わない） |

## 3. 自作代替（公開素材はこちらを正とする）
- 和紙: SVG `feTurbulence`（baseFrequency 0.8〜1.2, numOctaves 3）＋淡色オーバーレイ＋`mix-blend-mode: multiply`。
- 墨のにじみ: `feTurbulence` → `feDisplacementMap`（scale 6〜12）を墨色シェイプに適用。
- 筆線・円相: `<path>` に `pathLength="1"`、`stroke-dasharray:1; stroke-dashoffset:1→0`、線幅は `stroke-width` を途中で変える2本重ね。
- 朱印: 朱色の正方形＋白抜き文字＋`feTurbulence` の粗ノイズを mask にして掠れを出す。

## 4. どうしても採用したい素材がある場合
- その素材だけ**有料クレジットで再生成**（透かしなし・商用可）。
- 生成日時・プロンプト・ライセンス条件を `design/assets/README.md` に記録する。
