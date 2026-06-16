export interface Profile {
  id: string
  name: string
  avatar: string
  createdAt: string
}

export interface Series {
  id: string
  title: string
  type: 'anime' | 'series' | 'movie'
  path: string
  poster: string
  addedAt: string
}

export interface Episode {
  id: string
  seriesId: string
  title: string
  path: string
  season: number
  episode: number
  duration: number
}

export interface WatchProgress {
  id: string
  profileId: string
  episodeId: string
  position: number
  completed: boolean
  watchedAt: string
}

export interface SeriesWithEpisodes extends Series {
  episodes: Episode[]
  favorite: boolean
  progress?: WatchProgress
}

export interface ScannerResult {
  series: Series[]
  episodes: Episode[]
}

export interface CreateProfileInput {
  name: string
  avatar: string
}

export interface Channel {
  id: string
  name: string
  icon: string
  type: 'auto' | 'custom'
  sortOrder: number
  seriesIds: string[]
}
