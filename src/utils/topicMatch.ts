import type { HarmonyRow } from '../types/harmony'

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const row = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) row[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return row[n]!
}

/**
 * Nearest-match filter on Event: substring matches rank best; otherwise
 * keep rows within a small band of the best Levenshtein distance.
 */
export function filterRowsByTopic(
  rows: HarmonyRow[],
  query: string,
): HarmonyRow[] {
  const q = query.trim()
  if (!q) return rows
  const ql = q.toLowerCase()
  const scored = rows.map((row) => {
    const t = row.Event
    const tl = t.toLowerCase()
    const d = tl.includes(ql) ? 0 : levenshtein(ql, tl)
    return { row, d }
  })
  scored.sort((a, b) => a.d - b.d)
  const minD = scored[0]?.d ?? 0
  const band = minD === 0 ? 0 : Math.max(4, Math.ceil(ql.length * 0.25))
  let picked = scored.filter((s) => s.d <= minD + band)
  if (picked.length === 0) {
    picked = scored.slice(0, 12)
  }
  return picked.map((s) => s.row)
}
