# TulennTv — Tareas

## Fase 1: Base del Proyecto
| ID | Tarea | Archivos | Depends On |
|----|-------|----------|------------|
| T01 | Inicializar proyecto Node + Electron + React con Vite | `package.json`, `vite.config.ts`, `electron/` | - |
| T02 | Configurar TypeScript, ESLint, Prettier | `tsconfig.json`, `.eslintrc` | T01 |
| T03 | Setup de SQLite con better-sqlite3 y schema inicial | `electron/database.ts`, `electron/schema.ts` | T01 |
| T04 | Implementar IPC bridge (main ↔ renderer) tipado | `electron/ipc.ts`, `shared/ipc-types.ts` | T01 |

## Fase 2: Perfiles
| ID | Tarea | Archivos | Depends On |
|----|-------|----------|------------|
| T05 | CRUD de perfiles (IPC + DB) | `electron/profiles.ts` | T03 |
| T06 | Pantalla selector de perfiles | `src/pages/ProfileSelector.tsx` | T04, T05 |
| T07 | Persistencia de perfil activo | `electron/session.ts` | T05 |

## Fase 3: Escáner de Biblioteca
| ID | Tarea | Archivos | Depends On |
|----|-------|----------|------------|
| T08 | Escáner de directorios (recursivo, filtro video) | `electron/scanner.ts` | T03 |
| T09 | Parseo de nombres de episodios (temporada/episodio) | `electron/parser.ts` | T03 |
| T10 | UI de Biblioteca (grid + búsqueda + filtros) | `src/pages/Library.tsx`, `src/components/SeriesCard.tsx` | T04, T08 |
| T11 | Agregado manual de series + rescaneo | `electron/scanner.ts`, `src/pages/Library.tsx` | T10 |

## Fase 4: Reproductor
| ID | Tarea | Archivos | Depends On |
|----|-------|----------|------------|
| T12 | Reproductor de video con HTML5 Video API | `src/components/Player.tsx` | T04 |
| T13 | Controles (play/pause, volumen, progreso, fullscreen) | `src/components/PlayerControls.tsx` | T12 |
| T14 | Guardado y reanudación de progreso | `electron/progress.ts`, `src/components/Player.tsx` | T03, T12 |

## Fase 5: Zapping
| ID | Tarea | Archivos | Depends On |
|----|-------|----------|------------|
| T15 | Modo zapper (navegación ← → entre series) | `src/pages/Zapper.tsx` | T04, T12 |
| T16 | Reproducción continua (auto-siguiente episodio) | `src/pages/Zapper.tsx`, `electron/queue.ts` | T14, T15 |
| T17 | Overlay de información (nombre serie, episodio) | `src/components/ZapperOverlay.tsx` | T15 |
| T18 | Transición visual entre canales | `src/components/ChannelTransition.tsx` | T15 |

## Fase 6: Guía EPG
| ID | Tarea | Archivos | Depends On |
|----|-------|----------|------------|
| T19 | Grid de guía de canales | `src/pages/Guide.tsx` | T10, T04 |
| T20 | Favoritos en guía (ordenamiento, estrella) | `src/pages/Guide.tsx`, `electron/favorites.ts` | T05, T19 |
| T21 | Búsqueda en guía | `src/pages/Guide.tsx` | T19 |

## Fase 7: Web TV
| ID | Tarea | Archivos | Depends On |
|----|-------|----------|------------|
| T22 | Servidor HTTP embebido en Electron | `electron/server.ts` | T03 |
| T23 | Endpoints REST (library, progress, favorites, profiles) | `electron/server.ts` | T22 |
| T24 | WebApp TV (React, misma base, modo navegador) | `src/tv/` | T06, T10, T15, T19 |
| T25 | Landing page con instrucciones de conexión TV | `src/pages/TvConnect.tsx` | T22 |

## Fase 8: Empaquetado y Final
| ID | Tarea | Archivos | Depends On |
|----|-------|----------|------------|
| T26 | Configurar electron-builder para .exe y .AppImage | `electron-builder.yml` | T01 |
| T27 | Pruebas unitarias (Jest) | `src/__tests__/`, `electron/__tests__/` | All |
| T28 | README y documentación final | `README.md` | All |
