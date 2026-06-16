# TulennTv — API / IPC

## Electron (IPC — Main ↔ Renderer)

### Scanner
```
ipc: scan-directory(path) → Series[]
ipc: scan-all() → Series[]
ipc: add-manual(path) → Series
```

### Library
```
ipc: get-library(type?, search?) → Series[]
ipc: get-series(id) → Series + Episode[]
ipc: get-episode(id) → Episode
```

### Playback
```
ipc: play-episode(episodeId) → void
ipc: get-current-position() → number
ipc: set-position(seconds) → void
```

### Progress
```
ipc: save-progress(profileId, episodeId, position) → void
ipc: get-progress(profileId, episodeId) → WatchProgress
```

### Favorites
```
ipc: toggle-favorite(profileId, seriesId) → boolean
ipc: get-favorites(profileId) → Series[]
```

### Profiles
```
ipc: get-profiles() → Profile[]
ipc: create-profile(name, avatar) → Profile
ipc: delete-profile(id) → void
```

## Web TV (HTTP REST — servidor embebido en Electron)

El servidor HTTP se inicia junto con Electron en un puerto local (ej: 3456).

Endpoints (misma lógica que IPC, expuesta vía HTTP):

```
GET  /api/library        → Series[]
GET  /api/library/:id    → Series + episodes
POST /api/progress       → { profileId, episodeId, position }
...
```

La WebApp en la TV consume estos endpoints.
