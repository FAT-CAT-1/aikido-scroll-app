// 単語集の一覧（build:content の src/generated/glossary-index.json）
// 表紙や技の画面では使わないので、起動時の index.json には入れず、これを読み込む画面（単語集・用語）のチャンクにだけ入る
import type { GlossarySummary } from './types'

const mods = import.meta.glob('/src/generated/glossary-index.json', { eager: true }) as Record<string, { default: GlossarySummary[] }>

export const glossaryIndex: GlossarySummary[] = Object.values(mods)[0]?.default ?? []
