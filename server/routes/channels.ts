import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, icon, type, sort_order as sortOrder FROM channels ORDER BY sort_order ASC').all() as any[]

  const getSeries = db.prepare('SELECT series_id FROM channel_series WHERE channel_id = ? ORDER BY sort_order ASC')
  for (const ch of rows) {
    const ids = getSeries.all(ch.id) as { series_id: string }[]
    ch.seriesIds = ids.map(r => r.series_id)
  }
  res.json(rows)
})

router.post('/', (req: Request, res: Response) => {
  const { name, icon, seriesIds } = req.body
  if (!name) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'Name is required' })
    return
  }
  const db = getDb()
  const { v4: uuid } = require('uuid')
  const id = uuid()
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM channels').get() as { next: number }

  db.prepare('INSERT INTO channels (id, name, icon, type, sort_order) VALUES (?, ?, ?, ?, ?)').run(id, name, icon || '📺', 'custom', maxOrder.next)
  const insert = db.prepare('INSERT INTO channel_series (channel_id, series_id, sort_order) VALUES (?, ?, ?)')
  for (let i = 0; i < (seriesIds || []).length; i++) {
    insert.run(id, seriesIds[i], i)
  }

  res.status(201).json({ id, name, icon: icon || '📺', type: 'custom', sortOrder: maxOrder.next, seriesIds: seriesIds || [] })
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

router.post('/reorder', (req: Request, res: Response) => {
  const { ids } = req.body
  if (!ids || !Array.isArray(ids)) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'ids array is required' })
    return
  }
  const db = getDb()
  for (let i = 0; i < ids.length; i++) {
    db.prepare('UPDATE channels SET sort_order = ? WHERE id = ?').run(i, ids[i])
  }
  res.json({ success: true })
})

router.post('/ensure-auto', (_req: Request, res: Response) => {
  const db = getDb()
  const existing = db.prepare('SELECT id, name FROM channels WHERE type = ?').all('auto') as any[]

  const types = ['anime', 'series', 'movie'] as const
  const typeLabels: Record<string, string> = { anime: 'Anime', series: 'Series', movie: 'Películas' }
  const typeIcons: Record<string, string> = { anime: '🎬', series: '📺', movie: '🎥' }

  for (const t of types) {
    const hasAuto = existing.find((c: any) => c.name === typeLabels[t])
    if (!hasAuto) {
      const { v4: uuid } = require('uuid')
      const id = uuid()
      db.prepare('INSERT INTO channels (id, name, icon, type) VALUES (?, ?, ?, ?)').run(id, typeLabels[t], typeIcons[t], 'auto')
    }
  }

  const allSeries = db.prepare('SELECT id, type FROM series').all() as { id: string; type: string }[]
  const channels = db.prepare('SELECT id, name FROM channels WHERE type = ?').all('auto') as any[]
  const typeMap: Record<string, string> = { Anime: 'anime', Series: 'series', 'Películas': 'movie' }

  for (const ch of channels) {
    const seriesType = typeMap[ch.name]
    if (!seriesType) continue

    const matchingIds = allSeries.filter(s => s.type === seriesType).map(s => s.id)
    const currentRows = db.prepare('SELECT series_id FROM channel_series WHERE channel_id = ?').all(ch.id) as { series_id: string }[]
    const currentIds = currentRows.map(r => r.series_id)

    const toAdd = matchingIds.filter((id: string) => !currentIds.includes(id))
    const toRemove = currentIds.filter((id: string) => !matchingIds.includes(id))

    const insert = db.prepare('INSERT OR IGNORE INTO channel_series (channel_id, series_id, sort_order) VALUES (?, ?, ?)')
    for (let i = 0; i < toAdd.length; i++) {
      insert.run(ch.id, toAdd[i], currentIds.length + i)
    }
    if (toRemove.length > 0) {
      db.prepare(`DELETE FROM channel_series WHERE channel_id = ? AND series_id IN (${toRemove.map(() => '?').join(',')})`).run(ch.id, ...toRemove)
    }
  }

  res.json({ success: true })
})

export default router
