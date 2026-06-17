import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { getDb } from './database'
import { parseEpisodeInfo, detectType } from './parser'

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv', '.flv'
])

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const POSTER_NAMES = new Set(['poster', 'folder', 'cover', 'portada', 'caratula', 'thumb', 'thumbnail'])

function isVideoFile(file: string): boolean {
  const ext = path.extname(file).toLowerCase()
  return VIDEO_EXTENSIONS.has(ext)
}

function isImageFile(file: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())
}

function findPoster(dirPath: string, seriesTitle: string): string {
  try {
    const items = fs.readdirSync(dirPath)
    const match = items.find(f => {
      if (!isImageFile(f)) return false
      const name = path.parse(f).name.toLowerCase()
      return POSTER_NAMES.has(name) || name === seriesTitle.toLowerCase()
    })
    return match ? path.join(dirPath, match) : ''
  } catch {
    return ''
  }
}

export function scanDirectory(dirPath: string, forceType?: string): { series: any[]; episodes: any[] } {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`)
  }

  const stat = fs.statSync(dirPath)
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${dirPath}`)
  }

  const items = fs.readdirSync(dirPath)
  const videoFiles = items.filter(isVideoFile).sort()

  if (videoFiles.length === 0) {
    const subdirs = items.filter(item => {
      try { return fs.statSync(path.join(dirPath, item)).isDirectory() }
      catch { return false }
    })

    const allSeries: any[] = []
    const allEpisodes: any[] = []

    for (const subdir of subdirs) {
      const subPath = path.join(dirPath, subdir)
      const result = scanDirectory(subPath, forceType)
      allSeries.push(...result.series)
      allEpisodes.push(...result.episodes)
    }

    return { series: allSeries, episodes: allEpisodes }
  }

  const dirName = path.basename(dirPath)
  const seriesId = uuid()
  const episodes: any[] = []
  const poster = findPoster(dirPath, dirName)

  const parsed = videoFiles.map((file) => {
    const filePath = path.join(dirPath, file)
    const info = parseEpisodeInfo(file)
    let stats: fs.Stats | null = null
    try { stats = fs.statSync(filePath) } catch {}
    return { ...info, file, filePath, duration: stats?.size ? Math.round(stats.size / 100000) : 0 }
  })

  const allSameEpisode = parsed.every(p => p.episode === parsed[0].episode)
  const allSameSeason = parsed.every(p => p.season === parsed[0].season)
  const hasDuplicates = new Set(parsed.map(p => `${p.season}-${p.episode}`)).size < parsed.length

  if ((allSameEpisode && allSameSeason && parsed.length > 1) || hasDuplicates) {
    for (let i = 0; i < parsed.length; i++) {
      parsed[i].season = 1
      parsed[i].episode = i + 1
    }
  }

  for (const p of parsed) {
    episodes.push({
      id: uuid(),
      seriesId,
      title: p.title,
      cleanTitle: p.cleanTitle,
      path: p.filePath,
      season: p.season,
      episode: p.episode,
      duration: p.duration,
    })
  }

  const series = {
    id: seriesId,
    title: dirName,
    type: detectType(dirName, forceType),
    path: dirPath,
    poster,
    addedAt: new Date().toISOString(),
  }

  return { series: [series], episodes }
}

export function scanAndImport(dirPath: string, type?: string): any[] {
  const result = scanDirectory(dirPath, type)
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

  const ids = result.series.map((s: any) => s.id)
  return ids.map((id: string) => {
    const s = db.prepare('SELECT id, title, type, path, poster, added_at as addedAt FROM series WHERE id = ?').get(id) as any
    if (!s) return null
    const episodes = db.prepare('SELECT id, series_id as seriesId, title, path, season, episode, duration FROM episodes WHERE series_id = ? ORDER BY season ASC, episode ASC').all(id)
    return { ...s, episodes, favorite: false }
  }).filter(Boolean)
}
