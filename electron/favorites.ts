import { getDb } from './database'

export function toggleFavorite(profileId: string, seriesId: string): boolean {
  const db = getDb()
  const existing = db.prepare('SELECT 1 FROM favorites WHERE profile_id = ? AND series_id = ?').get(profileId, seriesId)
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE profile_id = ? AND series_id = ?').run(profileId, seriesId)
    return false
  }
  db.prepare('INSERT INTO favorites (profile_id, series_id) VALUES (?, ?)').run(profileId, seriesId)
  return true
}

export function getFavorites(profileId: string): string[] {
  const db = getDb()
  const rows = db.prepare('SELECT series_id FROM favorites WHERE profile_id = ?').all(profileId) as { series_id: string }[]
  return rows.map(r => r.series_id)
}
