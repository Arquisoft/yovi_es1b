Feature: Friends and Social Zone
  As a user, I want to search for other players and follow them

  Background:
    Given the game page is open for user "Alice" with password "password123"
    And a user exists with name "Bob" and nickname "BobTheBuilder"

  Scenario: Search for a user and see results
    When I open the "Social" section
    And I search for "Bob"
    Then I should see "BobTheBuilder" in the search results

  Scenario: Follow another user
    When I open the "Social" section
    And I search for "Bob"
    And I click the "Seguir" button for user "Bob"
    Then the button for "Bob" should change to "Siguiendo"