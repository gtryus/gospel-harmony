import { useCallback, useMemo, useRef, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import SettingsIcon from '@mui/icons-material/Settings'
import rawHarmony from './data/gospel-harmony-data.json'
import type { HarmonyDataFile } from './types/harmony'
import {
  type Gospel,
  GOSPELS,
  type VerseRef,
  bibleGatewaySearchQuery,
  collectVerseRefOptions,
  compareVerseRef,
  formatVerseRef,
  firstVerseOfBook,
  lastVerseOfBook,
  numRangeForVerseRefs,
  verseRefsEqual,
} from './utils/gospelRefs'
import { filterRowsByTopic } from './utils/topicMatch'
import './App.css'

const harmony = rawHarmony as HarmonyDataFile
const ALL_ROWS = harmony.rows

/** Below this viewport width, show harmony rows as cards instead of a wide table. */
const HARMONY_TABLE_MIN_WIDTH_PX = 900

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
  const theme = useTheme()
  const useCardLayout = useMediaQuery(
    theme.breakpoints.down(HARMONY_TABLE_MIN_WIDTH_PX),
  )
  const tableAnchorRef = useRef<HTMLDivElement>(null)
  const [topicQuery, setTopicQuery] = useState('')
  const [appliedTopic, setAppliedTopic] = useState('')
  const verseOptions = useMemo(
    () => collectVerseRefOptions(ALL_ROWS),
    [],
  )
  const [startRef, setStartRef] = useState<VerseRef | null>(null)
  const [endRef, setEndRef] = useState<VerseRef | null>(null)
  const [appliedStartRef, setAppliedStartRef] = useState<VerseRef | null>(null)
  const [appliedEndRef, setAppliedEndRef] = useState<VerseRef | null>(null)
  const [bibleVersion, setBibleVersion] = useState<BibleVersion>(readStoredVersion)
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null)

  const handleStartChange = useCallback(
    (_: unknown, value: VerseRef | null) => {
      if (value === null) {
        setStartRef(null)
        return
      }
      const nextStart = value
      setStartRef(nextStart)
      setEndRef((prevEnd) =>
        prevEnd !== null && compareVerseRef(nextStart, prevEnd) > 0
          ? lastVerseOfBook(nextStart.book)
          : prevEnd,
      )
    },
    [],
  )

  const handleEndChange = useCallback(
    (_: unknown, value: VerseRef | null) => {
      if (value === null) {
        setEndRef(null)
        return
      }
      const nextEnd = value
      setEndRef(nextEnd)
      setStartRef((prevStart) =>
        prevStart !== null && compareVerseRef(nextEnd, prevStart) < 0
          ? firstVerseOfBook(nextEnd.book)
          : prevStart,
      )
    },
    [],
  )

  const filteredRows = useMemo(() => {
    const { lo, hi } = numRangeForVerseRefs(
      ALL_ROWS,
      appliedStartRef,
      appliedEndRef,
    )
    const inNumRange = ALL_ROWS.filter(
      (row) => row.num >= lo && row.num <= hi,
    )
    return filterRowsByTopic(inNumRange, appliedTopic)
  }, [appliedTopic, appliedStartRef, appliedEndRef])

  const persistVersion = useCallback((v: BibleVersion) => {
    setBibleVersion(v)
    try {
      localStorage.setItem(VERSION_STORAGE_KEY, v)
    } catch {
      /* ignore */
    }
    setSettingsAnchor(null)
  }, [])

  const handleSearchClick = useCallback(() => {
    setAppliedTopic(topicQuery)
    setAppliedStartRef(startRef === null ? null : { ...startRef })
    setAppliedEndRef(endRef === null ? null : { ...endRef })
    setTimeout(() => {
      tableAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 0)
  }, [topicQuery, startRef, endRef])

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
        <Autocomplete<VerseRef, false, false, false>
          size="small"
          options={verseOptions}
          value={startRef}
          onChange={handleStartChange}
          getOptionLabel={formatVerseRef}
          isOptionEqualToValue={(opt, val) =>
            val !== null && verseRefsEqual(opt, val)
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Starting reference"
              placeholder="All"
            />
          )}
          sx={{ minWidth: 220, flex: '1 1 200px' }}
        />
        <Autocomplete<VerseRef, false, false, false>
          size="small"
          options={verseOptions}
          value={endRef}
          onChange={handleEndChange}
          getOptionLabel={formatVerseRef}
          isOptionEqualToValue={(opt, val) =>
            val !== null && verseRefsEqual(opt, val)
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Ending reference"
              placeholder="All"
            />
          )}
          sx={{ minWidth: 220, flex: '1 1 200px' }}
        />
        <Tooltip title="Apply topic and references to filter the table">
          <IconButton
            aria-label="Search with current topic and reference range"
            onClick={handleSearchClick}
            size="small"
            color="primary"
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>
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

      <Box ref={tableAnchorRef}>
        {useCardLayout ? (
          <Box
            sx={{
              maxHeight: '70vh',
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            <Stack spacing={1.5}>
            {filteredRows.map((row) => (
              <Card key={row.num} variant="outlined">
                <CardContent sx={{py:'4px !important', '&:last-child': { pb: 2 } }}>
                  <Typography variant="overline" color="text.secondary" component="span">
                    #{row.num}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, pl: 1 }} component="span">
                    {row.Event}
                  </Typography>
                  <Box
                    sx={{
                      mt: .5,
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(min(100%, 4rem), 1fr))',
                      gap: 1.25,
                      alignItems: 'start',
                    }}
                  >
                    {GOSPELS.map((book) => (
                      <Box key={book} sx={{ minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}
                        >
                          {book}
                        </Typography>
                        <Box sx={{ typography: 'body2', wordBreak: 'break-word' }}>
                          <GospelCell
                            book={book}
                            passage={row[book]}
                            version={bibleVersion}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
            </Stack>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ maxHeight: '70vh' }}
          >
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
                    <TableCell>{row.Event}</TableCell>
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
        )}
      </Box>

      {filteredRows.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No rows match the current filters.
        </Typography>
      )}
    </Box>
  )
}

export default App
