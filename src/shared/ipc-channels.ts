export const IPC = {
  // Scanner
  SCAN_DIRECTORY: 'scanner:scan-directory',
  SCAN_ALL: 'scanner:scan-all',
  ADD_MANUAL: 'scanner:add-manual',

  // Library
  GET_LIBRARY: 'library:get-all',
  GET_SERIES: 'library:get-series',
  GET_EPISODE: 'library:get-episode',
  GET_NEXT_EPISODE: 'library:get-next-episode',

  // Player
  PLAY_EPISODE: 'player:play',
  GET_CURRENT_POSITION: 'player:get-position',
  SET_POSITION: 'player:set-position',

  // Progress
  SAVE_PROGRESS: 'progress:save',
  GET_PROGRESS: 'progress:get',

  // Favorites
  TOGGLE_FAVORITE: 'favorites:toggle',
  GET_FAVORITES: 'favorites:get-all',

  // Profiles
  GET_PROFILES: 'profiles:get-all',
  CREATE_PROFILE: 'profiles:create',
  DELETE_PROFILE: 'profiles:delete',
  GET_ACTIVE_PROFILE: 'profiles:get-active',
  SET_ACTIVE_PROFILE: 'profiles:set-active',

  // Folders
  GET_FOLDERS: 'folders:get-all',
  DELETE_FOLDER: 'folders:delete',

  // Channels
  GET_CHANNELS: 'channels:get-all',
  CREATE_CHANNEL: 'channels:create',
  UPDATE_CHANNEL: 'channels:update',
  DELETE_CHANNEL: 'channels:delete',
  REORDER_CHANNELS: 'channels:reorder',
} as const
