@account
Feature: account/register - Legacy vs Core comparison
  As a QA engineer
  I want to verify the registration rules in Legacy and Core
  So that validation behaviour is preserved by the migration

  Background:
    Given the Core API is available

  @smoke
  Scenario: Register a new user
    When I register with email "new.user@example.com", password "Str0ng#Pass" and confirmation "Str0ng#Pass" on the Core API
    Then the response status should be 200
    And the response should match the schema "successResponse"
    And the response field "Success" should equal "true"

  @smoke
  Scenario: Registration fails when the email is already registered
    When I register with email "taken@example.com", password "Str0ng#Pass" and confirmation "Str0ng#Pass" on the Core API
    Then the response status should be 400
    And the response should match the schema "errorResponse"
    And the response field "Message" should equal "Email is already registered."

  @smoke
  Scenario Outline: Registration fails with invalid data (<case>)
    When I register with email "<email>", password "<password>" and confirmation "<confirmation>" on the Core API
    Then the response status should be 400
    And the response should match the schema "errorResponse"
    And the response field "FieldErrors.<field>" should equal "<message>"

    Examples:
      | case             | email              | password    | confirmation | field           | message                                              |
      | invalid email    | not-an-email       | Str0ng#Pass | Str0ng#Pass  | Email           | The Email field is not valid.                        |
      | weak password    | a.user@example.com | short       | short        | Password        | The Password must be at least 8 characters long.     |
      | passwords differ | a.user@example.com | Str0ng#Pass | Different#1  | ConfirmPassword | The password and confirmation password do not match. |

  @comparison
  Scenario Outline: Legacy and Core return the same validation error (<case>)
    When I register with email "<email>", password "<password>" and confirmation "<confirmation>" on the Legacy API
    And I register with email "<email>", password "<password>" and confirmation "<confirmation>" on the Core API
    Then the Legacy and Core API responses should have the same structure
    And the Legacy and Core API response values should match

    Examples:
      | case             | email              | password    | confirmation |
      | invalid email    | not-an-email       | Str0ng#Pass | Str0ng#Pass  |
      | weak password    | a.user@example.com | short       | short        |
      | passwords differ | a.user@example.com | Str0ng#Pass | Different#1  |
