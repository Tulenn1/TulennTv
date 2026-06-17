import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../database'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, avatar, created_at as createdAt FROM profiles ORDER BY created_at ASC').all()
  res.json(rows)
})

router.post('/', (req: Request, res: Response) => {
  const { name, avatar } = req.body
  if (!name) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'Name is required' })
    return
  }
  const db = getDb()
  const id = uuid()
  db.prepare('INSERT INTO profiles (id, name, avatar) VALUES (?, ?, ?)').run(id, name, avatar || '')
  res.status(201).json({ id, name, avatar: avatar || '', createdAt: new Date().toISOString() })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

router.get('/active', (_req: Request, res: Response) => {
  const db = getDb()
  const row = db.prepare('SELECT value FROM app_session WHERE key = ?').get('active_profile_id') as { value: string } | undefined
  if (!row) {
    res.json(null)
    return
  }
  const profile = db.prepare('SELECT id, name, avatar, created_at as createdAt FROM profiles WHERE id = ?').get(row.value)
  res.json(profile || null)
})

router.post('/active', (req: Request, res: Response) => {
  const { profileId } = req.body
  if (!profileId) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'profileId is required' })
    return
  }
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO app_session (key, value) VALUES (?, ?)').run('active_profile_id', profileId)
  res.json({ success: true })
})

export default router
