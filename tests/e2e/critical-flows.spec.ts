import { test, expect } from '@playwright/test'

/**
 * The lightest test layer (docs/08-Testing-Strategy.md §4) - a handful of critical
 * flows only, run against a real running dev server + seeded database. These are
 * deliberately few: E2E tests are slow and brittle relative to the integration tests
 * in tests/integration/, which cover the actual money-correctness logic far more
 * thoroughly. This file exists to catch wiring/UI regressions the integration tests
 * can't see (a broken form binding, a route that 404s), not to re-verify business logic.
 *
 * Prerequisites (see README.md "Running tests"):
 *   - `docker compose up -d`, migrated, and seeded
 *   - `pnpm run dev` running against that database
 *   - SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD match what you seeded with
 */

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || 'owner@example.com'
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!'

test.describe('Critical flows', () => {
  test('login redirects to the dashboard and shows KPI cards', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(OWNER_EMAIL)
    await page.getByLabel('Password').fill(OWNER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByText('Total Sales Revenue')).toBeVisible()
    await expect(page.getByText('Cash Balance')).toBeVisible()
  })

  test('an unauthenticated visit to any protected page redirects to /login', async ({ page }) => {
    await page.goto('/cashbook')
    await expect(page).toHaveURL('/login')
  })

  test('recording a Cash Book entry appears in the table immediately', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(OWNER_EMAIL)
    await page.getByLabel('Password').fill(OWNER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.goto('/cashbook')
    await page.getByRole('button', { name: '+ New Entry' }).click()

    const uniqueParticulars = `E2E test entry ${Date.now()}`
    await page.getByLabel('Particulars').fill(uniqueParticulars)
    await page.getByLabel('Amount (Rs)').fill('123')
    await page.getByRole('button', { name: 'Save Entry' }).click()

    await expect(page.getByText(uniqueParticulars)).toBeVisible()
  })

  test('navigating to every main nav link renders without a client-side error page', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(OWNER_EMAIL)
    await page.getByLabel('Password').fill(OWNER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    const routes = [
      '/', '/cashbook', '/sales', '/purchases', '/inventory', '/expenses',
      '/customers', '/suppliers', '/reports/trial-balance', '/reports/profit-and-loss',
      '/reports/balance-sheet', '/reports/cash-flow', '/admin/users', '/admin/data-quality'
    ]

    for (const route of routes) {
      await page.goto(route)
      await expect(page.locator('body')).not.toContainText('Internal Server Error')
      await expect(page.locator('body')).not.toContainText('This page could not be found')
    }
  })
})
