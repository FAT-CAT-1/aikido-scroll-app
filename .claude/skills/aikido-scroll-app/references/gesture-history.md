# ピンチズーム／戻るボタン 実装メモ

## 1. ピンチ判定（`src/lib/gesture/pinch.ts`）

```ts
// MDN "Pinch zoom gestures" の方式。技アニメ領域（.stage）にのみ適用。
export function attachPinch(el: HTMLElement, opts: {
  onOut: () => void;      // 距離が増えた → 1段開く
  onIn: () => void;       // 距離が減った → 1段閉じる
  threshold?: number;     // 既定 40px
}) {
  const pts = new Map<number, PointerEvent>();
  let prevDiff = -1, fired = false;
  const th = opts.threshold ?? 40;

  el.style.touchAction = 'none';            // ← この要素だけ
  el.addEventListener('pointerdown', e => pts.set(e.pointerId, e));
  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, e);
    if (pts.size !== 2) return;
    const [a, b] = [...pts.values()];
    const diff = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (prevDiff > 0 && !fired) {
      if (diff - prevDiff > th) { opts.onOut(); fired = true; }
      else if (prevDiff - diff > th) { opts.onIn(); fired = true; }
    }
    if (prevDiff < 0) prevDiff = diff;
  });
  const end = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) { prevDiff = -1; fired = false; }
  };
  ['pointerup','pointercancel','pointerout','pointerleave'].forEach(t => el.addEventListener(t, end));
}
```
- 1回のピンチで1段だけ動かす（`fired` フラグ）。連続で深く開くには指を離してもう一度。
- `pinch out` の中心点（2指の中点）に最も近い部位IDをフォーカス対象にする。

## 2. ズーム（`src/components/Zoomable.svelte`）
- 部位の `getBoundingClientRect()` 中心を `transform-origin` に設定し、`transform: scale(k)` で拡大。
- depth ごとに `k = 1 / 1.6 / 2.4` 目安。`prefers-reduced-motion` ではトランジション0ms。

## 3. 戻るボタン／トグルスタック（`src/lib/history/toggleStack.ts`）

```ts
type Entry = { depth: 1|2|3; role: 'uke'|'tori'; part: Part };
let stack: Entry[] = [];
let closingByUser = false;

export function open(e: Entry) {
  stack.push(e);
  history.pushState({ toggle: e }, '');
  render();
}
export function closeOne() {           // 手動クローズ・pinch in
  if (!stack.length) return;
  closingByUser = true;
  history.back();                       // popstate → onPop
}
window.addEventListener('popstate', () => {
  if (stack.length) { stack.pop(); render(); }
  closingByUser = false;
});
```
- `popstate` 由来でも手動由来でも **stack.pop() は1回だけ**。二重push・二重popを防ぐ。
- 単語集へ遷移（`[[用語]]` タップ）は `pushState({ route:'glossary', from: {scrollX, stack} })`。
  戻ったら `from` を復元して巻物位置とトグル深さを戻す。
- Navigation API（iOS 26.2+）は任意の上乗せ。History API を主軸にする。

## 4. a11y チェックリスト
- `<button aria-expanded aria-controls>` でトグル、内容は `role="region" aria-labelledby`
- キーボード: Enter/Space で開閉、Esc で1段閉じる（`closeOne()`）
- ページ全体のピンチズームは残す（`viewport` に `user-scalable=no` を書かない）
