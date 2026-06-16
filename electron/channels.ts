import { v4 as uuid } from 'uuid'
import { getDb } from './database'
import { Series } from '../src/shared/types'

export interface Channel {
  id: string
  name: string
  icon: string
  type: 'auto' | 'custom'
  sortOrder: number
  seriesIds: string[]
}

export function getAllChannels(): Channel[] {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, icon, type, sort_order as sortOrder FROM channels ORDER BY sort_order ASC').all() as Channel[]

  const getSeries = db.prepare('SELECT series_id FROM channel_series WHERE channel_id = ? ORDER BY sort_order ASC')
  for (const ch of rows) {
    const ids = getSeries.all(ch.id) as { series_id: string }[]
    ch.seriesIds = ids.map(r => r.series_id)
  }
  return rows
}

export function getOrCreateAutoChannels(): Channel[] {
  const db = getDb()
  const existing = getAllChannels()

  const types = ['anime', 'series', 'movie'] as const
  const typeLabels: Record<string, string> = { anime: 'Anime', series: 'Series', movie: 'Películas' }
  const typeIcons: Record<string, string> = { anime: '🎬', series: '📺', movie: '🎥' }

  for (const t of types) {
    const hasAuto = existing.find(c => c.type === 'auto' && c.name === typeLabels[t])
    if (!hasAuto) {
      const id = uuid()
      db.prepare('INSERT INTO channels (id, name, icon, type) VALUES (?, ?, ?, ?)').run(id, typeLabels[t], typeIcons[t], 'auto')
    }
  }

  return getAllChannels()
}

export function syncAutoChannels(): void {
  const db = getDb()
  const channels = getAllChannels().filter(c => c.type === 'auto')
  const allSeries = db.prepare('SELECT id, type FROM series').all() as { id: string; type: string }[]

  for (const ch of channels) {
    const typeMap: Record<string, string> = { Anime: 'anime', Series: 'series', 'Películas': 'movie' }
    const seriesType = typeMap[ch.name]
    if (!seriesType) continue

    const matchingIds = allSeries.filter(s => s.type === seriesType).map(s => s.id)
    const currentIds = ch.seriesIds

    const toAdd = matchingIds.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !matchingIds.includes(id))

    const insert = db.prepare('INSERT OR IGNORE INTO channel_series (channel_id, series_id, sort_order) VALUES (?, ?, ?)')
    for (let i = 0; i < toAdd.length; i++) {
      insert.run(ch.id, toAdd[i], currentIds.length + i)
    }
    if (toRemove.length > 0) {
      db.prepare(`DELETE FROM channel_series WHERE channel_id = ? AND series_id IN (${toRemove.map(() => '?').join(',')})`).run(ch.id, ...toRemove)
    }
  }
}

export function createChannel(name: string, icon: string, seriesIds: string[]): Channel {
  const db = getDb()
  const id = uuid()
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM channels').get() as { next: number }

  db.prepare('INSERT INTO channels (id, name, icon, type, sort_order) VALUES (?, ?, ?, ?, ?)').run(id, name, icon, 'custom', maxOrder.next)
  const insert = db.prepare('INSERT INTO channel_series (channel_id, series_id, sort_order) VALUES (?, ?, ?)')
  for (let i = 0; i < seriesIds.length; i++) {
    insert.run(id, seriesIds[i], i)
  }

  return { id, name, icon, type: 'custom', sortOrder: maxOrder.next, seriesIds }
}

export function updateChannel(id: string, name: string, icon: string, seriesIds: string[]): void {
  const db = getDb()
  db.prepare('UPDATE channels SET name = ?, icon = ? WHERE id = ?').run(name, icon, id)
  db.prepare('DELETE FROM channel_series WHERE channel_id = ?').run(id)
  const insert = db.prepare('INSERT INTO channel_series (channel_id, series_id, sort_order) VALUES (?, ?, ?)')
  for (let i = 0; i < seriesIds.length; i++) {
    insert.run(id, seriesIds[i], i)
  }
}

export function deleteChannel(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM channels WHERE id = ? AND type = ?').run(id, 'custom')
}

export function reorderChannels(ids: string[]): void {
  const db = getDb()
  for (let i = 0; i < ids.length; i++) {
    db.prepare('UPDATE channels SET sort_order = ? WHERE id = ?').run(i, ids[i])
  }
}
