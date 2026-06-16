#language: es
Característica: Historial y Progreso
  Como usuario de TulennTv
  Quiero que la app recuerde dónde dejé cada episodio
  Para retomar desde donde lo dejé

  Escenario: Guardar progreso al cambiar de canal
    Dado que estoy viendo Naruto Episodio 5 en el minuto 10:30
    Cuando cambio al canal de One Piece
    Entonces el progreso de Naruto Episodio 5 se guarda en 10:30

  Escenario: Reanudar episodio
    Dado que tengo progreso guardado en Naruto Episodio 5 (minuto 10:30)
    Cuando vuelvo a Naruto
    Entonces el episodio se reanuda desde el minuto 10:30

  Escenario: Marcar episodio como visto
    Dado que estoy viendo Naruto Episodio 5
    Cuando llego al final del episodio
    Entonces el episodio se marca como completado
