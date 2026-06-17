# TulennTv

App tipo TV que simula **zapping** con archivos locales de anime, series y películas.
Corre como servidor en un notebook Windows y se accede desde cualquier dispositivo
(Smart TV, tablet, celular, PC) solo con un navegador.

## Stack

| Capa | Tecnología |
|------|-----------|
| Servidor | **Node.js + Express** |
| Frontend | **React + TypeScript** (SPA, servida estáticamente) |
| Clientes | Cualquier navegador (TV, tablet, celular, PC) |
| Streaming | HTML5 Video + HTTP Range headers |
| Persistencia | **SQLite** (better-sqlite3) |
| Servidor OS | Windows 10 / 11 (notebook reciclado) |

## Requisitos

- Node.js 18+
- npm 9+

## Instalación y uso

### En el servidor (notebook Windows)

```bash
git clone https://github.com/Tulenn1/TulennTv.git
cd TulennTv
npm install
npm run build    # compila el frontend React
```

**Inicio manual:**
```bash
npm start
# o doble clic en scripts/start-server.bat
```

**Auto-inicio (opcional):**
Ejecutar PowerShell como Administrador:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\firewall.ps1
.\scripts\install-service.ps1
```

### En los clientes (Smart TV, tablet, celular)

Solo abrí el navegador y entrá a:
```
http://<IP-del-servidor>:3456
```

La IP se muestra en la consola al iniciar el servidor.

## Cómo usarlo

1. **Creá un perfil** — al entrar desde el navegador
2. **Escaneá tu biblioteca** — ingresá la carpeta raíz donde tenés tus series
3. **Zappeá** — navegá entre canales con ← → (flechas del teclado)
4. **Guía de canales** — presioná ↑ para ver todos los canales

## Organización de archivos

El escáner detecta automáticamente la estructura. Cada **subcarpeta = una serie**.
Los **archivos de video adentro = episodios**.

```
📁 D:/Media/Anime/              ← le indicás esta carpeta a la app
   ├── 📁 Naruto/               ← se convierte en un "canal"
   │   ├── Naruto Ep 01.mp4     ← se detecta como episodio
   │   ├── Naruto Ep 02.mkv
   │   └── Naruto S01E03.mkv
   ├── 📁 One Piece/             ← otro "canal"
   │   ├── One Piece 001.mp4
   │   └── One Piece 002.mp4
   └── 📁 Shingeki/
       └── shingeki-ep01.mp4
```

**Formatos de video soportados:** `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.m4v`, `.wmv`, `.flv`

**Detección de episodios:** reconoce `S01E01`, `Ep 01`, `Capítulo 1`, `001`, etc.

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
TulennTv/
├── server/               # Backend (Node.js + Express)
│   ├── index.ts          # Entry point del servidor
│   ├── database.ts       # Conexión SQLite
│   ├── schema.ts         # Esquema de tablas
│   ├── scanner.ts        # Escáner de archivos de video
│   ├── streamer.ts       # Streaming HTTP con Range headers
│   ├── channels.ts       # Canales automáticos
│   ├── backup.ts         # Backup automático de DB
│   ├── utils/
│   │   └── network.ts    # Detección de IP local
│   └── routes/
│       ├── profiles.ts   # CRUD de perfiles
│       ├── library.ts    # Biblioteca y episodios
│       ├── progress.ts   # Progreso de reproducción
│       ├── favorites.ts  # Favoritos por perfil
│       ├── channels.ts   # Canales auto/custom
│       ├── folders.ts    # Carpetas escaneadas
│       ├── scanner.ts    # Endpoint de escaneo
│       ├── episode.ts    # Detalle de episodio
│       └── video.ts      # Streaming de video
├── src/                  # Frontend React (SPA)
│   ├── pages/
│   │   ├── ProfileSelector.tsx
│   │   ├── Library.tsx
│   │   ├── Zapper.tsx
│   │   ├── Guide.tsx
│   │   ├── Channels.tsx
│   │   ├── Folders.tsx
│   │   └── TvConnect.tsx
│   ├── components/
│   │   ├── Player.tsx
│   │   ├── PlayerControls.tsx
│   │   ├── SeriesCard.tsx
│   │   └── ZapperOverlay.tsx
│   ├── lib/api.ts        # Capa de abstracción HTTP
│   └── context/AppContext.tsx
├── scripts/              # Scripts Windows
│   ├── start-server.bat
│   ├── install-service.ps1
│   └── firewall.ps1
├── docs/pipeline/        # Plan, specs Gherkin y tareas
└── agents-stack/         # Agentes opencode
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo (Vite + servidor con hot-reload) |
| `npm run build` | Compila frontend React |
| `npm start` | Inicia servidor en producción |
| `npm test` | Ejecuta tests |

## Pipeline de desarrollo (opencode)

Pipeline de 6 etapas con agentes opencode:

```
/planner → /spec → /tasks → /implement-all → /pr-ready
```

Ver `AGENTS.md` para más detalles.
