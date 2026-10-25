import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const shots = process.env.E2E_SCREENSHOTS

test('public pages render, each with its own title, and link into the app', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every return deserves')
  await expect(page).toHaveTitle(/ReturnRescue/)
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toBeVisible()

  await page.goto('/features')
  await expect(page).toHaveTitle('Features — ReturnRescue')
  await expect(page.locator('#grades')).toContainText('Every return gets one of four grades')
  await expect(page.locator('#trust')).toContainText('No black boxes')

  await page.goto('/pricing')
  await expect(page).toHaveTitle('Pricing — ReturnRescue')
  await expect(page.getByText('₹499', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('₹999', { exact: false }).first()).toBeVisible()
  await page.getByRole('radio', { name: /Yearly/ }).click()
  await expect(page.getByText('₹5,388').first()).toBeVisible()
  await expect(page.getByText('₹10,788').first()).toBeVisible()
  await expect(page.getByText('Save ₹600 a year')).toBeVisible()
  await expect(page.getByText('Save ₹1,200 a year')).toBeVisible()
  await expect(page.getByText(/for 14 days/).first()).toBeVisible()

  await page.goto('/faq')
  await expect(page.getByRole('heading', { name: 'How does yearly billing work?' })).toBeAttached()
  await page.goto('/contact')
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
  // Old one-page links still work
  await page.goto('/#pricing')
  await expect(page).toHaveURL(/\/pricing$/)

  await page.goto('/')
  if (shots) {
    for (let y = 0; y < 9000; y += 600) await page.mouse.wheel(0, 600).then(() => page.waitForTimeout(120))
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${shots}/landing.png`, fullPage: true })
    await page.evaluate(() => window.scrollTo(0, 0))
  }
  await page.getByRole('link', { name: 'See the demo' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByText('To inspect', { exact: true })).toBeVisible()
})

test('full demo journey: add, inspect, grade, decide, persist, search, edit, export, delete', async ({ page }) => {
  await page.goto('/demo')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // Dashboard is computed from the 10 seeded sample records
  await expect(page.getByText('To inspect', { exact: true })).toBeVisible()
  await expect(page.getByText(/All 10 returns/)).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/dashboard.png`, fullPage: true })

  // Add a return with validation errors first
  await page.goto('/demo/returns/new')
  await page.getByRole('button', { name: 'Save return' }).click()
  await expect(page.getByText('Enter the product name.')).toBeVisible()

  await page.getByLabel('Product name').fill('E2E Test Runner Shoe')
  await page.getByText('More details').click()
  await page.getByText('Recovery estimates').click()
  await page.getByLabel('SKU').fill('e2e-ftw-001')
  await page.getByLabel('Category').selectOption('Footwear')
  await page.getByLabel('Original selling price').fill('3000')
  await page.getByLabel('Return reason').selectOption('Changed mind')
  await page.getByLabel('Condition notes').fill('Brown mark on the left side, box intact.')
  await page.getByLabel('Fees & GST on the sale').fill('20')
  await page.getByLabel('Handling & shipping per order').fill('100')
  await page.getByLabel('Resale price', { exact: true }).fill('2800')
  await page.getByLabel('Resale price after repair').fill('2400')
  await page.getByLabel('Repair & repackaging cost').fill('200')
  await page.getByLabel('Liquidation price').fill('900')
  await page.getByLabel('Commission & bulk freight').fill('50')
  await page.getByLabel('Scrap value').fill('40')
  await page.getByLabel('Sorting & transport').fill('20')
  await page.getByLabel('Upload product photos').setInputFiles('e2e/fixtures/test-product.png')
  await expect(page.getByRole('img', { name: 'Return photo' })).toBeVisible()
  await page.getByRole('button', { name: 'Save return' }).click()

  await expect(page).toHaveURL(/\/demo\/returns\/[^/]+\?new=1/)
  await expect(page.getByRole('heading', { name: 'E2E Test Runner Shoe' })).toBeVisible()
  await expect(page.getByText('Footwear · ₹3,000')).toBeVisible()

  // AI inspection: with no API key configured the app must show an error, never a made-up result
  // In the demo, AI results require an account: the app offers the free trial instead.
  await expect(page.getByRole('link', { name: 'Start free trial' }).last()).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/inspection.png`, fullPage: true })
  await page.getByRole('button', { name: 'or grade it yourself' }).click()
  await page.getByRole('radio', { name: /Grade B/ }).click()
  await page.getByRole('checkbox', { name: 'Stain' }).check()
  await page.getByRole('button', { name: 'Save grade' }).click()

  // Graded → the best option is saved automatically: refurbish at 2400 - 480 - 200 - 100 = 1620
  await expect(page.getByText('Best option')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm' })).toHaveCount(0)
  await expect(page.getByText('Next steps')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Refurbish, then resell' })).toBeVisible()
  await expect(page.getByText('Repackage / refurbish').first()).toBeVisible()
  await expect(page.getByText('₹1,620').first()).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/verdict.png`, fullPage: true })

  // Choose another option: override requires a reason
  await page.getByRole('button', { name: 'Choose another option' }).click()
  await page.getByRole('radio', { name: /Liquidate/ }).click()
  await page.getByRole('button', { name: 'Save decision' }).click()
  await expect(page.getByText(/kept on the record/)).toBeVisible()
  await page.getByLabel('Why this option?').fill('Liquidator collecting a footwear lot this week.')
  await page.getByRole('button', { name: 'Save decision' }).click()
  await expect(page.getByText('Your choice')).toBeVisible()
  await expect(page.getByTestId('option')).toContainText('Liquidate')
  await expect(page.getByText('₹850').first()).toBeVisible() // bulk sale: 900 − 50, no per-order handling
  if (shots) await page.screenshot({ path: `${shots}/decision.png`, fullPage: true })

  // Next-steps pathway for the chosen route
  await expect(page.getByRole('heading', { name: 'Liquidate' })).toBeVisible()
  await expect(page.getByText('Who can help')).toBeVisible()
  await expect(page.getByText('IndiaLot')).toBeVisible()
  // Save a partner from the pathway
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.getByLabel('Name').fill('Test Liquidation Buyer')
  await page.getByLabel('Phone / WhatsApp').fill('9876543210')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('a[href="https://wa.me/919876543210"]')).toBeVisible()

  // Persists after a full reload
  await page.reload()
  await expect(page.getByText('Your choice')).toBeVisible()

  // Change the grade: the best option is picked again automatically
  await page.getByRole('button', { name: 'Change grade' }).click()
  await page.getByRole('radio', { name: /Grade C/ }).click()
  await page.getByRole('button', { name: 'Save grade' }).click()
  await expect(page.getByText('Best option')).toBeVisible()
  await expect(page.getByTestId('option')).toContainText('Liquidate')

  // Record realized proceeds → done
  await page.getByRole('button', { name: /Record the amount received/ }).click()
  await page.getByLabel(/Amount received/).fill('880')
  await page.getByRole('button', { name: 'Mark done' }).click()
  await expect(page.getByText(/₹30 above the estimate/)).toBeVisible()

  // The maths is one tap away
  await page.getByText('All options and the maths').click()
  await expect(page.getByText('Not allowed for Grade C.').first()).toBeVisible()

  // Inventory search, filter, export
  await page.goto('/demo/returns')
  await expect(page.getByText('Showing 11 of 11')).toBeVisible()
  await page.getByLabel('Search inventory').fill('e2e')
  await expect(page.getByText('Showing 1 of 11')).toBeVisible()
  await page.getByLabel('Search inventory').fill('')
  await page.getByRole('button', { name: /Filters/ }).click()
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

  // Partners page lists the saved partner
  await page.goto('/demo/partners')
  await expect(page.getByText('Test Liquidation Buyer')).toBeVisible()

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
  await expect(page.getByText('All options and the maths')).toBeVisible()
  if (shots) await page.screenshot({ path: `${shots}/mobile-detail.png`, fullPage: true })
})
