Feature: Game Interaction
  Validate that the game board, difficulty and reset logic work correctly

  Background:
    Given the game page is open for user "Alice" with password "password123"

  Scenario: Play a move on the board
    When I click on the cell "0"
    Then the cell "0" should be occupied by a piece
    And the turn timer should be visible

  Scenario: Reset the game board
    Given I have played a move on cell "5"
    When I click the button to "Reiniciar partida"
    Then all cells on the board should be empty

  Scenario: Change game difficulty
    When I change the difficulty to "Hard"
    Then the game should reflect the "Hard" difficulty setting