import { IPC } from '../shared/ipc-channels'
import { Profile, Series, SeriesWithEpisodes, Episode, WatchProgress, CreateProfileInput } from '../shared/types'

const isElectron = !!window.electronAPI

async function ipcInvoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (isElectron) {
    return window.electronAPI!.invoke(channel, ...args) as Promise<T>
  }
  throw new Error('IPC not available in browser mode')
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export function selectFolderWeb(): Promise<string | null> {
  const path = window.prompt('Ingresá la ruta de la carpeta a escanear (ej: /mnt/c/Users/Benja/Downloads):')
  return Promise.resolve(path || null)
}

export const api = {
  async selectFolder(): Promise<string | null> {
    if (isElectron) return ipcInvoke('dialog:select-folder')
    return selectFolderWeb()
  },
  // Profiles
  async getProfiles(): Promise<Profile[]> {
    if (isElectron) return ipcInvoke(IPC.GET_PROFILES)
    return fetchApi('/api/profiles')
  },

  async createProfile(input: CreateProfileInput): Promise<Profile> {
    if (isElectron) return ipcInvoke(IPC.CREATE_PROFILE, input)
    return fetchApi('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },

  async deleteProfile(id: string): Promise<void> {
    if (isElectron) return ipcInvoke(IPC.DELETE_PROFILE, id)
    return fetchApi(`/api/profiles/${id}`, { method: 'DELETE' })
  },

  async getActiveProfile(): Promise<Profile | null> {
    if (isElectron) return ipcInvoke(IPC.GET_ACTIVE_PROFILE)
    return fetchApi('/api/session/active-profile')
  },

  async setActiveProfile(profileId: string): Promise<void> {
    if (isElectron) return ipcInvoke(IPC.SET_ACTIVE_PROFILE, profileId)
    await fetchApi('/api/session/active-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
    })
  },

  // Library
  async getLibrary(type?: string, search?: string, profileId?: string): Promise<Series[]> {
    if (isElectron) return ipcInvoke(IPC.GET_LIBRARY, type, search, profileId)
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (search) params.set('search', search)
    if (profileId) params.set('profileId', profileId)
    return fetchApi(`/api/library?${params}`)
  },

  async getSeries(seriesId: string, profileId?: string): Promise<SeriesWithEpisodes | null> {
    if (isElectron) return ipcInvoke(IPC.GET_SERIES, seriesId, profileId)
    const params = profileId ? `?profileId=${profileId}` : ''
    return fetchApi(`/api/library/${seriesId}${params}`)
  },

  async getEpisode(episodeId: string): Promise<Episode | null> {
    if (isElectron) return ipcInvoke(IPC.GET_EPISODE, episodeId)
    return fetchApi(`/api/episode/${episodeId}`)
  },

  async getNextEpisode(seriesId: string, season: number, episode: number): Promise<Episode | null> {
    if (isElectron) return ipcInvoke(IPC.GET_NEXT_EPISODE, seriesId, season, episode)
    return fetchApi(`/api/library/${seriesId}/next?season=${season}&episode=${episode}`)
  },

  // Scanner
  async scanDirectory(dirPath: string): Promise<SeriesWithEpisodes[]> {
    if (isElectron) return ipcInvoke(IPC.SCAN_DIRECTORY, dirPath)
    return fetchApi('/api/scanner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath }),
    })
  },

  // Favorites
  async toggleFavorite(profileId: string, seriesId: string): Promise<boolean> {
    if (isElectron) return ipcInvoke(IPC.TOGGLE_FAVORITE, profileId, seriesId)
    const res = await fetchApi<{ isFavorite: boolean }>(`/api/favorites/${profileId}/${seriesId}`, { method: 'POST' })
    return res.isFavorite
  },

  async getFavorites(profileId: string): Promise<string[]> {
    if (isElectron) return ipcInvoke(IPC.GET_FAVORITES, profileId)
    return fetchApi(`/api/favorites/${profileId}`)
  },

  // Progress
  async saveProgress(profileId: string, episodeId: string, position: number, completed?: boolean): Promise<void> {
    if (isElectron) return ipcInvoke(IPC.SAVE_PROGRESS, profileId, episodeId, position, completed)
    await fetchApi('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, episodeId, position, completed }),
    })
  },

  async getProgress(profileId: string, episodeId: string): Promise<WatchProgress | null> {
    if (isElectron) return ipcInvoke(IPC.GET_PROGRESS, profileId, episodeId)
    return fetchApi(`/api/progress/${profileId}/${episodeId}`)
  },
}
