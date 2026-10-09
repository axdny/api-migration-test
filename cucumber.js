// CI agents render `progress-bar` as ANSI cursor moves that can hide failure lines,
// so fall back to the plain `progress` formatter when running in CI.
const isCi = process.env.CI === 'true' || process.env.TF_BUILD === 'True';

export default {
  import: ['src/**/*.ts'],
  format: [
    'json:reports/cucumber-report.json',
    'html:reports/report.html',
    'junit:reports/junit-results.xml',
    'summary',
    isCi ? 'progress' : 'progress-bar',
  ],
  formatOptions: { snippetInterface: 'async-await' },
  timeout: 30000,
  // Only scenarios tagged @flaky are retried (network hiccups against real environments).
  retry: 2,
  retryTagFilter: '@flaky',
};
