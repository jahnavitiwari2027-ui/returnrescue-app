import { expect, test } from '@playwright/test'

const shots = process.env.SHOT_DIR

test('pick a platform, set GST and delivery by hand, and save it as the default @mobile', async ({ page }) => {
  await page.goto('/demo/returns/new')
  const card = page.locator('form')
  // The rate card default is Amazon.in, picked automatically
  await expect(card.getByRole('radiogroup', { name: 'Platform' }).getByRole('radio', { name: /Amazon\.in/ })).toHaveAttribute('aria-checked', 'true')

  await page.getByLabel('Product name').fill('E2E Platform Tee')
  await page.getByLabel('Category').selectOption('Topwear')
  await page.getByLabel('Original selling price').fill('1999')
  // Each platform shows its fees on this item: Amazon 21% referral + ₹79 closing, ₹55 delivery
  await expect(card.getByRole('radiogroup', { name: 'Platform' }).getByRole('radio', { name: /Amazon\.in/ })).toContainText('≈ ₹499 fees + ₹55 delivery')
  await expect(card.getByRole('radiogroup', { name: 'Platform' }).getByRole('radio', { name: /Flipkart/ })).toContainText('≈ ₹22 fees + ₹16 delivery')

  await card.getByRole('radiogroup', { name: 'Platform' }).getByRole('radio', { name: /Flipkart/ }).click()
  await expect(card.getByText('Flipkart fixed fee')).toBeVisible()
  // GST is automatic (5% up to ₹2,500) until the box is ticked
  await expect(card.getByText('Clothing & footwear: 5% up to ₹2,500, 18% above')).toBeVisible()
  await card.getByLabel('Set GST myself').check()
  await card.getByRole('radio', { name: '18%' }).click()
  // Delivery: custom amount
  await card.getByRole('radio', { name: 'Custom' }).click()
  await card.getByLabel('Your delivery charge').fill('40')
  await card.getByLabel('Save as my default for new returns').check()
  if (shots) await page.screenshot({ path: `${shots}/platform-${test.info().project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Save return' }).click()

  await expect(page).toHaveURL(/\/demo\/returns\/[^/]+\?new=1/)
  await page.getByRole('button', { name: 'or grade it yourself' }).click()
  await page.getByRole('radio', { name: /Grade A/ }).click()
  await page.getByRole('button', { name: 'Save grade' }).click()
  await page.getByText('All options and the maths').click()
  const maths = page.locator('details', { hasText: 'All options and the maths' })
  await expect(maths.getByText(/Priced for selling on Flipkart/)).toBeVisible()
  await expect(maths.getByText(/18% is included in the price, so 15.25% of it goes to GST \(rate you set\)/)).toBeVisible()
  await expect(maths.getByText('Flipkart shipping: your amount')).toBeVisible()

  // Saved as the default: the next new return starts on Flipkart with the same choices
  await page.goto('/demo/returns/new')
  const next = page.locator('form')
  await expect(next.getByRole('radiogroup', { name: 'Platform' }).getByRole('radio', { name: /Flipkart/ })).toHaveAttribute('aria-checked', 'true')
  await expect(next.getByLabel('Set GST myself')).toBeChecked()
  await page.goto('/demo/rates')
  await expect(page.getByText(/Saved with it: GST 18%, delivery ₹40/)).toBeVisible()
  await page.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(page.getByText('Back to the published defaults.')).toBeVisible()
})
