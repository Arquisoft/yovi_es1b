Feature: Jugar al juego de Y

  Scenario: Iniciar la partida y poner una ficha
    Given el usuario está en la pantalla de inicio
    When el usuario escribe el nombre "Jugador1"
    And pulsa el botón "Start playing"
    Then El tablero debería aparecer en pantalla
    When el usuario pulsa en la primera casilla vacía
    Then el sistema debería confirmar "Movimiento realizado!"