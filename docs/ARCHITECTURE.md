# Arquitectura de TulennTv

## Principios de arquitectura

- **Single Responsibility**: cada archivo tiene un propósito único. Los routers solo definen rutas HTTP; los servicios (scanner, parser, streamer) contienen lógica de negocio; database.ts solo gestiona la conexión a SQLite.
- **Inyección de dependencias por parámetro de función**: los módulos reciben `db` como argumento cuando la necesitan (ej: `createSchema(db)`). No hay clases ni IoC containers.
- **Separación de capas**: backend Express (API REST) separado del frontend React SPA. La lógica de base de datos no se mezcla con los handlers HTTP.
- **Sin abstracciones innecesarias**: no hay ORM, no hay DTOs, no hay mappers. Se usan queries SQL directas con `better-sqlite3` y tipos compartidos desde `src/shared/types.ts`.
- **Modo dual browser/Electron**: el frontend abstrae la comunicación con `window.electronAPI` (IPC) o `fetch()` según el runtime, decidido por `const isElectron = !!window.electronAPI`.

## Estructura del proyecto

```
TulennTv/
├── server/                  # Backend (Node.js + Express)
│   ├── index.ts             # Entry point, monta rutas y SPA fallback
│   ├── database.ts          # Conexión singleton a SQLite (better-sqlite3)
│   ├── schema.ts            # DDL de tablas e índices
│   ├── scanner.ts           # Escaneo recursivo de directorios + import
│   ├── parser.ts            # Parseo inteligente de nombres de archivo
│   ├── streamer.ts          # Streaming HTTP con Range headers
│   ├── channels.ts          # Canales automáticos (sync type-based)
│   ├── backup.ts            # Backup diario de la BD
│   ├── detector.ts          # Duración real via ffprobe/mediainfo
│   ├── mdns.ts              # Publicación mDNS (tulenntv.local)
│   ├── firewall.ts          # Apertura de puertos en firewall Windows
│   ├── utils/network.ts     # Detección de IP local (incluye WSL)
│   └── routes/              # 14 routers Express
│       ├── profiles.ts      # CRUD de perfiles + sesión activa
│       ├── library.ts       # Listado, detalle, update, delete de series
│       ├── progress.ts      # Progreso de reproducción por perfil
│       ├── favorites.ts     # Favoritos toggle por perfil
│       ├── channels.ts      # CRUD de canales + reorder
│       ├── folders.ts       # Agrupación de series por directorio
│       ├── scanner.ts       # POST scan + GET status (async)
│       ├── episode.ts       # GET detalle de episodio
│       ├── video.ts         # GET stream por episodeId
│       ├── poster.ts        # GET poster local o TMDB + fetch-all
│       ├── settings.ts      # Media folder, TMDB key, init folder
│       ├── browse.ts        # Explorador de directorios del servidor
│       ├── subtitles.ts     # GET archivo de subtítulos
│       └── connect.ts       # GET info de conexión + QR
├── src/                     # Frontend (React + TypeScript SPA)
│   ├── main.tsx             # Entry point: BrowserRouter → providers → App
│   ├── App.tsx              # Layout, routing, MobileNav, theme/faq toggles
│   ├── index.css            # CSS custom properties (tema dark/light)
│   ├── pages/
│   │   ├── ProfileSelector  # Selección/creación de perfil
│   │   ├── Library          # Biblioteca con búsqueda, filtros, escaneo
│   │   ├── Zapper           # Reproductor TV-like con navegación por canales
│   │   ├── Guide            # Guía de canales (vista lista y grilla)
│   │   ├── Channels         # CRUD de canales personalizados
│   │   ├── Folders          # Gestión de carpetas + TMDB settings
│   │   └── TvConnect        # QR + URLs para conectar dispositivos
│   ├── components/
│   │   ├── Player           # Wrapper de <video> con subtítulos y reanudación
│   │   ├── PlayerControls   # Barra de control (play, seek, volumen, subs)
│   │   ├── ZapperOverlay    # HUD superior e inferior del zapper
│   │   ├── SeriesCard       # Tarjeta de serie (poster, badge, type menu)
│   │   └── FaqModal         # Modal de ayuda con atajos y estructura
│   ├── context/
│   │   ├── AppContext       # Estado global: perfil activo, lista de perfiles
│   │   └── ThemeContext     # Tema dark/light con persistencia localStorage
│   ├── lib/api.ts           # Capa de comunicación (fetch o IPC según runtime)
│   └── shared/
│       ├── types.ts         # Tipos compartidos (Profile, Series, Episode, etc.)
│       └── ipc-channels.ts  # Constantes de canales IPC para Electron
├── electron/                # Electron wrapper (opcional)
│   ├── main.ts              # BrowserWindow + registro IPC + server
│   ├── preload.ts           # contextBridge expone electronAPI.invoke()
│   ├── ipc.ts               # Handlers IPC que delegan a módulos server/
│   └── ...                  # Reimplementación server-side para Electron
├── scripts/                 # Scripts de despliegue
│   ├── start-server.bat     # Inicio rápido en Windows
│   ├── install-service.ps1  # Tarea programada de inicio automático
│   ├── firewall.ps1         # Apertura de puerto 3456
│   ├── build-dist.bat       # Genera distribución portable
│   └── update.bat           # Actualización desde GitHub
├── data/                    # Base de datos SQLite y backups
│   ├── tulenntv.db
│   └── backups/
└── dist/                    # Frontend compilado (Vite build output)
```

## Backend layers

### Routes (capa HTTP)

Cada router Express se monta en `/api/<recurso>`. Siguen este patrón:

```typescript
import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.prepare('SELECT ...').all()
  res.json(rows)
})

export default router
```

- Handlers cortos (5-30 líneas).
- Validación básica inline (if sin name → 400).
- Sin middleware de validación ni serializadores.
- Sin try/catch general — Express maneja errores con su default error handler.

### Servicios (capa de negocio)

| Módulo | Responsabilidad |
|--------|----------------|
| `scanner.ts` | Escaneo recursivo de directorios, detección de videos/posters/subtítulos, import transaccional a BD |
| `parser.ts` | Parseo de nombres de archivo (S01E01, Ep 1, Capítulo 1, [Subs] Nombre - 01 [1080p], etc.) |
| `streamer.ts` | `streamVideo()` con soporte HTTP Range (206 Partial Content) para seek en video |
| `channels.ts` | Canales automáticos que sincronizan series por type (anime/series/movie) |
| `detector.ts` | Detección de duración de video via ffprobe → mediainfo → fallback por tamaño |
| `backup.ts` | Backup diario vía `db.backup()` + limpieza de backups viejos (>30 días) |
| `mdns.ts` | Publicación mDNS via `multicast-dns` para discovery en red local |
| `firewall.ts` | Apertura de puertos via netsh + portproxy WSL en Windows |
| `database.ts` | Singleton de conexión SQLite con WAL mode y foreign keys |
| `schema.ts` | DDL con 7 tablas + 6 índices, migración online para columna faltante |

### Base de datos (SQLite con better-sqlite3)

- `getDb()` retorna singleton con lazy initialization.
- WAL mode (`PRAGMA journal_mode = WAL`) para mejor concurrencia lectura/escritura.
- Foreign keys habilitadas.
- Queries preparadas reutilizadas (`.prepare().run()/.get()/.all()`).
- Transacciones explícitas en scanner (`db.transaction(() => { ... })()`).
- Tabla `app_session` para key-value (perfil activo, TMDB key, posters cacheados).

Esquema:

- `profiles` — id, name, avatar, created_at
- `series` — id, title, type (anime/series/movie), path (UNIQUE), poster, added_at
- `episodes` — id, series_id (FK CASCADE), title, path (UNIQUE), season, episode, duration, subtitles
- `watch_progress` — id, profile_id (FK), episode_id (FK), position, completed, watched_at (UNIQUE profile_id+episode_id)
- `favorites` — profile_id, series_id (PK compuesto)
- `channels` — id, name, icon, type (auto/custom), sort_order
- `channel_series` — channel_id, series_id, sort_order (PK compuesto)
- `app_session` — key (PK), value

## Frontend layers

### Pages (páginas/rutas)

Cada página es un componente que corresponde a una ruta de React Router.
Mantienen su propio estado local (useState, useCallback, useEffect).
No usan librerías de estado global más allá de los contextos.

| Página | Ruta | Props URL | Estado local clave |
|--------|------|-----------|-------------------|
| ProfileSelector | `/profiles` | — | `showCreate`, `name`, `avatar` |
| Library | `/library` | — | `series[]`, `filter`, `search`, `selectedSeries`, `episodes[]` |
| Zapper | `/zapper` | `?series=`, `?episode=` | `channels[]`, `channelData`, `currentEpisode`, `playing`, `showGuide` |
| Guide | `/guide` | — | `channels[]`, `allSeries`, `search`, `view` (list/grid) |
| Channels | `/channels` | — | `channels[]`, `allSeries[]`, `showCreate`, `editId` |
| Folders | `/folders` | — | `folders[]`, `mediaFolder`, `browseDir`, `showSettings` |
| TvConnect | `/tv-connect` | — | `info`, `qrSvg`, `error` |

### Components (componentes reutilizables)

Sin librerías externas de UI. Todos los componentes son funcionales con estilos inline.

| Componente | Props clave | Rol |
|------------|------------|-----|
| `Player` | src, subtitles, initialPosition, onTimeUpdate, onEnded | Wrapper de `<video>` con manejo de tracks de subtítulos y reanudación |
| `PlayerControls` | playing, currentTime, duration, volume, onSeek, onSubtitleChange | Barra inferior con seek bar, play/pause, volumen, subs, fullscreen |
| `ZapperOverlay` | channelName, episodeTitle, nextEpisodes, visible | HUD superior (canal) e inferior (episodio actual + próximos) |
| `SeriesCard` | series, onClick, onDelete, onChangeType | Tarjeta con poster/placeholder, badge de tipo, menú de cambio de tipo |
| `FaqModal` | open, onClose | Modal de ayuda con estructura de carpetas, atajos y preguntas frecuentes |

### Context (estado global)

- **AppContext**: perfil activo (`profile`, `profiles[]`, `loading`, `isElectron`). Se inicializa en `useEffect` llamando a `api.getProfiles()` y `api.getActiveProfile()`.
- **ThemeContext**: tema dark/light persistido en `localStorage`. Aplica clase `data-theme` en `<html>`.

### lib/api.ts (capa de comunicación)

Cada método sigue este patrón:

```typescript
async getProfiles(): Promise<Profile[]> {
  if (isElectron) return ipcInvoke(IPC.GET_PROFILES)
  return fetchApi('/api/profiles')
}
```

- `isElectron` se evalúa una vez (presencia de `window.electronAPI`).
- En modo browser: usa `fetch()` con JSON.
- En modo Electron: usa `window.electronAPI.invoke()` → `ipcRenderer.invoke()` → handler en `electron/ipc.ts`.
- `getVideoUrl(filePath)` normaliza la ruta: en Electron usa `file://`, en browser usa `/api/serve-file/<encoded-path>`.

## Flujo de datos

```
                    Browser                          Servidor
┌──────────────────────────────┐       ┌──────────────────────────────┐
│  React SPA                   │       │  Express                     │
│                              │       │                              │
│  src/pages/Library.tsx       │       │  server/routes/library.ts    │
│    ↓ api.getLibrary()        │──────→│    ↓ getDb()                 │
│    ↓ fetch('/api/library')   │  HTTP │    ↓ db.prepare('SELECT...') │
│    ↓ res.json()              │←──────│    ↓ res.json(rows)          │
│    ↓ setSeries(list)         │       │                              │
└──────────────────────────────┘       └──────────────────────────────┘
```

### Browser mode (default)

Frontend → HTTP GET/POST a `http://<ip>:3456/api/*` → Express route → SQLite → JSON response → React state update.

### Electron mode (opcional)

Frontend → `window.electronAPI.invoke(channel, args)` → IPC → Handler en `electron/ipc.ts` → módulo server → resultado → IPC response.

### Streaming de video

```
<video> element
  → src="/api/serve-file/<encoded-path>"
  → Express sirve archivo con HTTP Range headers (206 Partial Content)
  → El navegador maneja seek, buffering, reproducción
```

- Sin transcodificación ni transformación.
- El servidor envía el archivo tal cual está en disco.
- Soporte para todos los formatos que el navegador entienda (MP4, WebM).
- Para formatos no soportados por el navegador (MKV, AVI), se recomienda usar VLC + URL directa.

### Escaneo asincrónico

```
POST /api/scanner  →  { status: "scanning" }  (respuesta inmediata)
       │
       ├── scanState.status = "scanning"
       ├── scanAndImport() en background (async, no await)
       │
       └── GET /api/scanner/status  →  { status: "done"|"error", progress }
```

El frontend hace polling cada 1 segundo (máximo 60 intentos) hasta que el estado cambia a "done" o "error".

## Patrones usados

### Repository con SQLite

Cada router actúa como repository ligero: recibe `db` vía `getDb()`, ejecuta queries directamente sin ORM. No hay capa de repositorio separada — los routers combinan HTTP handler + query + serialización.

### Streaming HTTP Range

`streamer.ts` implementa el estándar HTTP Range (RFC 7233). Si el request incluye header `Range: bytes=X-Y`, responde con 206 Partial Content y el chunk solicitado. Esto permite seek en el reproductor HTML5 sin transcodificar.

### mDNS

`mdns.ts` usa `multicast-dns` para anunciar el servicio como `tulenntv._http._tcp.local` y responder a queries. Esto permite acceder al servidor como `http://tulenntv.local:3456` en redes compatibles (Apple Bonjour, Linux Avahi).

### Scanner asincrónico con estado

`scanner.ts` es el único módulo con estado mutable global (`scanState`). El estado transita por `idle → scanning → done/error`. Se usa un objeto mutable compartido (no una cola ni workers) porque solo hay un escaneo a la vez.

### Backup automático

`backup.ts` usa `db.backup()` de better-sqlite3 para hacer backup online (sin cerrar la conexión). Se ejecuta al iniciar y cada 24 horas. Backups viejos (>30 días) se eliminan automáticamente.

### Autodetección de IP (WSL-aware)

`network.ts` detecta la IP local considerando entornos WSL:
1. Lee `TULENNTV_HOST_IP` si está definida.
2. Enumeración de interfaces de red (excluye loopback).
3. Si está en WSL, ejecuta PowerShell para detectar IP WiFi de Windows.
4. Fallback a `/etc/resolv.conf` para nameserver host.
5. Fallback final a `127.0.0.1`.

### CSS custom properties para temas

El tema se maneja con variables CSS en `:root` y `[data-theme="light"]`. No usa CSS modules, styled-components ni Tailwind. Los componentes React usan objetos `styles: Record<string, React.CSSProperties>` con estilos inline.

## Convenciones de código

### Nombrado

- **camelCase** en todo: variables, funciones, archivos, columnas SQL (con underscore en snake_case para columnas SQL, mapeadas a camelCase en queries con `AS`).
- Archivos en kebab-case: `server/routes/channels.ts`.
- Componentes React en PascalCase: `SeriesCard.tsx`.
- Constantes en UPPER_SNAKE_CASE o camelCase según contexto.

### Imports

```typescript
// Módulos propios (sin extensión, sin index)
import { getDb } from '../database'
import { scanAndImport } from '../scanner'

// Librerías
import { Router, Request, Response } from 'express'
import Database from 'better-sqlite3'
```

### Manejo de errores

- En routes: validación inline con return temprano (status 400/404).
- Sin try/catch en handlers — Express captura errores automáticamente.
- En servicios: los errores se lanzan con `throw new Error()` y se capturan en el router.
- En frontend: `try/catch` con `console.error` y estado `error` para mostrar al usuario.

### Estilos en React

- Objetos `styles: Record<string, React.CSSProperties>` al final de cada componente.
- Sin CSS modules, sin Tailwind, sin styled-components.
- Variables CSS definidas en `index.css` referenciadas como `var(--bg-primary)`.
- Media queries en `index.css` con clases globales (`.sidebar`, `.main`, `.grid`).
- En componentes se usa `className` para reglas responsive, `style` para el resto.

### API de fetch

- `fetchApi<T>(url, options?)` → verifica `res.ok`, lanza error si no, parsea JSON.
- Sin axios, sin tanstack-query, sin SWR.
- Cada método en `api` objeto tiene dos ramas: Electron IPC o HTTP fetch.

### SQL

- Sin ORM. Queries escritas a mano.
- Columnas en snake_case en BD, mapeadas a camelCase con `AS`.
- Strings con comillas simples.
- Prepared statements reutilizados (guardados en variables).
- Migraciones online: `ALTER TABLE` en try/catch por si la columna ya existe.
