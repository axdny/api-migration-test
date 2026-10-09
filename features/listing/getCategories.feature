@listing
Feature: listing/getCategories - Legacy vs Core comparison
  As a QA engineer
  I want to verify that listing/getCategories behaves the same in Legacy and Core
  So that consumers can be switched to Core without changes

  Background:
    Given the Core API is available

  @smoke
  Scenario: Returns matching categories for a known text
    Given I have a valid token from the Core API
    When I get listing categories with text "truck" from the Core API
    Then the response status should be 200
    And the response should match the schema "getCategoriesSuccess"
    And the response time should be less than 5000 ms

  @smoke
  Scenario: Returns an empty array for an unknown text
    Given I have a valid token from the Core API
    When I get listing categories with text "nonexistent" from the Core API
    Then the response status should be 200
    And the response field "Data" should be an empty array

  @smoke
  Scenario: Returns all categories when the text parameter is omitted
    Given I have a valid token from the Core API
    When I get listing categories without the text parameter from the Core API
    Then the response status should be 200
    And the response should match the schema "getCategoriesSuccess"

  @smoke
  Scenario: Fails without a token
    When I get listing categories with text "truck" from the Core API
    Then the response status should be 401
    And the response should match the schema "unauthorized"

  @comparison
  Scenario: Legacy and Core return the same categories
    Given I have valid tokens from both APIs
    When I get listing categories with text "tr" from the Legacy API 5 times
    And I get listing categories with text "tr" from the Core API 5 times
    Then the Legacy and Core API responses should have the same structure
    And the Legacy and Core API response values should match
    And the performance comparison should be reported
    And the Core API average time should not exceed the Legacy API by more than 500 %

  @comparison
  Scenario: Legacy and Core reject unauthenticated calls the same way
    When I get listing categories with text "truck" from the Legacy API
    And I get listing categories with text "truck" from the Core API
    Then the Legacy and Core API responses should have the same structure
    And the Legacy and Core API error messages should match
