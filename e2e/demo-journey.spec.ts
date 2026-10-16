import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const shots = process.env.E2E_SCREENSHOTS

test('landing page renders and links into the app', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every return deserves')
  for (const id of ['how', 'features', 'pricing', 'faq', 'contact']) await expect(page.locator(`#${id}`)).toBeAttached()
  await expect(page.locator('#pricing')).toContainText('₹999')
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toBeVisible()
  if (shots) {
    for (let y = 0; y < 9000; y += 600) await page.mouse.wheel(0, 600).then(() => page.waitForTimeout(120))
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${shots}/landing.png`, fullPage: true })
    await page.evaluate(() => window.scrollTo(0, 0))
  }
  await page.getByRole('link', { name: /Try the live demo/ }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByText('Returned products')).toBeVisible()
})

test('full demo journey: add, inspect, grade, decide, persist, search, edit, export, delete', async ({ page }) => {
  await page.goto('/demo')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // Dashboard is computed from the 10 seeded sample records
  const kpi = page.locator('p', { hasText: 'Returned products' }).locator('..')
  await expect(kpi).toContainText('10')
  if (shots) await page.screenshot({ path: `${shots}/dashboard.png`, fullPage: true })

  // Add a return with validation errors first
  await page.goto('/demo/returns/new')
  await page.getByRole('button', { name: 'Save return' }).click()
  await expect(page.getByText('Enter the product name.')).toBeVisible()
  await expect(page.getByText('Enter the SKU.')).toBeVisible()

  await page.getByLabel('Product name').fill('E2E Test Runner Shoe')
  await page.getByLabel('SKU').fill('e2e-ftw-001')
  await page.getByLabel('Category').selectOption('Footwear')
  await page.getByLabel('Original selling price').fill('3000')
  await page.getByLabel('Return reason').selectOption('Changed mind')
  await page.getByLabel('Condition notes').fill('Brown mark on the left side, box intact.')
  await page.getByLabel('Channel / marketplace fee').fill('20')
  await page.getByLabel('Handling & outbound shipping').fill('100')
  await page.getByLabel('Expected resale price').fill('2800')
  await page.getByLabel('Resale price after refurbishment').fill('2400')
  await page.getByLabel('Repair / repackaging cost').fill('200')
  await page.getByLabel('Liquidation price').fill('900')
  await page.getByLabel('Liquidation fee').fill('50')
  await page.getByLabel('Recycling / salvage value').fill('40')
  await page.getByLabel('Recycling / disposal cost').fill('20')
  await page.getByLabel('Upload product photos').setInputFiles('e2e/fixtures/test-product.png')
  await expect(page.getByRole('img', { name: 'Return photo' })).toBeVisible()
  await page.getByRole('button', { name: 'Save return' }).click()

  await expect(page).toHaveURL(/\/demo\/returns\/[^/]+\?new=1/)
  await expect(page.getByRole('heading', { name: 'E2E Test Runner Shoe' })).toBeVisible()
  await expect(page.getByText('E2E-FTW-001')).toBeVisible()

  // AI inspection: with no API key configured the app must show an error, never a made-up result
  await page.getByRole('button', { name: 'Run AI inspection' }).click()
  const aiOutcome = page.getByText('AI inspection didn’t run').or(page.getByText('AI inspection result'))
  await expect(aiOutcome).toBeVisible({ timeout: 45_000 })
  const aiRan = await page.getByText('AI inspection result').isVisible()
  if (shots) await page.screenshot({ path: `${shots}/inspection.png`, fullPage: true })

  if (aiRan) {
    await page.getByRole('button', { name: 'Correct grade' }).click()
  } else {
    await expect(page.getByText('No result was generated')).toBeVisible()
    await page.getByRole('button', { name: 'Grade manually' }).click()
  }
  // Grade B with a stain recorded
  await page.getByRole('radio', { name: /Grade B/ }).click()
  await page.getByRole('checkbox', { name: 'Stain' }).check()
  if (aiRan) await page.getByLabel(/Reason for correction/).fill('Checked in hand: mark lifts with cleaning.')
  await page.getByRole('button', { name: 'Save grade' }).click()
  await expect(page.getByText(/Recorded grade: Grade B/)).toBeVisible()

  // Recovery comparison: Grade B → restock ineligible, refurbish recommended
  // refurbish = 2400 - 480 - 200 - 100 = 1620 ; liquidate = 900 - 50 - 100 = 750
  await expect(page.getByText('Not allowed for Grade B.')).toBeVisible()
  await expect(page.getByText(/Repackage \/ refurbish has the highest estimated net recovery among eligible routes \(₹1,620\)/)).toBeVisible()

  // Override to liquidation requires a reason
  await page.getByRole('radio', { name: /Liquidate/ }).click()
  await page.getByRole('button', { name: 'Save decision' }).click()
  await expect(page.getByText(/add a short reason for the record/)).toBeVisible()
  await page.getByLabel(/Reason for overriding/).fill('Liquidator collecting a footwear lot this week.')
  await page.getByRole('button', { name: 'Save decision' }).click()
  await expect(page.getByText(/Override of recommended repackage/)).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/decision.png`, fullPage: true })

  // Persists after a full reload
  await page.reload()
  await expect(page.getByText(/Override of recommended repackage/)).toBeVisible()
  await expect(page.getByText('Decision made').first()).toBeVisible()

  // Record realized proceeds → completed
  await page.getByLabel('Realized net proceeds').fill('780')
  await page.getByRole('button', { name: 'Mark completed' }).click()
  await expect(page.getByText(/vs estimate/)).toContainText('₹30')

  // Inventory search, filter, export
  await page.goto('/demo/returns')
  await expect(page.getByText('Showing 11 of 11')).toBeVisible()
  await page.getByLabel('Search inventory').fill('e2e')
  await expect(page.getByText('Showing 1 of 11')).toBeVisible()
  await page.getByLabel('Search inventory').fill('')
  await page.getByLabel('Filter by grade').selectOption('MANUAL_REVIEW')
  await expect(page.getByText('Showing 1 of 11')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])
  const csv = fs.readFileSync(await download.path(), 'utf8')
  expect(csv.split('\r\n')).toHaveLength(12)
  expect(csv).toContain('E2E-FTW-001')
  expect(csv).toContain('Liquidate')
  if (shots) await page.screenshot({ path: `${shots}/inventory.png`, fullPage: true })

  // Edit
  await page.getByRole('link', { name: 'Edit E2E Test Runner Shoe' }).first().click()
  await page.getByLabel('Product name').fill('E2E Test Runner Shoe v2')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'E2E Test Runner Shoe v2' })).toBeVisible()

  // Insights computed from records
  await page.goto('/demo/insights')
  await expect(page.getByText(/Footwear has the most returns/)).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/insights.png`, fullPage: true })

  // Delete
  await page.goto('/demo/returns')
  await page.getByRole('button', { name: 'Delete E2E Test Runner Shoe v2' }).first().click()
  await page.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByText('Showing 10 of 10')).toBeVisible()
})

test('mobile layout works @mobile', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/mobile-landing.png`, fullPage: false })
  await page.goto('/demo')
  await expect(page.getByRole('navigation', { name: 'Workspace' }).last()).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/mobile-dashboard.png`, fullPage: true })
  await page.goto('/demo/returns/sample-02')
  await expect(page.getByText('Recovery value comparison')).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/mobile-detail.png`, fullPage: true })
})
