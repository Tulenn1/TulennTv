import { v4 as uuid } from 'uuid'
import { getDb } from './database'
import { WatchProgress } from '../src/shared/types'

export function saveProgress(profileId: string, episodeId: string, position: number, completed?: boolean): void {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM watch_progress WHERE profile_id = ? AND episode_id = ?').get(profileId, episodeId) as { id: string } | undefined
  if (existing) {
    db.prepare('UPDATE watch_progress SET position = ?, completed = ?, watched_at = datetime(\'now\') WHERE id = ?')
      .run(position, completed ? 1 : 0, existing.id)
  } else {
    db.prepare('INSERT INTO watch_progress (id, profile_id, episode_id, position, completed) VALUES (?, ?, ?, ?, ?)')
      .run(uuid(), profileId, episodeId, position, completed ? 1 : 0)
  }
}

export function getProgress(profileId: string, episodeId: string): WatchProgress | null {
  const db = getDb()
  const row = db.prepare(
    'SELECT id, profile_id as profileId, episode_id as episodeId, position, completed, watched_at as watchedAt FROM watch_progress WHERE profile_id = ? AND episode_id = ?'
  ).get(profileId, episodeId) as WatchProgress | undefined
  return row || null
}
