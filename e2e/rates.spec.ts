import { expect, test } from '@playwright/test'

const shots = process.env.SHOT_DIR

test('every rupee on a sample return traces to the rate card, and editing rates updates it @mobile', async ({ page }) => {
  // Sample tote: Grade B, zip pull detached (moderate) → zip replacement at a tailor
  await page.goto('/demo/returns/sample-07')
  await expect(page.getByRole('heading', { name: 'Atelier Leather Tote' })).toBeVisible()
  await expect(page.getByText('Estimated net per unit · from your rate card')).toBeVisible()
  await page.getByText('All options and the maths').click()
  const maths = page.locator('details', { hasText: 'All options and the maths' })
  await maths.getByRole('button', { name: /Repackage \/ refurbish/ }).click()
  await expect(maths.getByText('Zip pull', { exact: false }).or(maths.getByText(/Zip \/ button \/ buckle damage \(moderate\): Zip replacement/))).toBeVisible()
  await expect(maths.getByText('70% of your price, sold as “minor flaw”')).toBeVisible()
  await expect(maths.getByText('Published').first()).toBeVisible()
  await expect(maths.getByRole('link', { name: /Amazon\.in/ }).first()).toHaveAttribute('href', /^https:\/\//)
  if (shots) await page.screenshot({ path: `${shots}/maths-${test.info().project.name}.png`, fullPage: true })

  // A return with a saved decision, before the rate change
  await page.goto('/demo/returns/sample-02')
  const decidedCard = page.getByText('Decision saved').locator('xpath=..')
  const decidedBefore = (await decidedCard.textContent()) ?? ''
  expect(decidedBefore).toContain('₹1,373')

  // Change a rate and update open returns
  await page.goto('/demo/rates')
  await page.getByText('Resale & liquidation').click()
  await page.getByLabel('Repaired items resell at').fill('60')
  await page.getByRole('button', { name: 'Save rates' }).click()
  await expect(page.getByText('Rates saved.')).toBeVisible()
  await page.getByRole('button', { name: 'Update them' }).click()
  await expect(page.getByText(/Updated \d+ returns? without a decision/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Update them' })).toBeHidden()
  if (shots) await page.screenshot({ path: `${shots}/rates-${test.info().project.name}.png`, fullPage: true })

  await page.goto('/demo/returns/sample-07')
  await page.getByText('All options and the maths').click()
  await page.getByRole('button', { name: /Repackage \/ refurbish/ }).click()
  await expect(page.getByText('60% of your price, sold as “minor flaw”')).toBeVisible()

  // The saved decision is untouched, and its maths says so
  await page.goto('/demo/returns/sample-02')
  await expect(page.getByText('Decision saved').locator('xpath=..')).toHaveText(decidedBefore)
  await page.getByText('All options and the maths').click()
  await expect(page.getByText(/These are the values your decision was saved with/)).toBeVisible()

  // Reset restores the published defaults
  await page.goto('/demo/rates')
  await page.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(page.getByText('Back to the published defaults.')).toBeVisible()
})
