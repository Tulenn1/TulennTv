import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { getDb } from './database'

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv', '.flv'
])

function isVideoFile(file: string): boolean {
  const ext = path.extname(file).toLowerCase()
  return VIDEO_EXTENSIONS.has(ext)
}

export function parseEpisodeInfo(filename: string): { season: number; episode: number; title: string } {
  const name = path.parse(filename).name
  const patterns = [
    /S(\d+)[Ee](\d+)/,
    /s(\d+)e(\d+)/,
    /(\d+)x(\d+)/,
    /[Ee]p[\.\s]?(\d+)/i,
    /Episodio[\.\s]?(\d+)/i,
    /Cap[ií]tulo[\.\s]?(\d+)/i,
    /- (\d+)/,
    /\[(\d+)\]/,
  ]

  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      const groups = match.slice(1)
      if (groups.length === 2) {
        return {
          season: parseInt(groups[0], 10),
          episode: parseInt(groups[1], 10),
          title: name
        }
      }
      return {
        season: 1,
        episode: parseInt(groups[0], 10),
        title: name
      }
    }
  }
  return { season: 1, episode: 1, title: name }
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
      path: p.filePath,
      season: p.season,
      episode: p.episode,
      duration: p.duration,
    })
  }

  function detectType(): 'anime' | 'series' | 'movie' {
    if (forceType) return forceType as 'anime' | 'series' | 'movie'
    const lower = dirName.toLowerCase()
    if (lower.includes('anime') || /[\u3040-\u30ff\u4e00-\u9fff]/.test(dirName)) return 'anime'
    return 'series'
  }

  const series = {
    id: seriesId,
    title: dirName,
    type: detectType(),
    path: dirPath,
    poster: '',
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
