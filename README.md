# TulennTv

**TulennTv** transforma cualquier computadora en un servidor de streaming personal para ver anime, series y películas desde cualquier dispositivo de la red local (Smart TV, tablet, celular, PC) sin necesidad de instalar nada en los clientes — solo un navegador.

## Cómo funciona

Es una aplicación **server-centric**: un servidor central (puede ser un notebook, una PC de escritorio, una Raspberry Pi o cualquier máquina con Node.js) ejecuta la app y sirve el contenido vía web a toda la red local. Los archivos de video se almacenan localmente en el servidor y se transmiten por streaming HTTP con soporte de Range headers.

Cada carpeta de series se convierte automáticamente en un **canal de TV**: el usuario puede hacer zapping entre canales, la reproducción es continua (al terminar un episodio sigue el siguiente) y el progreso se guarda por perfil.

## Stack

| Capa | Tecnología |
|------|-----------|
| Servidor | **Node.js + Express** |
| Frontend | **React + TypeScript** (SPA) |
| Clientes | Cualquier navegador moderno |
| Streaming | HTML5 Video + HTTP Range headers |
| Posters | **TMDB API** (opcional, gratuita) |
| Persistencia | **SQLite** (better-sqlite3) |
| PWA | Instalable como app en dispositivos |

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
git clone https://github.com/Tulenn1/TulennTv.git
cd TulennTv
npm install
npm run build
```

### Inicio manual

```bash
npm start
```

En Windows también se puede iniciar con doble clic en `scripts/start-server.bat`.

### Inicio automático (Windows)

El servidor puede configurarse para arrancar automáticamente al iniciar sesión. Ejecutar en PowerShell como Administrador:

```powershell
.\scripts\firewall.ps1     # Abre puerto 3456 en el firewall
.\scripts\install-service.ps1   # Crea tarea programada de inicio automático
```

### Acceso desde clientes

Una vez iniciado, desde cualquier dispositivo en la misma red local abrir:

```
http://<IP-del-servidor>:3456
```

La IP se muestra en la consola al iniciar el servidor. También se puede escanear el código QR desde la sección **Conectar** de la app.

## Organización de archivos

Cada **subcarpeta** dentro de la carpeta de contenido se convierte en un **canal**. Los archivos de video dentro de cada subcarpeta se detectan como **episodios**.

```
📁 Contenido/
   ├── 📁 Naruto/               ← se convierte en un canal
   │   ├── Naruto Ep 01.mp4     ← episodio 1
   │   ├── Naruto Ep 02.mkv
   │   └── poster.jpg           ← carátula (opcional)
   ├── 📁 One Piece/             ← otro canal
   │   └── [Subs] OP - 001.mkv
   └── 📁 Shingeki/
       └── Shingeki S01E01.mkv
```

**Formatos de video soportados:** `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`, `.m4v`, `.wmv`, `.flv`

**Detección de episodios:** `S01E01`, `Ep 01`, `Capítulo 1`, `- 01`, `[01]`, `[Grupo] Nombre - 01 [1080p]`

**Posters:** Colocar `poster.jpg`, `cover.png` o `folder.jpg` dentro de la carpeta de la serie. Opcionalmente se puede configurar una API key de TMDB para obtener carátulas automáticamente.

## Controles (modo zapping)

| Tecla | Acción |
|-------|--------|
| ← → | Navegar entre episodios |
| ↑ | Abrir guía de canales (cambiar de canal) |
| ↓ | Descripción de la serie |
| Espacio | Play / Pausa |
| F | Pantalla completa |
| G | Guía de canales |
| I | Información de la serie |
| ESC | Volver a biblioteca |

## Características

- **Biblioteca agrupada** por Anime / Series / Películas con conteo
- **Zapping tipo TV** con navegación por canales, rotación automática y reproducción continua
- **Guía de canales** con grilla de programación y línea de tiempo en vivo
- **Modal de información** con sinopsis TMDB + lista de episodios
- **Reanudación de reproducción** desde el segundo exacto donde se dejó
- **Perfiles múltiples** con historial y favoritos independientes
- **Gestión de canales** personalizados (orden, icono, series asignadas)
- **Posters automáticos** vía TMDB API (opcional, gratuita)
- **Subtítulos** embebidos y externos (.srt, .vtt, .ass)
- **PWA** instalable como aplicación en Smart TV, celular y tablet
- **Carpeta centralizada** con explorador visual de directorios
- **Auto-inicio** como servicio de Windows
- **Backup automático** de la base de datos cada 24 horas
- **Detección de IP local** y registro mDNS (`tulenntv.local`)

## Arquitectura del proyecto

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
│   ├── detector.ts       # Duración real de video
│   ├── mdns.ts           # Registro .local
│   ├── firewall.ts       # Apertura de puertos
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
│       ├── browse.ts     # Explorador archivos
│       ├── subtitles.ts  # Subtítulos
│       └── connect.ts    # Conexión remota
├── src/                  # Frontend React
│   ├── pages/            # ProfileSelector, Library, Zapper,
│   │                     # Guide, Channels, Folders, TvConnect
│   ├── components/       # Player, SeriesCard, ZapperOverlay,
│   │                     # PlayerControls, FaqModal
│   ├── context/          # AppContext, ThemeContext
│   ├── lib/api.ts        # Capa HTTP
│   └── shared/types.ts   # Tipos compartidos
├── scripts/              # start-server.bat, install-service.ps1,
│                         # firewall.ps1, build-dist.bat, update.bat
├── docs/pipeline/        # Plan, especificaciones y tareas
└── agents-stack/         # Agentes opencode
```

## Scripts disponibles

| Comando / Script | Descripción |
|-----------------|-------------|
| `npm run dev` | Desarrollo con hot-reload |
| `npm run build` | Compila frontend React |
| `npm start` | Inicia servidor en producción |
| `npm test` | Ejecuta tests (Jest) |
| `scripts\start-server.bat` | Inicio rápido en Windows |
| `scripts\install-service.ps1` | Instala como servicio de Windows |
| `scripts\firewall.ps1` | Abre puerto 3456 en firewall |
| `scripts\build-dist.bat` | Genera carpeta portable para distribuir |
| `scripts\update.bat` | Actualiza la app desde GitHub |

## Licencia

MIT
