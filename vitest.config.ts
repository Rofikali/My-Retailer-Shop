import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Unit tests (tests/unit/**) run with no dependencies and should always be fast
    // and green. Integration tests (tests/integration/**) need TEST_DATABASE_URL
    // pointed at a real Postgres - see README.md "Running tests".
    include: ['tests/**/*.test.ts']
  }
})
