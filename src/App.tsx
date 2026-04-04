import { useCallback, useMemo, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SettingsIcon from '@mui/icons-material/Settings'
import rawHarmony from './data/NLT_Harmony_of_the_Four_Gospels.json'
import type { HarmonyDataFile } from './types/harmony'
import {
  type Gospel,
  GOSPELS,
  BOOK_FIRST_VERSE,
  BOOK_LAST_VERSE,
  type VerseRef,
  bibleGatewaySearchQuery,
  collectVerseRefOptions,
  compareVerseRef,
  formatVerseRef,
  firstVerseOfBook,
  lastVerseOfBook,
  rowCanonBounds,
  verseRefsEqual,
} from './utils/gospelRefs'
import { filterRowsByTopic } from './utils/topicMatch'
import './App.css'

const harmony = rawHarmony as HarmonyDataFile
const ALL_ROWS = harmony.rows

const BIBLE_VERSIONS = [
  'NLT',
  'NIV',
  'NKJV',
  'NASB',
  'NASB1995',
  'ESV',
] as const
type BibleVersion = (typeof BIBLE_VERSIONS)[number]

const VERSION_STORAGE_KEY = 'gospel-harmony-bible-version'

function readStoredVersion(): BibleVersion {
  try {
    const v = localStorage.getItem(VERSION_STORAGE_KEY)
    if (v && (BIBLE_VERSIONS as readonly string[]).includes(v)) {
      return v as BibleVersion
    }
  } catch {
    /* ignore */
  }
  return 'NLT'
}

function GospelCell(props: {
  book: Gospel
  passage: string
  version: BibleVersion
}) {
  const { book, passage, version } = props
  if (!passage?.trim()) {
    return (
      <Typography component="span" color="text.secondary">
        —
      </Typography>
    )
  }
  const search = bibleGatewaySearchQuery(book, passage)
  const href = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${version}`
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover">
      {passage}
    </Link>
  )
}

function App() {
  const [topicQuery, setTopicQuery] = useState('')
  const verseOptions = useMemo(
    () => collectVerseRefOptions(ALL_ROWS),
    [],
  )
  const [startRef, setStartRef] = useState<VerseRef>(() => ({
    ...BOOK_FIRST_VERSE.Matthew,
  }))
  const [endRef, setEndRef] = useState<VerseRef>(() => ({
    ...BOOK_LAST_VERSE.John,
  }))
  const [bibleVersion, setBibleVersion] = useState<BibleVersion>(readStoredVersion)
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null)

  const handleStartChange = useCallback(
    (_: unknown, value: VerseRef | null) => {
      if (!value) return
      const nextStart = value
      setStartRef(nextStart)
      setEndRef((prevEnd) =>
        compareVerseRef(nextStart, prevEnd) > 0
          ? lastVerseOfBook(nextStart.book)
          : prevEnd,
      )
    },
    [],
  )

  const handleEndChange = useCallback(
    (_: unknown, value: VerseRef | null) => {
      if (!value) return
      const nextEnd = value
      setEndRef(nextEnd)
      setStartRef((prevStart) =>
        compareVerseRef(nextEnd, prevStart) < 0
          ? firstVerseOfBook(nextEnd.book)
          : prevStart,
      )
    },
    [],
  )

  const filteredRows = useMemo(() => {
    const byTopic = filterRowsByTopic(ALL_ROWS, topicQuery)
    return byTopic.filter((row) => {
      const bounds = rowCanonBounds(row)
      if (!bounds) return false
      return (
        compareVerseRef(bounds.max, startRef) >= 0 &&
        compareVerseRef(bounds.min, endRef) <= 0
      )
    })
  }, [topicQuery, startRef, endRef])

  const persistVersion = useCallback((v: BibleVersion) => {
    setBibleVersion(v)
    try {
      localStorage.setItem(VERSION_STORAGE_KEY, v)
    } catch {
      /* ignore */
    }
    setSettingsAnchor(null)
  }, [])

  return (
    <Box className="harmony-app" sx={{ py: 2, px: { xs: 1, sm: 2 } }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          label="Event / topic"
          placeholder="Nearest match"
          value={topicQuery}
          onChange={(e) => setTopicQuery(e.target.value)}
          sx={{ minWidth: 200, flex: '1 1 180px' }}
        />
        <Autocomplete<VerseRef>
          size="small"
          options={verseOptions}
          value={startRef}
          onChange={handleStartChange}
          getOptionLabel={formatVerseRef}
          isOptionEqualToValue={verseRefsEqual}
          renderInput={(params) => (
            <TextField {...params} label="Starting reference" />
          )}
          sx={{ minWidth: 220, flex: '1 1 200px' }}
        />
        <Autocomplete<VerseRef>
          size="small"
          options={verseOptions}
          value={endRef}
          onChange={handleEndChange}
          getOptionLabel={formatVerseRef}
          isOptionEqualToValue={verseRefsEqual}
          renderInput={(params) => (
            <TextField {...params} label="Ending reference" />
          )}
          sx={{ minWidth: 220, flex: '1 1 200px' }}
        />
        <Box sx={{ flex: '1 1 auto' }} />
        <IconButton
          aria-label="Bible translation"
          onClick={(e) => setSettingsAnchor(e.currentTarget)}
          edge="end"
          size="small"
        >
          <SettingsIcon />
        </IconButton>
      </Stack>

      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {BIBLE_VERSIONS.map((v) => (
          <MenuItem
            key={v}
            selected={v === bibleVersion}
            onClick={() => persistVersion(v)}
          >
            {v}
          </MenuItem>
        ))}
      </Menu>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Event / topic</TableCell>
              {GOSPELS.map((g) => (
                <TableCell key={g} sx={{ fontWeight: 600 }}>
                  {g}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.num} hover>
                <TableCell>{row.num}</TableCell>
                <TableCell>{row['Event/Topic']}</TableCell>
                {GOSPELS.map((book) => (
                  <TableCell key={book}>
                    <GospelCell
                      book={book}
                      passage={row[book]}
                      version={bibleVersion}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredRows.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No rows match the current filters.
        </Typography>
      )}
    </Box>
  )
}

export default App
