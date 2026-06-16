import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import Database from 'better-sqlite3'
import { Series, Episode, ScannerResult } from '../src/shared/types'

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv', '.flv'
])

function isVideoFile(file: string): boolean {
  const ext = path.extname(file).toLowerCase()
  return VIDEO_EXTENSIONS.has(ext)
}

function parseEpisodeInfo(filename: string): { season: number; episode: number; title: string } {
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

export function scanDirectory(dirPath: string, forceType?: string): ScannerResult {
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

    const allSeries: Series[] = []
    const allEpisodes: Episode[] = []

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
  const episodes: Episode[] = []

  for (const file of videoFiles) {
    const filePath = path.join(dirPath, file)
    const { season, episode, title } = parseEpisodeInfo(file)
    let stats: fs.Stats | null = null
    try { stats = fs.statSync(filePath) } catch {}
    const duration = stats?.size ? Math.round(stats.size / 100000) : 0

    episodes.push({
      id: uuid(),
      seriesId,
      title,
      path: filePath,
      season,
      episode,
      duration,
    })
  }

  function detectType(): 'anime' | 'series' | 'movie' {
    if (forceType) return forceType as 'anime' | 'series' | 'movie'
    const lower = dirName.toLowerCase()
    if (lower.includes('anime') || /[\u3040-\u30ff\u4e00-\u9fff]/.test(dirName)) return 'anime'
    return 'series'
  }

  const series: Series = {
    id: seriesId,
    title: dirName,
    type: detectType(),
    path: dirPath,
    poster: '',
    addedAt: new Date().toISOString(),
  }

  return { series: [series], episodes }
}
