import { Router, Request, Response } from 'express'
import fs from 'fs'
import { getDb } from '../database'
import { asyncHandler } from '../utils/async-handler'

interface SeriesRow {
  id: string
  title: string
  poster: string
}

interface TmdbResult {
  poster_path?: string
  overview?: string
  media_type?: string
}

interface TmdbSearchResponse {
  results?: TmdbResult[]
}

const router = Router()

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

router.get('/:id', (req: Request, res: Response) => {
  const paramsId = req.params.id as string
  const db = getDb()
  const row = db.prepare('SELECT id, title, poster FROM series WHERE id = ?').get(paramsId) as SeriesRow | undefined
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Series not found' })
    return
  }

  if (row.poster && fs.existsSync(row.poster)) {
    res.sendFile(row.poster)
    return
  }

  if (row.poster && row.poster.startsWith('http')) {
    res.redirect(row.poster)
    return
  }

  const cached = db.prepare("SELECT value FROM app_session WHERE key = ?").get(`poster_${req.params.id}`) as { value: string } | undefined
  if (cached) {
    db.prepare('UPDATE series SET poster = ? WHERE id = ?').run(cached.value, paramsId)
    if (cached.value.startsWith('http')) {
      res.redirect(cached.value)
      return
    }
    if (fs.existsSync(cached.value)) {
      res.sendFile(cached.value)
      return
    }
  }

  const tmdbKey = db.prepare("SELECT value FROM app_session WHERE key = ?").get('tmdb_key') as { value: string } | undefined
  if (tmdbKey?.value) {
    fetchTmdbPoster(row.title, tmdbKey.value, paramsId, db)
      .then(url => {
        if (url) {
          res.redirect(url)
        } else {
          res.status(404).json({ error: 'NOT_FOUND', message: 'No poster' })
        }
      })
      .catch(() => {
        res.status(404).json({ error: 'NOT_FOUND', message: 'No poster' })
      })
    return
  }

  res.status(404).json({ error: 'NOT_FOUND', message: 'No poster' })
})

async function searchTmdb(title: string, apiKey: string): Promise<TmdbResult | undefined> {
  const searchUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&api_key=${apiKey}&language=es`
  const res = await fetch(searchUrl)
  const data: TmdbSearchResponse = await res.json()
  return data.results?.find((r: TmdbResult) =>
    (r.media_type === 'tv' || r.media_type === 'movie') && r.poster_path
  ) || data.results?.[0]
}

async function fetchTmdbPoster(title: string, apiKey: string, seriesId: string, db: ReturnType<typeof getDb>): Promise<string | null> {
  try {
    const result = await searchTmdb(title, apiKey)
    if (result?.poster_path) {
      const url = `${TMDB_IMAGE_BASE}${result.poster_path}`
      db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run(`poster_${seriesId}`, url)
      db.prepare('UPDATE series SET poster = ? WHERE id = ?').run(url, seriesId)

      if (result.overview) {
        db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run(`overview_${seriesId}`, result.overview)
      }
      return url
    }
  } catch {}
  return null
}

router.get('/overview/:id', asyncHandler(async (req: Request, res: Response) => {
  const paramsId = req.params.id
  const db = getDb()

  const cached = db.prepare("SELECT value FROM app_session WHERE key = ?").get(`overview_${paramsId}`) as { value: string } | undefined
  if (cached) {
    res.json({ overview: cached.value })
    return
  }

  const row = db.prepare('SELECT title FROM series WHERE id = ?').get(paramsId) as { title: string } | undefined
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Series not found' })
    return
  }

  const tmdbKey = db.prepare("SELECT value FROM app_session WHERE key = ?").get('tmdb_key') as { value: string } | undefined
  if (tmdbKey?.value) {
    const result = await searchTmdb(row.title, tmdbKey.value)
    const overview = result?.overview || ''
    if (overview) {
      db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run(`overview_${paramsId}`, overview)
    }
    res.json({ overview })
    return
  }

  res.json({ overview: '' })
}))

router.post('/fetch-all', asyncHandler(async (req: Request, res: Response) => {
  const db = getDb()
  const bodyKey = req.body?.tmdbKey as string | undefined
  let key = bodyKey

  if (!key) {
    const row = db.prepare("SELECT value FROM app_session WHERE key = ?").get('tmdb_key') as { value: string } | undefined
    key = row?.value
  }

  if (!key) {
    res.status(400).json({ error: 'NO_TMDB_KEY', message: 'TMDB API key not configured' })
    return
  }

  if (bodyKey) {
    db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run('tmdb_key', bodyKey)
  }

  const series = db.prepare('SELECT id, title, poster FROM series ORDER BY title').all() as SeriesRow[]
  let found = 0
  for (const s of series) {
    if (s.poster) continue
    const url = await fetchTmdbPoster(s.title, key, s.id, db)
    if (url) found++
  }
  res.json({ found, total: series.length })
}))

export default router
