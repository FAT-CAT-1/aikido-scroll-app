#!/usr/bin/env node
// 正面打ち入身投げの pose.json 初版（推定）
// 2D 真横なので「受けの側面・背後への入身」は取りが受けと重なる位置で表す（取り＝手前レイヤー）。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { figure, jointOf, supine, writePose } from './lib.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const omote = JSON.parse(readFileSync(path.join(ROOT, 'content', 'poses', 'ikkyo-omote.pose.json'), 'utf8'))
const kamae = omote.keyframes.find((k) => k.id === 'kamae')
const G = 512
const keyframes = [{ id: 'kamae', at: 0.0, ease: 'power1.inOut', tori: kamae.tori, uke: kamae.uke }]

// ---- 接触：正面打ちを手刀で受け流しながら受けの側面へ入身 ----
{
  const uke = figure(
    {
      facing: -1, hip: [610, 302], torso: 8, lead: 'f', gaze: 0,
      ankles: { f: [560, G], b: [672, G] },
      wrists: { f: [520, 170], b: [640, 312] }, elbows: { f: 'up', b: 'down' },
    },
    'contact 受け',
  )
  const tori = figure(
    {
      facing: 1, hip: [470, 306], torso: 8, lead: 'b', gaze: 0, hara_dir: 0,
      ankles: { b: [530, G], f: [410, G] },
      wrists: { f: jointOf(uke, 'wrist_f'), b: [505, 300] },
    },
    'contact 取り',
  )
  keyframes.push({ id: 'contact', at: 0.15, ease: 'power2.inOut', tori, uke })
}

// ---- 入身：受けの背後へ深く入り、首筋と打ち手を制する ----
{
  const uke = figure(
    {
      facing: -1, hip: [575, 312], torso: 22, neck: 6, lead: 'f', gaze: -20, head_dir: -15, hara_dir: -20,
      ankles: { f: [520, G], b: [630, G] },
      wrists: { f: [470, 300], b: [610, 330] }, elbows: { f: 'down', b: 'down' },
    },
    'irimi 受け',
  )
  const tori = figure(
    {
      facing: 1, hip: [600, 304], torso: 6, lead: 'f', gaze: -10, head_dir: -5, hara_dir: -5,
      ankles: { f: [660, G], b: [545, G] },
      wrists: { f: [560, 190], b: jointOf(uke, 'wrist_f') }, elbows: { f: 'up', b: 'down' },
    },
    'irimi 取り',
  )
  keyframes.push({ id: 'irimi', at: 0.35, ease: 'power2.inOut', tori, uke })
}

// ---- 転換：取りは向きを変えて受けを円く導き、前方下へ崩す ----
{
  const uke = figure(
    {
      facing: -1, hip: [520, 350], torso: 58, neck: 14, lead: 'f', gaze: -55, head_dir: -45, hara_dir: -55,
      ankles: { f: [455, G], b: [585, G] },
      wrists: { f: [430, 430], b: [505, 440] }, elbows: { f: 'down', b: 'down' },
    },
    'tenkan 受け',
  )
  const tori = figure(
    {
      facing: -1, hip: [600, 318], torso: 22, neck: 4, lead: 'b', gaze: -35, head_dir: -20, hara_dir: -20,
      ankles: { b: [545, G], f: [680, G] },
      wrists: { b: [505, 280], f: [560, 380] }, elbows: { b: 'down', f: 'down' },
    },
    'tenkan 取り',
  )
  keyframes.push({ id: 'tenkan', at: 0.55, ease: 'power2.inOut', tori, uke })
}

// ---- 投げ：起き上がる受けの前へ入身し、腕を顔の前から斬り下ろして仰向けに崩す ----
{
  const uke = figure(
    {
      facing: 1, hip: [470, 330], torso: -28, neck: -16, lead: 'f', gaze: 30, head_dir: 25, hara_dir: 20,
      ankles: { f: [530, G], b: [400, G] },
      wrists: { f: [520, 270], b: [430, 300] }, elbows: { f: 'down', b: 'down' },
    },
    'nage 受け',
  )
  const tori = figure(
    {
      facing: -1, hip: [585, 314], torso: 18, neck: 0, lead: 'f', gaze: -20, head_dir: -10, hara_dir: -15,
      ankles: { f: [520, G], b: [660, G] },
      wrists: { f: [440, 250], b: [560, 340] }, elbows: { f: 'down', b: 'down' },
    },
    'nage 取り',
  )
  keyframes.push({ id: 'nage', at: 0.8, ease: 'power2.in', tori, uke })
}

// ---- 残心：受けは後ろ受身で仰向け、取りは姿勢を正して残心 ----
{
  const uke = supine({ headX: 250, dir: 1, wrists: { f: [360, 470], b: [390, 505] } }, 'zanshin 受け')
  const tori = figure(
    {
      facing: -1, hip: [600, 304], torso: 4, neck: 0, lead: 'f', gaze: -18, head_dir: -8, hara_dir: -5,
      ankles: { f: [540, G], b: [665, G] },
      wrists: { f: [520, 270], b: [610, 310] },
    },
    'zanshin 取り',
  )
  keyframes.push({ id: 'zanshin', at: 1.0, tori, uke })
}

await writePose('iriminage', keyframes)
