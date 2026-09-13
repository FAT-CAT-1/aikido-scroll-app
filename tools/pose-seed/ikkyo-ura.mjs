#!/usr/bin/env node
// 正面打ち一教（裏）の pose.json 初版（推定）
// 構え・接触・崩しは一教（表）の初版と同じ形。転換で取りが向きを変え（facing -1）、受けを円く導いて畳へ下ろす。
// 抑え・残心は一教（表）の抑えを左右反転した形。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { figure, jointOf, mirror, writePose } from './lib.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const omote = JSON.parse(readFileSync(path.join(ROOT, 'content', 'poses', 'ikkyo-omote.pose.json'), 'utf8'))
const byId = Object.fromEntries(omote.keyframes.map((k) => [k.id, k]))
const G = 512

const keyframes = []
for (const [id, at] of [
  ['kamae', 0.0],
  ['contact', 0.15],
  ['kuzushi', 0.35],
]) {
  const src = byId[id]
  keyframes.push({ id, at, ease: src.ease, tori: src.tori, uke: src.uke })
}

// ---- 転換（tenkan）: 取りは前足を軸に後ろ足を回して向きを変え、受けの腕を円く導いて下ろす ----
{
  const uke = figure(
    {
      facing: -1, hip: [520, 345], torso: 55, neck: 10, lead: 'f', gaze: -45, head_dir: -35, hara_dir: -50,
      ankles: { f: [455, G], b: [575, G] },
      wrists: { f: [492, 302], b: [430, 420] }, elbows: { f: 'up', b: 'down' },
    },
    'tenkan 受け',
  )
  const tori = figure(
    {
      facing: -1, hip: [565, 312], torso: 25, neck: 6, lead: 'f', gaze: -30, head_dir: -20, hara_dir: -25,
      ankles: { f: [505, G], b: [650, G] },
      wrists: { f: jointOf(uke, 'wrist_f'), b: jointOf(uke, 'elbow_f') },
    },
    'tenkan 取り',
  )
  keyframes.push({ id: 'tenkan', at: 0.6, ease: 'power2.inOut', tori, uke })
}

for (const [id, at, srcId] of [
  ['osae', 0.85, 'osae'],
  ['zanshin', 1.0, 'zanshin'],
]) {
  const src = byId[srcId]
  const kf = { id, at, tori: mirror(src.tori), uke: mirror(src.uke) }
  if (id === 'osae') kf.ease = 'power1.out'
  keyframes.push(kf)
}

await writePose('ikkyo-ura', keyframes)
