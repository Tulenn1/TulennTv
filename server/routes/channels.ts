import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../database'
import { syncAutoChannels } from '../channels'
import { validate, channelCreateSchema, channelReorderSchema } from '../validation'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  syncAutoChannels()
  interface ChannelRow { id: string; name: string; icon: string; type: string; sortOrder: number; seriesIds?: string[] }
  const rows = db.prepare('SELECT id, name, icon, type, sort_order as sortOrder FROM channels ORDER BY sort_order ASC').all() as ChannelRow[]

  const getSeries = db.prepare('SELECT series_id FROM channel_series WHERE channel_id = ? ORDER BY sort_order ASC')
  for (const ch of rows) {
    const ids = getSeries.all(ch.id) as { series_id: string }[]
    ch.seriesIds = ids.map(r => r.series_id)
  }
  res.json(rows)
})

router.post('/', validate(channelCreateSchema), (req: Request, res: Response) => {
  const { name, icon, seriesIds } = req.body
  const db = getDb()
  const id = uuid()
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM channels').get() as { next: number }

  db.prepare('INSERT INTO channels (id, name, icon, type, sort_order) VALUES (?, ?, ?, ?, ?)').run(id, name, icon, 'custom', maxOrder.next)
  const insert = db.prepare('INSERT INTO channel_series (channel_id, series_id, sort_order) VALUES (?, ?, ?)')
  for (let i = 0; i < seriesIds.length; i++) {
    insert.run(id, seriesIds[i], i)
  }

  res.status(201).json({ id, name, icon, type: 'custom', sortOrder: maxOrder.next, seriesIds })
})

router.put('/:id', (req: Request, res: Response) => {
  const { name, icon, seriesIds } = req.body
  const db = getDb()
  db.prepare('UPDATE channels SET name = ?, icon = ? WHERE id = ?').run(name, icon, req.params.id)
  db.prepare('DELETE FROM channel_series WHERE channel_id = ?').run(req.params.id)
  const insert = db.prepare('INSERT INTO channel_series (channel_id, series_id, sort_order) VALUES (?, ?, ?)')
  for (let i = 0; i < (seriesIds || []).length; i++) {
    insert.run(req.params.id, seriesIds[i], i)
  }
  res.json({ success: true })
})

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  db.prepare('DELETE FROM channels WHERE id = ? AND type = ?').run(req.params.id, 'custom')
  res.json({ success: true })
})

router.post('/reorder', validate(channelReorderSchema), (req: Request, res: Response) => {
  const { ids } = req.body
  const db = getDb()
  for (let i = 0; i < ids.length; i++) {
    db.prepare('UPDATE channels SET sort_order = ? WHERE id = ?').run(i, ids[i])
  }
  res.json({ success: true })
})

export default router
