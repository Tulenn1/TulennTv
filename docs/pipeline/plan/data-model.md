# TulennTv — Modelo de Datos

## Entidades

### Profile
```
id: string (UUID)
name: string
avatar: string (emoji/inicial)
createdAt: datetime
```

### Series
```
id: string (UUID)
title: string
type: 'anime' | 'series' | 'movie'
path: string (ruta absoluta a la carpeta)
poster: string (ruta a la imagen)
favorite: boolean (por perfil)
addedAt: datetime
```

### Episode
```
id: string (UUID)
seriesId: string (FK → Series)
title: string
path: string (ruta al archivo)
season: number
episode: number
duration: number (segundos)
```

### WatchProgress
```
id: string (UUID)
profileId: string (FK → Profile)
episodeId: string (FK → Episode)
position: number (segundos, último punto)
completed: boolean
watchedAt: datetime
```

### Favorite
```
profileId: string (FK → Profile)
seriesId: string (FK → Series)
```

## Persistencia
- **Electron**: SQLite vía `better-sqlite3`
- **Web TV**: IndexedDB (compatible con la misma estructura)
- Sincronización: no aplica (100% local cada plataforma)
