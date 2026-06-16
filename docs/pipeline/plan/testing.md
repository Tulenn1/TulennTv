# TulennTv — Estrategia de Testing

## Niveles

1. **Unitario** (Jest + React Testing Library)
   - Lógica de escaneo de archivos
   - Parseo de nombres de episodios
   - Cálculo de progreso
   - Cambio de canales (estado del zapper)

2. **Integración** (Jest)
   - IPC handlers con SQLite
   - API REST endpoints
   - Flujo escaneo → guardado → consulta

3. **Componentes** (React Testing Library)
   - Zapper (navegación, overlay)
   - Guía de canales
   - Biblioteca
   - Reproductor
   - Selector de perfiles

4. **E2E** (Playwright / Spectron)
   - Electron: flujo completo abrir app → escanear → reproducir
   - Web TV: conexión al servidor → navegación
