#language: es
Característica: Escaneo de Biblioteca
  Como usuario de TulennTv
  Quiero escanear mis carpetas locales de videos
  Para que la app detecte automáticamente mis series y episodios

  Escenario: Escaneo automático de carpeta raíz
    Dado que configuro una carpeta raíz "/media/Anime"
    Y esa carpeta contiene "Naruto/" con "ep01.mp4", "ep02.mkv"
    Y "One Piece/" con "ep001.mkv", "ep002.mkv"
    Cuando ejecuto el escaneo automático
    Entonces la biblioteca contiene 2 series
    Y Naruto tiene 2 episodios
    Y One Piece tiene 2 episodios

  Escenario: Agregado manual de serie
    Dado que tengo la app abierta sin biblioteca
    Cuando agrego manualmente la carpeta "/media/Series/Breaking Bad"
    Entonces Breaking Bad aparece en la biblioteca
    Y se escanean sus episodios automáticamente

  Escenario: Archivos no de video son ignorados
    Dado que escaneo una carpeta con "ep01.mp4", "poster.jpg", "subtitulos.srt"
    Cuando se completa el escaneo
    Entonces solo se detecta "ep01.mp4" como episodio

  Escenario: Rescaneo tras agregar nuevos archivos
    Dado que tengo "Naruto" con 2 episodios en la biblioteca
    Cuando agrego "ep03.mp4" a la carpeta de Naruto
    Y rescaneo la biblioteca
    Entonces Naruto tiene 3 episodios
