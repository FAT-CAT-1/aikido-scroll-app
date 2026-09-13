// build:content が出力する JSON の型（content-spec §5 ＋ 実装上の追加項目）

export type Role = 'tori' | 'uke'
export type Part = 'eye' | 'face' | 'shoulder' | 'hara' | 'knee' | 'foot'
export type LevelKey = 'l1' | 'l2' | 'l3' | 'l4' | 'l5'

export const PARTS: readonly Part[] = ['eye', 'face', 'shoulder', 'hara', 'knee', 'foot']
export const PART_LABEL: Record<Part, string> = {
  eye: '目',
  face: '顔',
  shoulder: '肩',
  hara: '腹（帯）',
  knee: '膝',
  foot: '足',
}
/** 吹き出しなど狭い所で使う1字の部位名（読み上げ・見出しは PART_LABEL） */
export const PART_SHORT: Record<Part, string> = {
  eye: '目',
  face: '顔',
  shoulder: '肩',
  hara: '腹',
  knee: '膝',
  foot: '足',
}
export const ROLE_LABEL: Record<Role, string> = { tori: '取り', uke: '受け' }

export interface PartLevels {
  l1: string
  l2_html: string
  l3_html: string
  l4_html: string
  l5_html: string
}

export interface Keyframe {
  id: string
  label: string
  at: number
  desc_html: string
  tori: Record<Part, PartLevels>
  uke: Record<Part, PartLevels>
}

export interface Video {
  url: string
  instructor: string
  rank: string
  note: string
}

export interface Source {
  name: string
  url?: string
}

export type Status = 'draft' | 'review' | 'approved'

export interface Technique {
  id: string
  type: 'technique' | 'kihon'
  name_ja: string
  reading: string
  name_en: string[]
  aliases: string[]
  form: 'omote' | 'ura' | 'none'
  rank: string
  category: string
  default_attack: string | null
  attacks: string[]
  summary_html: string
  keyframes: Keyframe[]
  attack_overrides: Record<string, { label: string; overrides: string[]; desc_html: string; keyframes: Record<string, Keyframe> }>
  related_html: string
  videos: Video[]
  sources: Record<string, Source>
  terms: string[]
  links: string[]
  status: Status
  reviewer: string | null
}

export interface GlossaryEntry {
  id: string
  name_ja: string
  reading: string
  romaji: string
  name_en: string[]
  aliases: string[]
  category: string
  related: string[]
  videos: Video[]
  def_html: string
  def_text: string
  detail_html: string
  related_html: string
  terms: string[]
  links: string[]
  used_in: string[]
  status: Status
}

export interface Page {
  name: string
  title: string
  lead: string
  order: number
  html: string
}

export type Point = [number, number]

export type JointName =
  | 'head'
  | 'neck'
  | 'shoulder_f'
  | 'shoulder_b'
  | 'elbow_f'
  | 'elbow_b'
  | 'wrist_f'
  | 'wrist_b'
  | 'hip'
  | 'hipjoint_f'
  | 'hipjoint_b'
  | 'knee_f'
  | 'knee_b'
  | 'ankle_f'
  | 'ankle_b'

export interface FigurePose {
  facing: 1 | -1
  head_dir: number
  gaze: number
  hara_dir: number
  joints: Record<JointName, Point>
}

export interface PoseKeyframe {
  id: string
  at: number
  ease?: string
  tori: FigurePose
  uke: FigurePose
}

export interface PoseData {
  id: string
  viewBox: [number, number]
  ground: number
  keyframes: PoseKeyframe[]
}

export interface TechniqueSummary {
  id: string
  type: 'technique' | 'kihon'
  name_ja: string
  reading: string
  name_en: string[]
  form: string
  rank: string
  category: string
  default_attack: string | null
  attacks: string[]
  status: Status
  kf_count: number
  has_pose: boolean
}

export interface ContentIndex {
  techniques: TechniqueSummary[]
  kihon: TechniqueSummary[]
  pages: Pick<Page, 'name' | 'title' | 'lead' | 'order'>[]
  glossary_count: number
  /** 攻撃法の slug → 単語集の名前（技が使う攻撃法だけ） */
  attack_names: Record<string, string>
}

export type GlossarySummary = Pick<GlossaryEntry, 'id' | 'name_ja' | 'reading' | 'romaji' | 'name_en' | 'category' | 'def_text' | 'status'>
