export interface ParsedEpisode {
  season: number
  episode: number
  title: string
  cleanTitle: string
  version?: number
  isDoubleEpisode?: boolean
}

export function parseEpisodeInfo(filename: string): ParsedEpisode {
  const name = filename.replace(/\.[^.]+$/, '')
  let cleanName = name

  const groupMatch = name.match(/^\[([^\]]+)\]\s*(.+)/)
  if (groupMatch) {
    cleanName = groupMatch[2].trim()
  }

  cleanName = cleanName.replace(/\[(?:1080p|720p|480p|2160p|BD|BluRay|WEB|WEBRip|HDRip|Dual|Sub|Dub|ESP|LAT|HEVC|x264|x265|10bits?)\]|\((?:1080p|720p|480p|2160p|BD|BluRay|WEB|WEBRip|HDRip|Dual|Sub|Dub|ESP|LAT|HEVC|x264|x265)\)/gi, '').trim()

  const versionMatch = name.match(/v(\d+)/i)
  const version = versionMatch ? parseInt(versionMatch[1], 10) : undefined

  const doubleMatch = name.match(/(\d+)\s*[-–]\s*(\d+)/)
  const isDoubleEpisode = !!doubleMatch

  const episodePatterns: { regex: RegExp; extract: (m: RegExpMatchArray) => { season: number; episode: number } }[] = [
    {
      regex: /S(\d+)[Ee](\d+)/,
      extract: (m) => ({ season: parseInt(m[1], 10), episode: parseInt(m[2], 10) }),
    },
    {
      regex: /[Ss](\d+)[Ee](\d+)/,
      extract: (m) => ({ season: parseInt(m[1], 10), episode: parseInt(m[2], 10) }),
    },
    {
      regex: /(\d+)x(\d+)/,
      extract: (m) => ({ season: parseInt(m[1], 10), episode: parseInt(m[2], 10) }),
    },
    {
      regex: /[Ee]p[\.\s]?(\d+)/,
      extract: (m) => ({ season: 1, episode: parseInt(m[1], 10) }),
    },
    {
      regex: /Episodio[\.\s]?(\d+)/i,
      extract: (m) => ({ season: 1, episode: parseInt(m[1], 10) }),
    },
    {
      regex: /Cap[ií]tulo[\.\s]?(\d+)/i,
      extract: (m) => ({ season: 1, episode: parseInt(m[1], 10) }),
    },
    {
      regex: /[-–]\s*(\d+)(?:\s|$)/,
      extract: (m) => ({ season: 1, episode: parseInt(m[1], 10) }),
    },
    {
      regex: /\[(\d+)\]/,
      extract: (m) => ({ season: 1, episode: parseInt(m[1], 10) }),
    },
    {
      regex: /(\d+)\s*(?:de|of)\s*\d+/i,
      extract: (m) => ({ season: 1, episode: parseInt(m[1], 10) }),
    },
  ]

  for (const { regex, extract } of episodePatterns) {
    const match = name.match(regex)
    if (match) {
      const { season, episode } = extract(match)
      return {
        season,
        episode,
        title: name,
        cleanTitle: cleanName,
        version,
        isDoubleEpisode,
      }
    }
  }

  const numberedFallback = name.match(/(?:^|\s)(\d{2,3})(?:\s|$)/)
  if (numberedFallback) {
    return {
      season: 1,
      episode: parseInt(numberedFallback[1], 10),
      title: name,
      cleanTitle: cleanName,
      version,
      isDoubleEpisode,
    }
  }

  return {
    season: 1,
    episode: 1,
    title: name,
    cleanTitle: cleanName,
    version,
    isDoubleEpisode,
  }
}

export function detectType(dirName: string, forceType?: string): 'anime' | 'series' | 'movie' {
  if (forceType) return forceType as 'anime' | 'series' | 'movie'
  const lower = dirName.toLowerCase()
  if (lower.includes('anime') || /[\u3040-\u30ff\u4e00-\u9fff]/.test(dirName)) return 'anime'
  const series = ['shingeki', 'attack on titan', 'one piece', 'naruto', 'dragon ball', 'kimetsu', 'jujutsu', 'demon slayer']
  if (series.some(s => lower.includes(s))) return 'anime'
  return 'series'
}
