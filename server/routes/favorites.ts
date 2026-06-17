import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/:profileId', (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT series_id FROM favorites WHERE profile_id = ?').all(req.params.profileId) as { series_id: string }[]
  res.json(rows.map(r => r.series_id))
})

router.post('/:profileId/:seriesId', (req: Request, res: Response) => {
  const { profileId, seriesId } = req.params
  const db = getDb()
  const existing = db.prepare('SELECT 1 FROM favorites WHERE profile_id = ? AND series_id = ?').get(profileId, seriesId)
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE profile_id = ? AND series_id = ?').run(profileId, seriesId)
    res.json({ isFavorite: false })
  } else {
    db.prepare('INSERT INTO favorites (profile_id, series_id) VALUES (?, ?)').run(profileId, seriesId)
    res.json({ isFavorite: true })
  }
})

export default router
