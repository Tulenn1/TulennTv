#language: es
Característica: Perfiles de Usuario
  Como usuario de TulennTv
  Quiero tener múltiples perfiles
  Para que cada persona tenga su propio historial y favoritos

  Escenario: Crear perfil
    Dado que estoy en la pantalla de inicio
    Cuando selecciono "Agregar perfil"
    E ingreso el nombre "Benja" y el avatar "😎"
    Entonces se crea un nuevo perfil "Benja"
    Y soy redirigido a la biblioteca

  Escenario: Cambiar de perfil
    Dado que hay 2 perfiles: "Benja" y "Ana"
    Y estoy usando el perfil "Benja"
    Cuando voy a la pantalla de perfiles
    Y selecciono "Ana"
    Entonces cambio al perfil "Ana"
    Y veo sus favoritos e historial

  Escenario: Eliminar perfil
    Dado que hay un perfil "Benja" con historial y favoritos
    Cuando elimino el perfil "Benja"
    Entonces el perfil desaparece
    Y todo su historial y favoritos se eliminan

  Escenario: Sin perfiles disponibles
    Dado que no hay ningún perfil creado
    Cuando abro la app
    Entonces veo la pantalla de creación de perfil
    Y no puedo continuar sin crear al menos uno
