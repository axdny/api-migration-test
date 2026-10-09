@smoke
Feature: Health check
  As a QA engineer
  I want to confirm that both the Legacy and Core APIs are reachable
  So that the comparison suites do not fail for infrastructure reasons

  Scenario Outline: <api> API reports healthy
    Given the <api> API is available

    Examples:
      | api    |
      | Legacy |
      | Core   |
