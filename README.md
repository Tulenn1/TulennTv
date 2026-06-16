# TulennTv

App tipo TV que simula **zapping** con archivos locales de anime, series y películas. Cambiá entre tus series como si fueran canales de TV.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript |
| Desktop | Electron + vite-plugin-electron |
| Web TV | Servidor HTTP embebido + navegador |
| Persistencia | SQLite (better-sqlite3) |
| Empaquetado | electron-builder → .exe / .AppImage / .deb |

## Requisitos

- Node.js 18+
- npm 9+
- Para Electron en Linux: `libnss3`, `libgtk-3-0`, `libgbm1`, `libdrm2`, `libxkbcommon0`

## Instalación y uso

```bash
# Clonar
git clone https://github.com/Tulenn1/TulennTv.git
cd TulennTv

# Instalar dependencias
npm install

# Desarrollo (Vite + Electron)
npm run electron:dev

# Solo web (sin Electron, para probar UI en navegador)
npx vite --config vite.web.config.ts

# Build para producción
npm run build
npm run electron:build   # genera .exe / .AppImage / .deb
```

## Cómo usarlo

1. **Creá un perfil** — al iniciar la app
2. **Escaneá tu biblioteca** — ingresá la ruta de tu carpeta de series/anime
3. **Zappeá** — navegá entre canales con ← → (flechas del teclado)
4. **Guía de canales** — presioná ↑ para ver todos los canales
5. **Smart TV** — abrí `http://<IP>:<puerto>` en el navegador de tu TV

### Atajos de teclado (modo zapping)

| Tecla | Acción |
|-------|--------|
| ← → | Cambiar canal |
| ↑ | Abrir guía de canales |
| Espacio | Play / Pausa |
| F | Pantalla completa |
| ESC | Volver a biblioteca |

## Arquitectura

```
electron/              # Backend (Node.js + SQLite)
├── main.ts            # Entry point de Electron
├── preload.ts         # Bridge IPC seguro
├── database.ts        # Conexión SQLite
├── schema.ts          # Esquema de tablas
├── scanner.ts         # Escáner de archivos de video
├── library.ts         # CRUD de biblioteca
├── profiles.ts        # Gestión de perfiles
├── favorites.ts       # Favoritos por perfil
├── progress.ts        # Progreso de reproducción
├── ipc.ts             # Handlers IPC
└── server.ts          # Servidor HTTP para Web TV

src/                   # Frontend React (compartido PC + TV)
├── pages/
│   ├── ProfileSelector.tsx
│   ├── Library.tsx
│   ├── Zapper.tsx
│   ├── Guide.tsx
│   └── TvConnect.tsx
├── components/
│   ├── Player.tsx
│   ├── PlayerControls.tsx
│   ├── SeriesCard.tsx
│   └── ZapperOverlay.tsx
├── lib/api.ts         # Capa de abstracción IPC / HTTP
└── context/AppContext.tsx

docs/pipeline/         # Plan, specs Gherkin y tareas
agents-stack/          # Agentes opencode
```

## Pipeline de desarrollo (opencode)

Este proyecto incluye un pipeline de 6 etapas con agentes opencode:

```
/planner → /spec → /tasks → /implement-all → /pr-ready
```

Ver `AGENTS.md` para más detalles.
