import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/:profileId/:episodeId', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare(
    'SELECT id, profile_id as profileId, episode_id as episodeId, position, completed, watched_at as watchedAt FROM watch_progress WHERE profile_id = ? AND episode_id = ?'
  ).get(req.params.profileId, req.params.episodeId)
  res.json(row || null)
})

router.post('/', (req: Request, res: Response) => {
  const { profileId, episodeId, position, completed } = req.body
  if (!profileId || !episodeId) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'profileId and episodeId are required' })
    return
  }
  const db = getDb()
  const existing = db.prepare('SELECT id FROM watch_progress WHERE profile_id = ? AND episode_id = ?').get(profileId, episodeId) as { id: string } | undefined
  if (existing) {
    db.prepare("UPDATE watch_progress SET position = ?, completed = ?, watched_at = datetime('now') WHERE id = ?")
      .run(position || 0, completed ? 1 : 0, existing.id)
  } else {
    const { v4: uuid } = require('uuid')
    db.prepare('INSERT INTO watch_progress (id, profile_id, episode_id, position, completed) VALUES (?, ?, ?, ?, ?)')
      .run(uuid(), profileId, episodeId, position || 0, completed ? 1 : 0)
  }
  res.json({ success: true })
})

export default router
