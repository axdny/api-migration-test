@auth
Feature: Token generation
  As a QA engineer
  I want to verify that both APIs issue bearer tokens correctly
  So that authenticated comparison scenarios can rely on them

  Background:
    Given the Core API is available

  @smoke
  Scenario Outline: Generate a token with valid credentials on the <api> API
    When I request a token from the <api> API with valid credentials
    Then the response status should be 200
    And the response should match the schema "tokenSuccess"
    And the response should contain a valid access token
    And the token type should be "bearer"
    And the token should expire in the future
    And the response should contain the username

    Examples:
      | api    |
      | Legacy |
      | Core   |

  @smoke
  Scenario Outline: Token request fails with invalid credentials on the <api> API
    When I request a token from the <api> API with invalid credentials
    Then the response status should be 400
    And the response should contain an error

    Examples:
      | api    |
      | Legacy |
      | Core   |

  Scenario: Token request fails with an empty username
    When I request a token from the Core API with an empty username
    Then the response status should be 400
    And the response should contain an error

  Scenario: Token request fails with an empty password
    When I request a token from the Core API with an empty password
    Then the response status should be 400
    And the response should contain an error
