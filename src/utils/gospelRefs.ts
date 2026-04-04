export const GOSPELS = ['Matthew', 'Mark', 'Luke', 'John'] as const
export type Gospel = (typeof GOSPELS)[number]

export type VerseRef = {
  book: Gospel
  chapter: number
  verse: number
}

export const BOOK_LAST_VERSE: Record<Gospel, VerseRef> = {
  Matthew: { book: 'Matthew', chapter: 28, verse: 20 },
  Mark: { book: 'Mark', chapter: 16, verse: 20 },
  Luke: { book: 'Luke', chapter: 24, verse: 53 },
  John: { book: 'John', chapter: 21, verse: 25 },
}

export const BOOK_FIRST_VERSE: Record<Gospel, VerseRef> = {
  Matthew: { book: 'Matthew', chapter: 1, verse: 1 },
  Mark: { book: 'Mark', chapter: 1, verse: 1 },
  Luke: { book: 'Luke', chapter: 1, verse: 1 },
  John: { book: 'John', chapter: 1, verse: 1 },
}

function bookIndex(book: Gospel): number {
  return GOSPELS.indexOf(book)
}

export function compareVerseRef(a: VerseRef, b: VerseRef): number {
  const bi = bookIndex(a.book) - bookIndex(b.book)
  if (bi !== 0) return bi
  if (a.chapter !== b.chapter) return a.chapter - b.chapter
  return a.verse - b.verse
}

export function verseRefsEqual(a: VerseRef, b: VerseRef): boolean {
  return (
    a.book === b.book &&
    a.chapter === b.chapter &&
    a.verse === b.verse
  )
}

/** Normalize en-dash / em-dash to ASCII hyphen for parsing. */
export function normalizeDashes(s: string): string {
  return s.replace(/[\u2013\u2014]/g, '-').trim()
}

/**
 * Parse a cell like "22:41–46", "26:20", or "18:39–19:16" for the given gospel.
 */
export function parseRefRange(
  book: Gospel,
  cell: string,
): { start: VerseRef; end: VerseRef } | null {
  if (!cell?.trim()) return null
  const normalized = normalizeDashes(cell)
  const m = /^(\d+):(\d+)(?:-(\d+)(?::(\d+))?)?$/.exec(normalized)
  if (!m) return null
  const startCh = Number(m[1])
  const startV = Number(m[2])
  const start: VerseRef = { book, chapter: startCh, verse: startV }
  if (m[3] === undefined) {
    return { start, end: { ...start } }
  }
  if (m[4] !== undefined) {
    return {
      start,
      end: { book, chapter: Number(m[3]), verse: Number(m[4]) },
    }
  }
  return {
    start,
    end: { book, chapter: startCh, verse: Number(m[3]) },
  }
}

export function formatVerseRef(v: VerseRef): string {
  return `${v.book} ${v.chapter}:${v.verse}`
}

export function bibleGatewaySearchQuery(book: Gospel, passage: string): string {
  return `${book} ${normalizeDashes(passage)}`
}

export function rowCanonBounds(row: {
  Matthew: string
  Mark: string
  Luke: string
  John: string
}): { min: VerseRef; max: VerseRef } | null {
  let min: VerseRef | null = null
  let max: VerseRef | null = null
  for (const book of GOSPELS) {
    const r = parseRefRange(book, row[book])
    if (!r) continue
    if (!min || compareVerseRef(r.start, min) < 0) min = r.start
    if (!max || compareVerseRef(r.end, max) > 0) max = r.end
  }
  if (!min || !max) return null
  return { min, max }
}

/** True if `ref` lies within the parsed passage in that row/column (same book). */
export function verseRefContainedInCell(
  row: { Matthew: string; Mark: string; Luke: string; John: string },
  ref: VerseRef,
): boolean {
  const r = parseRefRange(ref.book, row[ref.book])
  if (!r) return false
  return (
    compareVerseRef(r.start, ref) <= 0 && compareVerseRef(ref, r.end) <= 0
  )
}

type HarmonyNumRow = {
  num: number
  Matthew: string
  Mark: string
  Luke: string
  John: string
}

/**
 * Map start/end verse picks to inclusive row `num` bounds: first row whose
 * passage in `startRef.book` contains `startRef`, and last row whose passage
 * in `endRef.book` contains `endRef`. Rows without that column still appear
 * when their `num` falls between those bounds. If nothing contains a pick,
 * that side falls back to the table edge (min or max `num`).
 *
 * A null start or end means no bound on that side (include from table min or
 * through table max, respectively). Both null yields the full table range.
 */
export function numRangeForVerseRefs(
  rows: HarmonyNumRow[],
  startRef: VerseRef | null,
  endRef: VerseRef | null,
): { lo: number; hi: number } {
  if (rows.length === 0) return { lo: 0, hi: 0 }

  const tableMin = Math.min(...rows.map((r) => r.num))
  const tableMax = Math.max(...rows.map((r) => r.num))

  let startNum = tableMin
  if (startRef !== null) {
    startNum = tableMax
    let foundStart = false
    for (const row of rows) {
      if (verseRefContainedInCell(row, startRef)) {
        foundStart = true
        if (row.num < startNum) startNum = row.num
      }
    }
    if (!foundStart) startNum = tableMin
  }

  let endNum = tableMax
  if (endRef !== null) {
    endNum = tableMin
    let foundEnd = false
    for (const row of rows) {
      if (verseRefContainedInCell(row, endRef)) {
        foundEnd = true
        if (row.num > endNum) endNum = row.num
      }
    }
    if (!foundEnd) endNum = tableMax
  }

  const lo = Math.min(startNum, endNum)
  const hi = Math.max(startNum, endNum)
  return { lo, hi }
}

export function collectVerseRefOptions(
  rows: Array<{
    Matthew: string
    Mark: string
    Luke: string
    John: string
  }>,
): VerseRef[] {
  const map = new Map<string, VerseRef>()
  const add = (v: VerseRef) => {
    map.set(`${v.book}:${v.chapter}:${v.verse}`, v)
  }
  for (const book of GOSPELS) {
    add(BOOK_FIRST_VERSE[book])
    add(BOOK_LAST_VERSE[book])
  }
  for (const row of rows) {
    for (const book of GOSPELS) {
      const r = parseRefRange(book, row[book])
      if (!r) continue
      add(r.start)
      add(r.end)
    }
  }
  return [...map.values()].sort(compareVerseRef)
}

export function lastVerseOfBook(book: Gospel): VerseRef {
  return { ...BOOK_LAST_VERSE[book] }
}

export function firstVerseOfBook(book: Gospel): VerseRef {
  return { ...BOOK_FIRST_VERSE[book] }
}
