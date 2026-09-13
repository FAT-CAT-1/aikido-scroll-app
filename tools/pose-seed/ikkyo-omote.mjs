#!/usr/bin/env node
// 正面打ち一教（表）の pose.json 初版を推定生成する（backlog T09 / animation-spec §9 手順2）
//   node tools/pose-seed/ikkyo-omote.mjs          … content/poses/ikkyo-omote.pose.json に書き出す
//   node tools/pose-seed/ikkyo-omote.mjs --force  … 既存ファイルを上書き（エディタで直した後は使わない）
//
// 2D 真横・取り右向き（facing +1）で作る（animation-spec §2）。
// 相半身：取りは手前(f)側、受けは奥(b)側の足が前（画面上で互いに同じ側の足が前になる）。
// 受けは手前(f)の手で正面打ちを打ち、取りはその手首と肘に手刀で触れる。
// 2D なので、実際は受けの側面にいる取りの位置は「前後の重なり」で表す（取り＝手前レイヤー）。

import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { figure, jointOf, warnings } from './lib.mjs'

const OUT = path.resolve(import.meta.dirname, '..', '..', 'content', 'poses', 'ikkyo-omote.pose.json')
const G = 512 // 立ち姿勢の足首の高さ（地面 520 のわずか上）
const MAT = 508 // 膝・体を畳に着けたときの高さ

const keyframes = []

// ---- 構え（kamae）: 相半身で対峙 ----
{
  const tori = figure(
    { facing: 1, hip: [380, 300], torso: 2, lead: 'f', gaze: -4, ankles: { f: [447, G], b: [313, G] }, wrists: { f: [469, 250], b: [413, 286] } },
    'kamae 取り',
  )
  const uke = figure(
    { facing: -1, hip: [620, 300], torso: 2, lead: 'b', gaze: -4, ankles: { b: [553, G], f: [687, G] }, wrists: { b: [531, 250], f: [587, 286] } },
    'kamae 受け',
  )
  keyframes.push({ id: 'kamae', at: 0.0, ease: 'power1.inOut', tori, uke })
}

// ---- 接触（contact）: 受けが踏み込んで正面打ち、取りは後ろ足を踏み込み手刀で肘と手首に触れる ----
{
  const uke = figure(
    {
      facing: -1, hip: [628, 302], torso: 6, lead: 'f', gaze: 5,
      ankles: { f: [585, G], b: [690, G] },
      wrists: { f: [540, 124], b: [640, 310] }, elbows: { f: 'up', b: 'down' },
    },
    'contact 受け',
  )
  const tori = figure(
    {
      facing: 1, hip: [440, 305], torso: 10, lead: 'b', gaze: 2,
      ankles: { b: [488, G], f: [378, G] },
      wrists: { b: jointOf(uke, 'wrist_f'), f: jointOf(uke, 'elbow_f') }, elbows: { b: 'down', f: 'down' },
    },
    'contact 取り',
  )
  keyframes.push({ id: 'contact', at: 0.15, ease: 'power2.inOut', tori, uke })
}

// ---- 崩し（kuzushi）: 肘を制して腕を前下へ斬り下ろし、受けの上体が前へ折れ始める ----
{
  const uke = figure(
    {
      facing: -1, hip: [668, 312], torso: 32, neck: 8, lead: 'f', gaze: -20, head_dir: -15, hara_dir: -25,
      ankles: { f: [612, G], b: [720, G] },
      wrists: { f: [528, 250], b: [668, 322] }, elbows: { f: 'up', b: 'down' },
    },
    'kuzushi 受け',
  )
  const tori = figure(
    {
      facing: 1, hip: [455, 308], torso: 14, lead: 'b', gaze: -15, head_dir: -8, hara_dir: -10,
      ankles: { b: [505, G], f: [392, G] },
      wrists: { b: jointOf(uke, 'wrist_f'), f: jointOf(uke, 'elbow_f') },
    },
    'kuzushi 取り',
  )
  keyframes.push({ id: 'kuzushi', at: 0.35, ease: 'power2.inOut', tori, uke })
}

// ---- 入身（irimi）: 取りが後ろ足を大きく踏み込み、受けの腕を前下へ導いて畳へ落としていく ----
{
  const uke = figure(
    {
      facing: -1, hip: [705, 350], torso: 64, neck: 10, lead: 'f', gaze: -50, head_dir: -40, hara_dir: -60,
      ankles: { f: [648, G], b: [765, G] },
      wrists: { f: [520, 340], b: [640, 420] }, elbows: { f: 'up', b: 'down' },
    },
    'irimi 受け',
  )
  const tori = figure(
    {
      facing: 1, hip: [468, 322], torso: 40, neck: 4, lead: 'f', gaze: -40, head_dir: -25, hara_dir: -35,
      ankles: { f: [548, G], b: [385, G] },
      wrists: { b: jointOf(uke, 'wrist_f'), f: jointOf(uke, 'elbow_f') },
    },
    'irimi 取り',
  )
  keyframes.push({ id: 'irimi', at: 0.55, ease: 'power2.inOut', tori, uke })
}

// ---- 抑え（osae）: 受けは腹這い、取りは跪座で受けの腕を斜め前に伸ばし肘と手首を抑える ----
// 受けは頭を取り側（左）にして腹這い。手前の腕を前方へ伸ばされ、取りはその腕の上に覆いかぶさる
const ukeProne = (bWrist, bArmUp) =>
  figure(
    {
      facing: -1, anchor: ['hip', [705, 496]], torso: 88, neck: -4, lead: 'f', gaze: -75, head_dir: -35, hara_dir: -85,
      legs: { f: [-86, -92], b: [-84, -96] },
      wrists: { f: [452, 470], b: bWrist }, elbows: { f: 'up', b: bArmUp },
    },
    'osae 受け',
  )
{
  const uke = ukeProne([640, 505], 'up')
  const tori = figure(
    {
      facing: 1, anchor: ['knee_f', [538, MAT]], torso: 55, neck: -25, lead: 'f', gaze: -55, head_dir: -35, hara_dir: -55,
      legs: { f: [62, -96], b: [54, -98] },
      wrists: { b: jointOf(uke, 'wrist_f'), f: jointOf(uke, 'elbow_f') },
    },
    'osae 取り',
  )
  keyframes.push({ id: 'osae', at: 0.8, ease: 'power1.out', tori, uke })
}

// ---- 残心（zanshin）: 抑えを保ったまま姿勢を正し、周囲と受けへの意識を切らさない ----
{
  const uke = ukeProne([612, 470], 'up')
  const tori = figure(
    {
      facing: 1, anchor: ['knee_f', [532, MAT]], torso: 46, neck: -32, lead: 'f', gaze: 0, head_dir: 0, hara_dir: -40,
      legs: { f: [60, -96], b: [52, -98] },
      wrists: { b: jointOf(uke, 'wrist_f'), f: jointOf(uke, 'elbow_f') },
    },
    'zanshin 取り',
  )
  keyframes.push({ id: 'zanshin', at: 1.0, tori, uke })
}

const pose = { id: 'ikkyo-omote', viewBox: [1000, 600], ground: 520, keyframes }

if (existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(`${path.relative(process.cwd(), OUT)} は既にあります（エディタでの修正を守るため上書きしません。--force で上書き）`)
  process.exit(1)
}
// pose-editor.html の保存形式と同じ（[x, y] を1行に）
writeFileSync(OUT, JSON.stringify(pose, null, 2).replace(/\[\s+(-?\d+(?:\.\d+)?),\s+(-?\d+(?:\.\d+)?)\s+\]/g, '[$1, $2]') + '\n')
console.log(`書き出し: ${path.relative(process.cwd(), OUT)}`)
for (const w of warnings) console.log(`  注意: ${w}`)
