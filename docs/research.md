# 技術リサーチと比較検討（2026-09-08 時点）

> 事実（公式一次情報で確認）と提案を区別。「要確認」は一次情報で裏が取れていない項目。

## 1. 結論
- **技アニメ本体は inline SVG（部位id付き）＋ GSAP Timeline** が唯一の妥当解。AI生成動画・Lottieは部位座標を持てず、
  「一時停止→6部位吹き出し」「ピンチで部位ズーム」を構造的に満たせない。
- スタック: Vite + Svelte 5 + TS / vite-plugin-pwa / GSAP（2025-04-30 に全プラグイン無料化・商用可）/ Google Fonts（OFL）/ GitHub Pages。
- 横スクロール: CSS Scroll Snap を基盤、scroll-driven animations（iOS Safari 26+）は `@supports`、旧iOSは GSAP ScrollTrigger。
- ピンチ: Pointer Events 自前実装（Hammer.js はメンテ停止）。戻る: History API 主軸（Navigation API は iOS 26.2+ で任意）。

## 2. Google Stitch
| 項目 | 内容 | 出典区分 |
|---|---|---|
| モデル | Gemini 3（Pro/Flash）。2025-12-10 公式ブログ | 一次 |
| 出力 | HTML、React/React Native/shadcn/Vite 変換（公式 Agent Skills）、AI Studio/Antigravity エクスポート | 一次（GitHub google-labs-code） |
| Figma / 生Tailwind | 二次情報のみ。**要確認** | 二次 |
| 無料枠 | Standard 350生成/月（二次で一致）。Experimental は 50/200 で分裂。**要確認** | 二次 |
| MCP | 公式リモート `https://stitch.googleapis.com/mcp`、npm `@google/stitch-sdk`、公式 Skills `google-labs-code/stitch-skills`。Claude Code 対応明記。導入: `npx plugins add google-labs-code/stitch-skills --scope project --target claude-code` | 一次 |
| 商用/権利 | Stitch固有の記載は一次未確認。Google Labs ToS 準拠と見られる。**要確認** | 二次 |
| 限界 | 静的UIカンプ生成。ピンチ・多段トグル・骨格アニメは表現不可 | 評価 |

**使い方**: デザイントークン（色・フォント・余白）と S-01/S-03/S-04 の画面骨格を得る。インタラクションは Claude Code で実装。

## 3. Higgsfield（無料枠）
- 1日10クレジット（繰越なし）、動画1本≈8〜15クレジット＝実質1日1本、**全出力に透かし**、**無料枠は商用不可**、Veo 3 非対応。
- 用途: 章扉・和紙・朱印の**探索/モック用**に限定。**公開素材は CSS/SVG 自作**（`docs/higgsfield-guide.md`）。

## 4. アニメーション技術比較
| 技術 | 学習 | サイズ | スマホ | 部位ID | 停止/シーク | Claude生成 | 無料 | 判定 |
|---|---|---|---|---|---|---|---|---|
| SVG + CSS/JS | 低〜中 | 極小 | ◎ | ◎ | ◎ | ◎ | ◎ | **第一推奨** |
| SVG + GSAP Timeline | 中 | 小 | ◎ | ◎ | ◎（seek/pause） | ◎ | ◎ | **推奨（scrub/pin）** |
| Rive | 中〜高 | 中 | ◎ | △ | ◎ | △（バイナリ） | 無料枠 | 品質向上期に検討 |
| Lottie | 低 | 小 | ◎ | ✕ | △ | △ | 無料 | 不適 |
| three.js + glTF | 高 | 大 | △ | ○ | ○ | △ | 無料 | 過剰 |

## 5. フロント技術
| 技術 | 状況 |
|---|---|
| scroll-driven animations | iOS Safari 26.0〜、Chrome 115〜、グローバル約82%。Firefox はフラグ |
| GSAP / ScrollTrigger | 2025-04-30 全無料化（Webflow買収）。3.13 で SplitText/DrawSVG 等含む |
| Navigation API | 2026-01 Baseline（iOS 26.2、Firefox 147） |
| ピンチ | Pointer Events で2ポインタ距離差分（MDN公式サンプル）。代替 @use-gesture / interact.js |
| PWA (iOS) | `beforeinstallprompt` なし、A2HS 手動。オフライン閲覧は問題なし |
| フォント | Yuji Syuku / Shippori Mincho(B1) / Zen Old Mincho（すべて Google Fonts・OFL） |

## 6. フレームワーク／ホスティング
- **Svelte 5**: コンパイル時最適化・バンドル最小。State of JS 2025 retention 91%。単独開発・PWA・静的に最適。
- **GitHub Pages**: 1GB/サイト、帯域 100GB/月ソフト上限、Actions でデプロイ。Netlify（100GB/月・300ビルド分）は不要。
  Vite `base` にサブパス設定が必要。

## 7. 和風デザイン実装
- 筆線: `pathLength="1"` + `stroke-dasharray:1; stroke-dashoffset:1→0`。
- 墨のにじみ／和紙: `feTurbulence` + `feDisplacementMap`。
- 縦書き: `writing-mode: vertical-rl`。
- 配色: 墨の五彩（焦#1a1a1a 濃#333 重#555 淡#8a8a8a 清#c9c4b8）＋朱#b7282e＋和紙#efe8d8。

## 8. ユーザー原案ワークフローへの指摘
| 指摘 | 内容 |
|---|---|
| 欠落工程 | 要件定義・情報設計・技術検証スパイク・アニメ素材制作・a11y・テスト・デプロイ・部員フィードバック |
| 順序 | Stitch で見た目を先に固定すると、ピンチ／多段トグル／骨格アニメと後で衝突 → **先に1技を縦貫通** |
| Higgsfield | 位置づけ曖昧 → 装飾探索に限定（透かし・商用不可） |
| 「最終調整」 | 不明確 → a11y／性能／テスト通過・デザイントークン整合の確認と定義 |
| レビュー基準 | 不在 → requirements §9 受け入れ基準で明文化 |

改良版ワークフローと2週間スパイクは `docs/roadmap.md`。
