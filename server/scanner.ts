import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { getDb } from './database'
import { parseEpisodeInfo, detectType } from './parser'
import { getVideoDuration } from './detector'

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv', '.flv'
])

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const POSTER_NAMES = new Set(['poster', 'folder', 'cover', 'portada', 'caratula', 'thumb', 'thumbnail'])

const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt', '.ass', '.ssa', '.sub'])

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

function findSubtitles(videoPath: string, dirFiles: string[]): string {
  const base = path.parse(videoPath).name.toLowerCase()
  const matches = dirFiles.filter(f => {
    const ext = path.extname(f).toLowerCase()
    if (!SUBTITLE_EXTENSIONS.has(ext)) return false
    return path.parse(f).name.toLowerCase() === base
  })
  return matches.length > 0
    ? JSON.stringify(matches.map(f => path.join(path.dirname(videoPath), f)))
    : ''
}

interface ScanSeries { id: string; title: string; type: string; path: string; poster: string; addedAt: string }
interface ScanEpisode { id: string; seriesId: string; title: string; cleanTitle?: string; path: string; season: number; episode: number; duration: number; subtitles: string }
interface ScanResult { series: ScanSeries[]; episodes: ScanEpisode[] }

export async function scanDirectory(dirPath: string, forceType?: string): Promise<ScanResult> {
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

    const allSeries: ScanSeries[] = []
    const allEpisodes: ScanEpisode[] = []

    for (const subdir of subdirs) {
      const subPath = path.join(dirPath, subdir)
      const result = await scanDirectory(subPath, forceType)
      allSeries.push(...result.series)
      allEpisodes.push(...result.episodes)
    }

    return { series: allSeries, episodes: allEpisodes }
  }

  const dirName = path.basename(dirPath)
  const seriesId = uuid()
  const episodes: ScanEpisode[] = []
  const poster = findPoster(dirPath, dirName)

  const parsed = await Promise.all(videoFiles.map(async (file) => {
    const filePath = path.join(dirPath, file)
    const info = parseEpisodeInfo(file)
    const duration = await getVideoDuration(filePath)
    const subtitles = findSubtitles(filePath, items)
    return { ...info, file, filePath, duration, subtitles }
  }))

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
      subtitles: p.subtitles,
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

interface SeriesImportRow { id: string; title: string; type: string; path: string; poster: string; addedAt: string }

export async function scanAndImport(dirPath: string, type?: string): Promise<SeriesImportRow[]> {
  const result = await scanDirectory(dirPath, type)
  const db = getDb()

  const insertSeries = db.prepare('INSERT OR IGNORE INTO series (id, title, type, path, poster, added_at) VALUES (?, ?, ?, ?, ?, ?)')
  const insertEpisode = db.prepare('INSERT OR IGNORE INTO episodes (id, series_id, title, path, season, episode, duration, subtitles) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')

  const transaction = db.transaction(() => {
    for (const s of result.series) {
      insertSeries.run(s.id, s.title, s.type, s.path, s.poster, s.addedAt)
    }
    for (const e of result.episodes) {
      insertEpisode.run(e.id, e.seriesId, e.title, e.path, e.season, e.episode, e.duration, e.subtitles)
    }
  })
  transaction()

  const ids = result.series.map(s => s.id)
  return ids.map((id: string) => {
    const s = db.prepare('SELECT id, title, type, path, poster, added_at as addedAt FROM series WHERE id = ?').get(id) as SeriesImportRow | undefined
    if (!s) return null
    const episodes = db.prepare('SELECT id, series_id as seriesId, title, path, season, episode, duration, subtitles FROM episodes WHERE series_id = ? ORDER BY season ASC, episode ASC').all(id)
    return { ...s, episodes, favorite: false } as SeriesImportRow & { episodes: unknown[]; favorite: boolean }
  }).filter(Boolean) as SeriesImportRow[]
}
