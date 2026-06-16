#language: es
Característica: Guía de Canales (EPG)
  Como usuario de TulennTv
  Quiero ver una guía visual de todos los canales disponibles
  Para elegir qué ver de un vistazo

  Escenario: Visualización de la guía
    Dado que hay 5 series en la biblioteca
    Cuando abro la guía de canales
    Entonces veo 5 filas (una por serie)
    Y cada fila muestra el título y el episodio actual

  Escenario: Favoritos aparecen primero
    Dado que tengo "Naruto" y "One Piece" marcados como favoritos
    Y hay 5 series en total
    Cuando abro la guía
    Entonces los favoritos aparecen en las primeras posiciones

  Escenario: Sintonizar desde la guía
    Dado que estoy en la guía de canales
    Cuando selecciono "Attack on Titan"
    Entonces cambio al modo zapping
    Y se reproduce Attack on Titan

  Escenario: Búsqueda en la guía
    Dado que hay 10 series en la biblioteca
    Cuando busco "Naruto"
    Entonces solo veo resultados que coinciden con "Naruto"
