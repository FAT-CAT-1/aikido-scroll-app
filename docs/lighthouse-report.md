# T31 計測レポート（Lighthouse / PWA / a11y）

> backlog T31「Lighthouse（PWA/Perf/A11y）計測と修正」の成果物。完了条件「各90+」。
> PWA カテゴリは Lighthouse 12 で廃止されたため、decisions D-04 の代替確認で判定する。
> 計測日：2026-09-14（5級6技・単語集214語・章ページ2本を載せた状態）

## 1. 計測条件

| 項目 | 値 |
|---|---|
| ツール | Lighthouse 13.4.1 CLI（`npx lighthouse@13.4.1 <URL> --port=<Chromium のデバッグポート>`） |
| ブラウザ | HeadlessChrome 153（Playwright 同梱の Chromium を `--remote-debugging-port` で起動） |
| 端末 | モバイル（412×823、DPR 1.75） |
| 通信・CPU | 既定の擬似スロットリング（RTT 150ms、下り 1.6Mbps、CPU 4倍遅延） |
| 対象 | 公開サイト https://fat-cat-1.github.io/aikido-scroll-app/ の 表紙 `#/`、技詳細 `#/techniques/ikkyo-omote`、単語集 `#/glossary` |
| 回数 | 各3回。表は中央値（Speed Index は実測の応答時間に左右されるため） |

Windows では Lighthouse CLI の Chrome 起動（chrome-launcher）が失敗するため、Chromium を別に起動してポート指定で計測した。

## 2. 結果（公開サイト・最終）

| 画面 | Performance（3回） | 中央値の回の FCP / LCP / TBT / CLS | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| 表紙 | 93 / 99 / 100 → **99** | 1.3s / 1.3s / 0ms / 0 | 100 | 100 | 100 |
| 技詳細 | 100 / 100 / 98 → **100** | 1.1s / 1.5s / 10ms / 0 | 100 | 100 | 100 |
| 単語集 | 100 / 100 / 100 → **100** | 1.1s / 1.2s / 30ms / 0 | 100 | 100 | 100 |

- 表紙の 93 の回は、計測の最初の1回だけ HTML の応答に 2.8 秒かかった（CDN の初回応答）。同じ条件の2回目以降は 99・100。
- LCP は 3 画面とも 1.1〜1.5s（requirements「初回LCP < 2.5s（3G相当）」を満たす）。
- 入口の JS は 87KB（gzip 30KB）（requirements「初期JSバンドル < 150KB gzip」を満たす）。

### 修正の経過（本番ビルドを手元の `vite preview` で計測）

| 画面 | 修正前 | 表紙の静的表示＋遅延読み込み後 | Web フォントの読み込み順を変更後 |
|---|---|---|---|
| 表紙 | 64（FCP 4.7s / LCP 7.7s） | 67（FCP 3.8s / LCP 7.5s） | 100（FCP 1.1s / LCP 1.2s） |
| 技詳細 | 63（FCP 4.8s / LCP 9.5s / CLS 0.047） | 66（FCP 3.8s / LCP 9.6s / CLS 0.044） | 99（FCP 1.1s / LCP 2.1s / CLS 0.0003） |
| 単語集 | 59（FCP 6.5s / LCP 9.3s） | 76（FCP 1.1s / LCP 7.7s） | 100（FCP 1.1s / LCP 1.4s） |

### a11y

axe-core（WCAG 2.2 A/AA）は E2E の7テスト（8画面：巻物トップ、技の一覧、技詳細、深層トグル l5、単語集、用語詳細、更新通知、reduced-motion の技詳細）で違反 0（`npm run test:a11y`）。

### PWA（D-04 の代替確認・公開サイト）

| 確認 | 結果 | 方法 |
|---|---|---|
| manifest の警告・エラー | 0 | CDP `Page.getAppManifest` |
| インストール可否のエラー | 0 | CDP `Page.getInstallabilityErrors` |
| Service Worker | activated、ページを制御、precache 261件 | `navigator.serviceWorker`、Cache Storage |
| 通信を切って表示 | 未訪問だった四方投げ（裏）・座技呼吸法（吹き出し6つ）、用語、章ページが表示され、再読み込みしても開く | Playwright の `setOffline`（手元の本番ビルドでは E2E `tests/e2e/offline.spec.ts`） |

実機での機内モード起動（iOS / Android）は T05 でディレクターが確認する。

## 3. 何が遅かったか・何を直したか

1. **Web フォントを描画待ちとして数えていた（LCP 7〜9s の主因）**
   サブセット化後も書体は計 約1.9MB（Shippori Mincho 400 が約690KB、Yuji Syuku が約580KB）。
   `@font-face` を使う文字がページにあると、アプリの描画と同時にフォントの取得が始まり、擬似スロットリングでは LCP がフォントの到着待ちになっていた。
   → Web フォントは `html.fonts` が付いてから使う。初回は画面と技データの表示後に付け、Service Worker の制御下（precache 済み）では HTML の段階で付けるので、2回目以降はちらつかない（D-32、`src/lib/fonts.ts`）。
2. **入口の JS が大きい**：表紙以外の画面を遅延読み込みにした（入口 JS 189KB→78KB）。単語集が214語になって一覧データで 144KB に増えたため、一覧は単語集・用語の画面を開いたときに読むように分けた（87KB、gzip 30KB）（D-31、D-34）。
3. **JS が来るまで何も出ない**：`index.html` に静的な表紙を置き、アプリの最初の描画で取り除く（D-31）。
4. **precache と初回表示の取り合い**：Service Worker の登録をページの読み込み完了後にした（D-33）。
5. **技詳細の CLS**：吹き出しの段内の並びを、DOM を測った後の並べ替えではなく、ポーズから最初に計算するようにした（0.044→0.0003）。

## 4. 再計測の手順

```bash
# デバッグポート付きの Chromium を起動しておき（例：Playwright の chromium.launch({ args: ['--remote-debugging-port=9334'] })）
npx lighthouse@13.4.1 https://fat-cat-1.github.io/aikido-scroll-app/ --port=9334 --only-categories=performance,accessibility,best-practices,seo
```

手元で測るときは `npm run build` → `npx vite preview --port 4177` の URL に置き換える。

## 5. 残り・注意

- 初回訪問では、画面が出てから Web フォントに切り替わるまで端末の明朝で表示される（通信が遅いと数秒）。2回目以降は最初から Web フォント。backlog §4-2 M1「Yuji Syuku が表示される」は、切り替わった後で確認する。
- precache は 261件・約3.3MB（原稿の JSON は技・用語ごとのチャンク）。初回訪問の通信量として大きい場合は、単語集を1チャンクにまとめる、書体を unicode-range で分割するなどの方法がある（今回は完了条件を満たしたため見送り）。
- 原稿が増えるとフォントのサブセットと precache も増える。`npm run fonts` の後に再計測する。

## 6. 3D 化の後（2026-09-23、decisions D-36・D-40）

技詳細（一教（表））を Three.js の 3D にした後、手元の本番ビルド（`vite preview`）で計測した。計測に使う Chromium の WebGL はソフトウェア描画（SwiftShader）で、実機の GPU より重く出る。

| 段階 | 技詳細の Performance | TBT | 主な長い処理 |
|---|---|---|---|
| 3D を入れた直後 | 85 | 520ms | three.js の初期化と最初の描画（描画用プログラムの準備）が1回の長い処理 |
| カメラ計算の重複をなくし、描くのを1コマ1回に、3D の準備を手が空いてからに | 90〜92 | 290〜350ms | 最初の描画 |
| 描画用プログラムの準備を材料ごとに分け、図形データを先に送り、高密度画面で MSAA を省く | **94〜96**（5回） | 180〜230ms | 50〜130ms の処理に分かれた |

- 表紙 100、単語集 99〜100（3D は技詳細だけで読み込む）。Accessibility・Best Practices・SEO は 3 画面とも 100。
- three.js の描画部分は約 540KB（gzip 135KB）。技詳細を開いたときだけ読み込み、precache に入るのでオフラインでも 3D で表示できる。
- 開発サーバーなど他の処理が動いていると、SwiftShader の描画が遅れて点数が大きく下がることがある（77 が1回出た）。計測は他の処理を止めて行う。
