# TulennTv

App tipo TV que simula **zapping** con archivos locales de anime, series y películas.
Corre como servidor en un notebook Windows y se accede desde cualquier dispositivo
(Smart TV, tablet, celular, PC) solo con un navegador.

## Stack

| Capa | Tecnología |
|------|-----------|
| Servidor | **Node.js + Express** |
| Frontend | **React + TypeScript** (SPA) |
| Clientes | Cualquier navegador |
| Streaming | HTML5 Video + HTTP Range headers |
| Posters | **TMDB API** (opcional, gratis) |
| Persistencia | **SQLite** (better-sqlite3) |

## Requisitos

- Node.js 18+
- npm 9+

## Instalación y uso

### En el servidor (notebook Windows)

```bash
git clone https://github.com/Tulenn1/TulennTv.git
cd TulennTv
npm install
npm run build
```

**Inicio manual:**
```bash
npm start
# o doble clic en scripts/start-server.bat
```

**Auto-inicio (opcional):**
```powershell
# PowerShell como Administrador
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
2. **Configurá la carpeta principal** en la sección **Carpetas**
3. **Escaneá** — la app detecta automáticamente todas las subcarpetas
4. **Biblioteca** — explorá tus series agrupadas por categoría
5. **Zapping** — navegá entre episodios con ← →, cambiá de canal con ↑

## Organización de archivos

Cada **subcarpeta = una serie / un canal**.
Los **archivos de video adentro = episodios**.

```
📁 CarpetaPrincipal/
   ├── 📁 Naruto/               ← se convierte en un canal
   │   ├── Naruto Ep 01.mp4     ← episodio 1
   │   ├── Naruto Ep 02.mkv
   │   └── poster.jpg           ← carátula (opcional)
   ├── 📁 One Piece/             ← otro canal
   │   └── [Subs] OP - 001.mkv  ← formato anime
   └── 📁 Shingeki/
       └── Shingeki S01E01.mkv
```

**Formatos de video:** `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.m4v`, `.wmv`, `.flv`

**Detección de episodios:** `S01E01`, `Ep 01`, `Capítulo 1`, `- 01`, `[01]`, `[Grupo] Nombre - 01 [1080p]`

**Posters:** Colocá `poster.jpg`, `cover.png` o `folder.jpg` dentro de la carpeta de la serie.
Opción: configurar API key de TMDB para obtener carátulas automáticamente.

## Controles (modo zapping)

| Tecla | Acción |
|-------|--------|
| ← → | Navegar entre episodios |
| ↑ | Abrir guía de canales (cambiar de canal) |
| ↓ | Descripción de la serie |
| Espacio | Play / Pausa |
| F | Pantalla completa |
| ESC | Volver a biblioteca |

## Características

- **Biblioteca agrupada** por Anime / Series / Películas con conteo
- **Modal de información** con descripción TMDB + lista de episodios detectados
- **Cambiar tipo** de serie desde la tarjeta (anime/series/película)
- **Reanudación** desde el segundo exacto donde lo dejaste
- **Rotación automática** al terminar todos los episodios
- **Perfiles múltiples** con historial y favoritos independientes
- **Posters desde TMDB** (opcional, requiere API key gratuita)
- **Carpeta centralizada** con explorador visual de directorios

## Arquitectura

```
TulennTv/
├── server/               # Backend (Node.js + Express)
│   ├── index.ts          # Entry point
│   ├── database.ts       # SQLite
│   ├── schema.ts         # Esquema de tablas
│   ├── scanner.ts        # Escáner de archivos
│   ├── parser.ts         # Parseo inteligente de nombres
│   ├── streamer.ts       # Streaming HTTP Range
│   ├── channels.ts       # Canales automáticos
│   ├── backup.ts         # Backup automático
│   ├── utils/network.ts  # IP local
│   └── routes/
│       ├── profiles.ts   # Perfiles
│       ├── library.ts    # Biblioteca + episodios
│       ├── progress.ts   # Progreso
│       ├── favorites.ts  # Favoritos
│       ├── channels.ts   # Canales
│       ├── folders.ts    # Carpetas
│       ├── scanner.ts    # Escaneo
│       ├── episode.ts    # Episodios
│       ├── video.ts      # Streaming
│       ├── poster.ts     # Posters + TMDB
│       ├── settings.ts   # Configuración
│       └── browse.ts     # Explorador archivos
├── src/                  # Frontend React
│   ├── pages/            # ProfileSelector, Library, Zapper,
│   │                     # Guide, Channels, Folders, TvConnect
│   ├── components/       # Player, SeriesCard, ZapperOverlay...
│   ├── lib/api.ts        # Capa HTTP
│   └── context/AppContext.tsx
├── scripts/              # start-server.bat, install-service.ps1, firewall.ps1
├── docs/pipeline/        # Plan, specs y tareas
└── agents-stack/         # Agentes opencode
```

## Scripts disponibles

| Comando / Script | Descripción |
|-----------------|-------------|
| `npm run dev` | Desarrollo (Vite + servidor hot-reload) |
| `npm run build` | Compila frontend React |
| `npm start` | Inicia servidor en producción |
| `npm test` | Ejecuta tests (Jest) |
| `scripts\update.bat` | Actualiza la app (git pull + npm install + build) |
| `scripts\start-server.bat` | Inicio rápido con doble clic |
| `scripts\build-dist.bat` | Genera carpeta portable para distribuir |
| `scripts\install-service.ps1` | Instala como servicio de Windows (auto-inicio) |
| `scripts\firewall.ps1` | Abre puerto 3456 en firewall |

## Actualizar la app

Cuando haya nuevas versiones en GitHub, ejecutá:

```batch
scripts\update.bat
```

Esto descarga los cambios, instala dependencias nuevas y recompila el frontend automáticamente.
Si el servidor estaba corriendo, reinicialo después con `npm start` o `start-server.bat`.

## Arquitectura

## Pipeline de desarrollo (opencode)

```
/planner → /spec → /tasks → /implement-all → /pr-ready
```

Ver `AGENTS.md` para más detalles.
