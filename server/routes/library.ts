import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const type = req.query.type as string | undefined
  const search = req.query.search as string | undefined

  let query = 'SELECT id, title, type, path, poster, added_at as addedAt FROM series'
  const params: unknown[] = []
  const conditions: string[] = []

  if (type) {
    conditions.push('type = ?')
    params.push(type)
  }
  if (search) {
    conditions.push('title LIKE ?')
    params.push(`%${search}%`)
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY title ASC'

  const series = db.prepare(query).all(...params) as { id: string; title: string; type: string; path: string; poster: string; addedAt: string }[]

  const profileId = req.query.profileId as string | undefined
  if (profileId) {
    const favIds = db.prepare('SELECT series_id FROM favorites WHERE profile_id = ?').all(profileId).map((r: any) => r.series_id)
    const result = series.map(s => ({ ...s, favorite: favIds.includes(s.id) }))
    res.json(result)
    return
  }

  res.json(series)
})

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const series = db.prepare('SELECT id, title, type, path, poster, added_at as addedAt FROM series WHERE id = ?').get(req.params.id) as any
  if (!series) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Series not found' })
    return
  }

  const episodes = db.prepare('SELECT id, series_id as seriesId, title, path, season, episode, duration FROM episodes WHERE series_id = ? ORDER BY season ASC, episode ASC').all(req.params.id)

  let favorite = false
  let progress = null
  const profileId = req.query.profileId as string | undefined
  if (profileId) {
    const fav = db.prepare('SELECT 1 FROM favorites WHERE profile_id = ? AND series_id = ?').get(profileId, req.params.id)
    favorite = !!fav

    const lastWatched = db.prepare(
      'SELECT id, profile_id as profileId, episode_id as episodeId, position, completed, watched_at as watchedAt FROM watch_progress WHERE profile_id = ? AND episode_id IN (SELECT id FROM episodes WHERE series_id = ?) ORDER BY watched_at DESC LIMIT 1'
    ).get(profileId, req.params.id) as any
    progress = lastWatched || null
  }

  res.json({ ...series, episodes, favorite, progress })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM series WHERE id = ?').run(req.params.id)
  if (result.changes === 0) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Series not found' })
    return
  }
  res.json({ success: true })
})

router.get('/:id/next', (req: Request, res: Response) => {
  const db = getDb()
  const season = parseInt(req.query.season as string, 10) || 1
  const episode = parseInt(req.query.episode as string, 10) || 1
  const next = db.prepare(
    'SELECT id, series_id as seriesId, title, path, season, episode, duration FROM episodes WHERE series_id = ? AND (season > ? OR (season = ? AND episode > ?)) ORDER BY season ASC, episode ASC LIMIT 1'
  ).get(req.params.id, season, season, episode)
  res.json(next || null)
})

export default router
