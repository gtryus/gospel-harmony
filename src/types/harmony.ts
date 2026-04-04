export type HarmonyRow = {
  num: number
  'Event/Topic': string
  Matthew: string
  Mark: string
  Luke: string
  John: string
}

export type HarmonyDataFile = {
  source: string
  columns: string[]
  rows: HarmonyRow[]
}
