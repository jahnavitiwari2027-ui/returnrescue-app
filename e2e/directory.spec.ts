import { expect, test } from '@playwright/test'

test('Delhi NCR directory lists real businesses with sources, filters and saving @mobile', async ({ page }) => {
  await page.goto('/demo/partners')
  await expect(page.getByRole('heading', { name: 'Delhi NCR directory' })).toBeVisible()
  await expect(page.getByText(/no partnership or affiliation/)).toBeVisible()

  // Filter to liquidation buyers
  await page.getByRole('button', { name: 'Liquidation', exact: true }).click()
  await expect(page.getByText('IndiaLot')).toBeVisible()
  await expect(page.getByText('Goonj')).toBeHidden()

  // Filter to Gurugram repair & cleaning
  await page.getByRole('button', { name: 'Repair & cleaning' }).click()
  await page.getByRole('button', { name: 'Gurugram' }).click()
  await expect(page.getByText('Kicks Rewash')).toBeVisible()
  await expect(page.getByText('Doctor Uncle')).toBeHidden()

  // Landline numbers get Call but no WhatsApp
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await page.getByRole('button', { name: 'All locations' }).click()
  await expect(page.locator('a[href="tel:01141401216"]')).toBeVisible()
  await expect(page.locator('a[href^="https://wa.me/011"]')).toHaveCount(0)

  // Save one: it joins your partners and survives a reload
  await page.getByRole('button', { name: 'Save Kicks Rewash to my partners' }).click()
  await expect(page.getByRole('button', { name: 'Kicks Rewash is saved to your partners' })).toBeDisabled()
  await page.reload()
  await expect(page.getByText('Repair & refurbish', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Kicks Rewash is saved to your partners' })).toBeVisible()
})
