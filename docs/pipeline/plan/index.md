# TulennTv — Plan de Proyecto

App tipo TV que simula zapping con archivos locales de anime, series y películas.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend compartido | **React** (TypeScript) |
| PC Desktop | **Electron** + electron-builder → `.exe` |
| TV (Smart TV) | **WebApp** servida localmente, accesible desde navegador TV |
| Reproductor | **Video HTML5** (embebido en Electron/Web) |
| Persistencia | **SQLite** (better-sqlite3 via electron) / **IndexedDB** (web) |
| Empaquetado PC | electron-builder → `.exe` (Windows), `.AppImage`/`.deb` (Linux) |

## Arquitectura

```
┌─────────────────────────────┐
│      Frontend React (compartido)     │
│  ┌─────┐ ┌──────┐ ┌───────┐ │
│  │Zapper│ │Guide│ │Library│ │
│  └─────┘ └──────┘ └───────┘ │
├─────────────────────────────┤
│  Electron (PC)  │  Web App (TV)   │
│  Reproductor    │  Navegador      │
│  Archivos local │  HTTP local     │
│  SQLite         │  IndexedDB      │
└─────────────────────────────┘
```
