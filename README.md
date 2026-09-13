# aikido-scroll-app — 合氣道徹底解説アプリ（企画・仕様一式）

獨協大学合氣道部向け。和風（墨絵・『大神』風）の巻物横スクロールUIで、技を「取り／受け」のSVG骨格アニメと
キーフレームごとの6部位×5階層トグル解説で学べるPWA。実装は Claude Code（企画: Fable 5.1 / 実装: Opus 5）。

## まず読む
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

## content/ の構成（空ディレクトリ・これから埋める）
`techniques/`（技×表裏）`kihon/`（基礎）`glossary/`（1語1ファイル）`poses/`（pose.json）`pages/`（沿革・理念）

## 試験範囲（スパイク）
基礎（半身・構え・体捌き・膝行・受身・呼吸法・攻撃法）＋5級科目（一教 表/裏、四方投げ 表/裏、入身投げ、座技呼吸法）。
まず **一教・表（正面打ち）** を巻物→アニメ→一時停止吹き出し→深層トグル→ピンチ→戻るまで縦に貫通させる。
