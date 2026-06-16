#language: es
Característica: Favoritos
  Como usuario de TulennTv
  Quiero marcar series como favoritas
  Para acceder rápidamente a mi contenido preferido

  Escenario: Marcar serie como favorita
    Dado que estoy viendo "Naruto" en el zapper
    Cuando presiono el botón de favorito
    Entonces Naruto se marca como favorito
    Y aparece una estrella junto a su nombre

  Escenario: Desmarcar favorito
    Dado que "Naruto" está marcado como favorito
    Cuando vuelvo a presionar el botón de favorito
    Entonces Naruto ya no es favorito
    Y la estrella desaparece

  Escenario: Favoritos por perfil
    Dado que hay dos perfiles: "Benja" y "Ana"
    Y Benja tiene marcado "Naruto" como favorito
    Cuando cambio al perfil de Ana
    Entonces los favoritos de Ana están vacíos
    Y Naruto no aparece como favorito
