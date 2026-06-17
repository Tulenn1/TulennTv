import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT poster FROM series WHERE id = ?').get(req.params.id) as { poster: string } | undefined
  if (!row || !row.poster) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'No poster' })
    return
  }
  res.sendFile(row.poster)
})

export default router
