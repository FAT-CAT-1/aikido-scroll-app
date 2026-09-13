// scroll-driven animations 非対応ブラウザ（旧 iOS Safari など）向け：巻物の進捗の筆線を GSAP ScrollTrigger で動かす
// （SKILL §1 / design-complete A-7。対応ブラウザでは CSS の animation-timeline を使うのでこのファイルは読み込まれない）
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function attachScrollProgress(scroller: HTMLElement, bar: HTMLElement): () => void {
  const tween = gsap.fromTo(
    bar,
    { scaleX: 0.02 },
    {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        scroller,
        horizontal: true,
        trigger: scroller.firstElementChild as HTMLElement,
        start: 'left left',
        endTrigger: scroller.lastElementChild as HTMLElement,
        end: 'left left',
        scrub: true,
      },
    },
  )
  return () => {
    tween.scrollTrigger?.kill()
    tween.kill()
  }
}
