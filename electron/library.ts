import { v4 as uuid } from 'uuid'
import { getDb } from './database'
import { Series, Episode, SeriesWithEpisodes, ScannerResult } from '../src/shared/types'
import { scanDirectory } from './scanner'

export function getAllSeries(type?: string, search?: string): Series[] {
  const db = getDb()
  let query = 'SELECT id, title, type, path, poster, added_at as addedAt FROM series'
  const params: unknown[] = []

  const conditions: string[] = []
  if (type) {
    conditions.push('type = ?')
    params.push(type)
  }
  if (search) {
    conditions.push('title LIKE ?')
    params.push(`%${search}%`)
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY title ASC'

  return db.prepare(query).all(...params) as Series[]
}

export function getSeriesWithEpisodes(seriesId: string, profileId?: string): SeriesWithEpisodes | null {
  const db = getDb()
  const series = db.prepare('SELECT id, title, type, path, poster, added_at as addedAt FROM series WHERE id = ?').get(seriesId) as Series | undefined
  if (!series) return null

  const episodes = db.prepare('SELECT id, series_id as seriesId, title, path, season, episode, duration FROM episodes WHERE series_id = ? ORDER BY season ASC, episode ASC').all(seriesId) as Episode[]

  let favorite = false
  if (profileId) {
    const fav = db.prepare('SELECT 1 FROM favorites WHERE profile_id = ? AND series_id = ?').get(profileId, seriesId)
    favorite = !!fav
  }

  let progress: WatchProgress | undefined
  if (profileId && episodes.length > 0) {
    const lastWatched = db.prepare(
      'SELECT id, profile_id as profileId, episode_id as episodeId, position, completed, watched_at as watchedAt FROM watch_progress WHERE profile_id = ? AND episode_id IN (SELECT id FROM episodes WHERE series_id = ?) ORDER BY watched_at DESC LIMIT 1'
    ).get(profileId, seriesId) as WatchProgress | undefined
    progress = lastWatched
  }

  return { ...series, episodes, favorite: !!favorite, progress }
}

export function getEpisode(episodeId: string): Episode | null {
  const db = getDb()
  const row = db.prepare('SELECT id, series_id as seriesId, title, path, season, episode, duration FROM episodes WHERE id = ?').get(episodeId) as Episode | undefined
  return row || null
}

export function getNextEpisode(seriesId: string, currentSeason: number, currentEpisode: number): Episode | null {
  const db = getDb()
  const next = db.prepare(
    'SELECT id, series_id as seriesId, title, path, season, episode, duration FROM episodes WHERE series_id = ? AND (season > ? OR (season = ? AND episode > ?)) ORDER BY season ASC, episode ASC LIMIT 1'
  ).get(seriesId, currentSeason, currentSeason, currentEpisode) as Episode | undefined
  return next || null
}

export function importScanResult(result: ScannerResult): void {
  const db = getDb()

  const insertSeries = db.prepare('INSERT OR IGNORE INTO series (id, title, type, path, poster, added_at) VALUES (?, ?, ?, ?, ?, ?)')
  const insertEpisode = db.prepare('INSERT OR IGNORE INTO episodes (id, series_id, title, path, season, episode, duration) VALUES (?, ?, ?, ?, ?, ?, ?)')

  const transaction = db.transaction(() => {
    for (const s of result.series) {
      insertSeries.run(s.id, s.title, s.type, s.path, s.poster, s.addedAt)
    }
    for (const e of result.episodes) {
      insertEpisode.run(e.id, e.seriesId, e.title, e.path, e.season, e.episode, e.duration)
    }
  })

  transaction()
}

export function scanAndImport(dirPath: string): SeriesWithEpisodes[] {
  const result = scanDirectory(dirPath)
  importScanResult(result)
  const ids = result.series.map(s => s.id)
  return ids.map(id => getSeriesWithEpisodes(id)).filter(Boolean) as SeriesWithEpisodes[]
}
