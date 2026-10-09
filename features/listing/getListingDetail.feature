@listing
Feature: listing/getListingDetail - Legacy vs Core comparison
  As a QA engineer
  I want to verify that listing/getListingDetail returns the same listing in Legacy and Core
  So that we can validate it before and after the migration

  Background:
    Given the Core API is available

  @smoke
  Scenario: Get listing detail with a valid ID
    When I get the listing detail with ID "1001" from the Core API
    Then the response status should be 200
    And the response should match the schema "getListingDetailSuccess"
    And the response field "Data.Title" should equal "2018 Heavy Duty Truck"
    And the response time should be less than 5000 ms

  @smoke
  Scenario: Fails when the ID parameter is empty
    When I get the listing detail with ID "" from the Core API
    Then the response status should be 404
    And the response should be empty

  @smoke
  Scenario: Fails when the listing does not exist
    When I get the listing detail with ID "999999" from the Core API
    Then the response status should be 404
    And the response should match the schema "errorResponse"
    And the response field "Message" should equal "Listing not found."

  @comparison
  Scenario: Legacy and Core return the same error for an unknown listing
    When I get the listing detail with ID "999999" from the Legacy API
    And I get the listing detail with ID "999999" from the Core API
    Then the Legacy and Core API responses should have the same structure
    And the Legacy and Core API response values should match
    And the Legacy and Core API error messages should match

  # Core currently returns OwnerId = null and a camelCase "listingDetailLink" key.
  # Kept as a living example of what the comparison engine reports:
  #   npm run test:divergence
  @comparison @known-divergence
  Scenario: Legacy and Core return the same listing detail
    When I get the listing detail with ID "1001" from the Legacy API 3 times
    And I get the listing detail with ID "1001" from the Core API 3 times
    Then the Legacy and Core API responses should have the same structure
    And the Legacy and Core API response values should match
    And the performance comparison should be reported
