// src/generated/（build:content の出力）を読む。技・用語などは必要になった時に遅延読み込み（design-complete A-1）
import type { ContentIndex, GlossaryEntry, Page, PoseData, Technique } from './types'

type Mods<T> = Record<string, () => Promise<{ default: T }>>

const techniqueMods = import.meta.glob('/src/generated/techniques/*.json') as Mods<Technique>
const kihonMods = import.meta.glob('/src/generated/kihon/*.json') as Mods<Technique>
const glossaryMods = import.meta.glob('/src/generated/glossary/*.json') as Mods<GlossaryEntry>
const pageMods = import.meta.glob('/src/generated/pages/*.json') as Mods<Page>
const poseMods = import.meta.glob('/src/generated/poses/*.json') as Mods<PoseData>
const indexMods = import.meta.glob('/src/generated/index.json', { eager: true }) as Record<string, { default: ContentIndex }>

export const contentIndex: ContentIndex = Object.values(indexMods)[0]?.default ?? { techniques: [], kihon: [], glossary: [], pages: [] }

async function load<T>(mods: Mods<T>, dir: string, id: string): Promise<T | null> {
  const loader = mods[`/src/generated/${dir}/${id}.json`]
  return loader ? (await loader()).default : null
}

export const loadTechnique = (id: string) => load(techniqueMods, 'techniques', id)
export const loadKihon = (id: string) => load(kihonMods, 'kihon', id)
export const loadGlossary = (id: string) => load(glossaryMods, 'glossary', id)
export const loadPage = (name: string) => load(pageMods, 'pages', name)
export const loadPose = (id: string) => load(poseMods, 'poses', id)
