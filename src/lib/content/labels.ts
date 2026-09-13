// 画面に出す分類名など（UI の文言。解説文ではない）

export const GLOSSARY_CATEGORY_LABEL: Record<string, string> = {
  taisabaki: '体捌き',
  waza: '技',
  kihon: '基本',
  shiso: '思想',
  rekishi: '歴史',
  soshiki: '組織',
  buki: '武器',
  hito: '人物',
}

export const TECHNIQUE_CATEGORY_LABEL: Record<string, string> = {
  osae: '固め技',
  nage: '投げ技',
  kokyu: '呼吸法',
  kihon: '基本',
  ukemi: '受身',
  attack: '攻撃法',
}

export const RANK_LABEL: Record<string, string> = {
  '5kyu': '五級',
  '4kyu': '四級',
  '3kyu': '三級',
  '2kyu': '二級',
  '1kyu': '一級',
  shodan: '初段',
  kihon: '基礎',
}

export const RANK_ORDER = ['kihon', '5kyu', '4kyu', '3kyu', '2kyu', '1kyu', 'shodan']

export const FORM_LABEL: Record<string, string> = { omote: '表', ura: '裏', none: '' }

export const VIDEO_RANK_LABEL = (rank: string): string => {
  if (rank === 'shihan') return '師範'
  if (rank === 'unknown') return '段位不明'
  const m = rank.match(/^(\d+)dan$/)
  return m ? `${m[1]}段` : rank
}

const KANA_ROWS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'] as const
const ROW_START = [0x3041, 0x304b, 0x3055, 0x305f, 0x306a, 0x306f, 0x307e, 0x3083, 0x3089, 0x308e]

/** 読み（ひらがな・カタカナ）の頭文字から五十音の行（あ・か・さ…）を返す。該当しなければ「他」 */
export function kanaRow(reading: string): string {
  const ch = reading.trim().charAt(0)
  if (!ch) return '他'
  let cp = ch.codePointAt(0)!
  if (cp >= 0x30a1 && cp <= 0x30f6) cp -= 0x60 // カタカナ → ひらがな
  if (cp < 0x3041 || cp > 0x3096) return '他'
  let row: string = KANA_ROWS[0]
  ROW_START.forEach((start, i) => {
    if (cp >= start) row = KANA_ROWS[i]!
  })
  return row
}

export const KANA_ROW_ORDER: readonly string[] = [...KANA_ROWS, '他']
