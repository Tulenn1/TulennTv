#language: es
Característica: Zapping TV
  Como usuario de TulennTv
  Quiero cambiar entre series como si fueran canales de TV
  Para ver contenido de forma continua y casual

  Escenario: Navegación entre canales
    Dado que hay 3 series en la biblioteca
    Y estoy viendo el "Canal 1: Naruto"
    Cuando presiono la flecha derecha (→)
    Entonces cambio al "Canal 2: One Piece"
    Y se reproduce el primer episodio de One Piece

  Escenario: Navegación circular
    Dado que hay 2 series en la biblioteca
    Y estoy viendo el "Canal 2: One Piece"
    Cuando presiono la flecha derecha (→)
    Entonces vuelvo al "Canal 1: Naruto"

  Escenario: Reproducción continua
    Dado que estoy viendo el episodio 12 de Naruto
    Cuando el episodio termina
    Entonces se reproduce automáticamente el episodio 13
    Y se guarda el progreso del episodio 12 como completado

  Escenario: Sin canales disponibles
    Dado que la biblioteca está vacía
    Cuando abro la pantalla de zapping
    Entonces veo un mensaje "Agrega tu primera serie para empezar"
    Y un botón para ir a la biblioteca

  Escenario: Último episodio de una serie
    Dado que estoy viendo el último episodio de Naruto
    Cuando el episodio termina
    Entonces cambio automáticamente al siguiente canal
