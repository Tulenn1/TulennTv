import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT DISTINCT path FROM series').all() as { path: string }[]
  const grouped = new Map<string, number>()
  for (const { path } of rows) {
    const dir = path.substring(0, path.lastIndexOf('/')) || path
    grouped.set(dir, (grouped.get(dir) || 0) + 1)
  }
  const result = Array.from(grouped.entries())
    .map(([path, seriesCount]) => ({ path, seriesCount }))
    .sort((a, b) => b.seriesCount - a.seriesCount)
  res.json(result)
})

router.post('/delete', (req: Request, res: Response) => {
  const { path } = req.body
  if (!path) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'path is required' })
    return
  }
  const db = getDb()
  db.prepare("DELETE FROM episodes WHERE series_id IN (SELECT id FROM series WHERE path LIKE ?)").run(path + '%')
  const info = db.prepare("DELETE FROM series WHERE path LIKE ?").run(path + '%')
  res.json({ deleted: info.changes })
})

export default router
