import { getDb } from './database'

export function ensureAutoChannels(): void {
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

  syncAutoChannels()
}

export function syncAutoChannels(): void {
  const db = getDb()
  const channels = db.prepare('SELECT id, name FROM channels WHERE type = ?').all('auto') as any[]
  const allSeries = db.prepare('SELECT id, type FROM series').all() as { id: string; type: string }[]

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
}
