#!/usr/bin/env node
// 座技呼吸法（両手取り）の pose.json 初版（推定）
// 正座で向き合い、受けが両手首を掴む → 取りは手刀を上げて受けを伸ばす → 膝を進めて受けを斜め後ろへ崩す → 仰向けに倒して抑える
import { figure, seiza, supine, writePose } from './lib.mjs'

const MAT = 508
const keyframes = []

// 構え：正座で向き合う
keyframes.push({
  id: 'kamae',
  at: 0.0,
  ease: 'power1.inOut',
  tori: seiza({ facing: 1, kneeX: 450, torso: 3 }, 'kamae 取り'),
  uke: seiza({ facing: -1, kneeX: 550, torso: 3 }, 'kamae 受け'),
})

// 接触：受けが取りの両手首を上から掴む
{
  const hands = [500, 408]
  keyframes.push({
    id: 'contact',
    at: 0.15,
    ease: 'power2.inOut',
    tori: seiza({ facing: 1, kneeX: 452, torso: 4, wrists: { f: [hands[0] - 6, hands[1]], b: [hands[0] - 16, hands[1] + 6] }, elbows: { f: 'down', b: 'down' } }, 'contact 取り'),
    uke: seiza({ facing: -1, kneeX: 548, torso: 12, wrists: { f: [hands[0] + 4, hands[1] - 4], b: [hands[0] - 2, hands[1] + 2] }, elbows: { f: 'down', b: 'down' } }, 'contact 受け'),
  })
}

// 上げ：取りは手刀を上げ、受けの腕を上げて受けを伸ばす（受けは腰が浮く）
{
  const hands = [515, 290]
  keyframes.push({
    id: 'age',
    at: 0.4,
    ease: 'power2.inOut',
    tori: seiza({ facing: 1, kneeX: 458, torso: 8, gaze: 10, head_dir: 5, wrists: { f: [hands[0] - 8, hands[1] + 4], b: [hands[0] - 18, hands[1] + 12] }, elbows: { f: 'down', b: 'down' } }, 'age 取り'),
    uke: seiza({ facing: -1, kneeX: 552, torso: -4, neck: -8, sit: 0.35, gaze: 20, head_dir: 15, wrists: { f: [hands[0] + 4, hands[1] - 6], b: [hands[0] - 4, hands[1] - 2] }, elbows: { f: 'up', b: 'up' } }, 'age 受け'),
  })
}

// 崩し：取りは膝を進めて受けを斜め後ろへ崩す（受けは上体が後ろへ倒れ始める）
{
  const hands = [585, 300]
  const uke = figure(
    {
      facing: -1, anchor: ['knee_f', [590, MAT - 8]], torso: -38, neck: -14, lead: 'f', gaze: 45, head_dir: 35, hara_dir: 30,
      legs: { f: [60, -96], b: [64, -92] },
      wrists: { f: hands, b: [hands[0] + 10, hands[1] + 8] }, elbows: { f: 'up', b: 'up' },
    },
    'kuzushi 受け',
  )
  const tori = figure(
    {
      facing: 1, anchor: ['knee_f', [530, MAT]], torso: 26, neck: 0, lead: 'f', gaze: -10, head_dir: -5, hara_dir: -10,
      legs: { f: [58, -96], b: [50, -98] },
      wrists: { f: [hands[0] - 8, hands[1] + 6], b: [hands[0] - 16, hands[1] + 14] },
    },
    'kuzushi 取り',
  )
  keyframes.push({ id: 'kuzushi', at: 0.6, ease: 'power2.in', tori, uke })
}

// 抑え：受けは仰向け、取りは跪座で受けの両腕を抑える
{
  const uke = supine({ headX: 820, dir: -1, knees: 55, wrists: { f: [640, 470], b: [660, 480] } }, 'osae 受け')
  const tori = figure(
    {
      facing: 1, anchor: ['knee_f', [590, MAT]], torso: 42, neck: -12, lead: 'f', gaze: -35, head_dir: -25, hara_dir: -35,
      legs: { f: [60, -96], b: [54, -98] },
      wrists: { f: [650, 468], b: [672, 478] },
    },
    'osae 取り',
  )
  keyframes.push({ id: 'osae', at: 0.85, ease: 'power1.out', tori, uke })
}

// 残心：抑えを保って姿勢を正す
{
  const uke = supine({ headX: 820, dir: -1, knees: 55, wrists: { f: [640, 470], b: [660, 480] } }, 'zanshin 受け')
  const tori = figure(
    {
      facing: 1, anchor: ['knee_f', [586, MAT]], torso: 30, neck: -24, lead: 'f', gaze: -5, head_dir: 0, hara_dir: -25,
      legs: { f: [60, -96], b: [54, -98] },
      wrists: { f: [650, 468], b: [672, 478] },
    },
    'zanshin 取り',
  )
  keyframes.push({ id: 'zanshin', at: 1.0, tori, uke })
}

await writePose('suwariwaza-kokyuho', keyframes)
