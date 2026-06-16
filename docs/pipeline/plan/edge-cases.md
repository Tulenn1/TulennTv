# TulennTv — Casos Borde

## Archivos
- **Formato no soportado**: ignorar archivos .txt, .srt, .jpg dentro de carpeta de series
- **Carpeta vacía**: mostrar mensaje "Sin episodios"
- **Archivo corrupto**: mostrar error y saltar al siguiente
- **Rutas muy largas**: manejar paths > 255 caracteres (Windows)
- **Archivos sin metadatos**: usar nombre de archivo como título del episodio

## Zapping
- **Sin canales**: mostrar pantalla de bienvenida con botón "Agregar biblioteca"
- **Un solo canal**: deshabilitar flecha izquierda/derecha
- **Último canal**: loop al primero (navegación circular)
- **Cambio durante reproducción**: guardar progreso automáticamente

## Perfiles
- **Borrar perfil activo**: confirmación antes de borrar
- **Sin perfiles**: forzar creación del primero
- **Cambio de perfil**: guardar estado antes de cambiar

## Red / Servidor Web
- **Puerto ocupado**: elegir automáticamente el siguiente disponible
- **Timeout conexión TV**: mostrar mensaje "Esperando conexión..."
- **Servidor caído**: reintentar conexión

## General
- **Pantalla de carga**: para bibliotecas grandes (+1000 episodios)
- **Prevención de dobles clicks**: en botones de navegación
