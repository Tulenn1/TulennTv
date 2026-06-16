import { ipcMain } from 'electron'
import { IPC } from '../src/shared/ipc-channels'
import { getAllSeries, getSeriesWithEpisodes, getEpisode, getNextEpisode, scanAndImport } from './library'
import { getProfiles, createProfile, deleteProfile, getActiveProfile, setActiveProfile } from './profiles'
import { toggleFavorite, getFavorites } from './favorites'
import { saveProgress, getProgress } from './progress'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.GET_LIBRARY, (_event, type?: string, search?: string, profileId?: string) => {
    const series = getAllSeries(type, search)
    if (profileId) {
      const favIds = getFavorites(profileId)
      return series.map(s => ({ ...s, favorite: favIds.includes(s.id) }))
    }
    return series
  })

  ipcMain.handle(IPC.GET_SERIES, (_event, seriesId: string, profileId?: string) => {
    return getSeriesWithEpisodes(seriesId, profileId)
  })

  ipcMain.handle(IPC.GET_EPISODE, (_event, episodeId: string) => {
    return getEpisode(episodeId)
  })

  ipcMain.handle(IPC.GET_NEXT_EPISODE, (_event, seriesId: string, season: number, episode: number) => {
    return getNextEpisode(seriesId, season, episode)
  })

  ipcMain.handle(IPC.SCAN_DIRECTORY, (_event, dirPath: string) => {
    return scanAndImport(dirPath)
  })

  ipcMain.handle(IPC.GET_PROFILES, () => {
    return getProfiles()
  })

  ipcMain.handle(IPC.CREATE_PROFILE, (_event, input: { name: string; avatar: string }) => {
    return createProfile(input)
  })

  ipcMain.handle(IPC.DELETE_PROFILE, (_event, id: string) => {
    deleteProfile(id)
  })

  ipcMain.handle(IPC.GET_ACTIVE_PROFILE, () => {
    return getActiveProfile()
  })

  ipcMain.handle(IPC.SET_ACTIVE_PROFILE, (_event, profileId: string) => {
    setActiveProfile(profileId)
  })

  ipcMain.handle(IPC.TOGGLE_FAVORITE, (_event, profileId: string, seriesId: string) => {
    return toggleFavorite(profileId, seriesId)
  })

  ipcMain.handle(IPC.GET_FAVORITES, (_event, profileId: string) => {
    return getFavorites(profileId)
  })

  ipcMain.handle(IPC.SAVE_PROGRESS, (_event, profileId: string, episodeId: string, position: number, completed?: boolean) => {
    saveProgress(profileId, episodeId, position, completed)
  })

  ipcMain.handle(IPC.GET_PROGRESS, (_event, profileId: string, episodeId: string) => {
    return getProgress(profileId, episodeId)
  })
}
