#language: es
Característica: Reproductor de Video
  Como usuario de TulennTv
  Quiero un reproductor de video funcional
  Para ver mis episodios cómodamente

  Escenario: Reproducir episodio
    Dado que selecciono "Naruto Episodio 1"
    Cuando hago clic en reproducir
    Entonces el video comienza a reproducirse
    Y veo el nombre del episodio en pantalla

  Escenario: Controles básicos
    Dado que un video se está reproduciendo
    Cuando presiono pausa
    Entonces el video se pausa
    Cuando presiono play
    Entonces el video se reanuda

  Escenario: Volumen
    Dado que un video se está reproduciendo
    Cuando subo el volumen al 80%
    Entonces el volumen se establece en 80%

  Escenario: Pantalla completa
    Dado que un video se está reproduciendo
    Cuando activo pantalla completa
    Entonces el video ocupa toda la pantalla
    Y el overlay se oculta tras 3 segundos

  Escenario: Finalizar episodio en modo zapping
    Dado que estoy en modo zapping viendo "Naruto E05"
    Cuando el episodio termina
    Entonces se reproduce automáticamente "Naruto E06"
