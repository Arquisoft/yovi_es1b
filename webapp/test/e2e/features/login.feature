Feature: Login
  Validate the login form

  Scenario: Successful login
    Given the login page is open
    When I login with "Alice" and "password123"
    Then I should be redirected to the game page and see "Alice"