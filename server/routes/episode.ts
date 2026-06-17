import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT id, series_id as seriesId, title, path, season, episode, duration FROM episodes WHERE id = ?').get(req.params.id)
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Episode not found' })
    return
  }
  res.json(row)
})

export default router
