import { Router, Request, Response } from 'express'
import fs from 'fs'
import { getDb } from '../database'

const router = Router()

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

router.get('/:id', (req: Request, res: Response) => {
  const paramsId = req.params.id as string
  const db = getDb()
  const row = db.prepare('SELECT id, title, poster FROM series WHERE id = ?').get(paramsId) as any
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

async function fetchTmdbPoster(title: string, apiKey: string, seriesId: string, db: any): Promise<string | null> {
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&api_key=${apiKey}&language=es`
    const searchRes = await fetch(searchUrl)
    const searchData: any = await searchRes.json()

    const result = searchData.results?.find((r: any) =>
      (r.media_type === 'tv' || r.media_type === 'movie' || r.media_type === 'anime') &&
      r.poster_path
    ) || searchData.results?.[0]

    if (result?.poster_path) {
      const url = `${TMDB_IMAGE_BASE}${result.poster_path}`
      db.prepare("INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)").run(`poster_${seriesId}`, url)
      db.prepare('UPDATE series SET poster = ? WHERE id = ?').run(url, seriesId)
      return url
    }
  } catch {}
  return null
}

router.post('/fetch-all', async (req: Request, res: Response) => {
  const db = getDb()
  const tmdbKey = db.prepare("SELECT value FROM app_session WHERE key = ?").get('tmdb_key') as { value: string } | undefined
  if (!tmdbKey?.value) {
    res.status(400).json({ error: 'NO_TMDB_KEY', message: 'TMDB API key not configured' })
    return
  }

  const series = db.prepare('SELECT id, title, poster FROM series ORDER BY title').all() as any[]
  let found = 0
  for (const s of series) {
    if (s.poster) continue
    const url = await fetchTmdbPoster(s.title, tmdbKey.value, s.id, db)
    if (url) found++
  }
  res.json({ found, total: series.length })
})

export default router
