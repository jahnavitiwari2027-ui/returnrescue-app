import { expect, test, type Page } from '@playwright/test'

const shots = process.env.SHOT_DIR
const fresh = async (page: Page, as: 'owner' | 'warehouse') => {
  await page.goto(`/demo?as=${as}`)
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('returnrescue.demo.') && k !== 'returnrescue.demo.role') localStorage.removeItem(k)
  })
  await page.goto(`/demo?as=${as}`)
}

test('owner: products from Excel and CSV, one-tap SKU on a return, save a new SKU, approve a team member @mobile', async ({ page }) => {
  await fresh(page, 'owner')
  await page.goto('/demo/products')
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
  await expect(page.getByText('Nimbus Canvas Low-top Sneakers').first()).toBeVisible()

  // Excel import with a preview; the bad row is explained and skipped
  await page.getByRole('button', { name: 'Import CSV or Excel' }).click()
  await page.getByLabel('Choose a CSV or Excel file').setInputFiles('e2e/fixtures/products.xlsx')
  await expect(page.getByText('2 ready to import (2 new, 0 updates) · 1 with problems (skipped).')).toBeVisible()
  await expect(page.getByText('Row 4:')).toBeVisible()
  await page.getByRole('button', { name: 'Import 2 products' }).click()
  await expect(page.getByText(/Imported 2 products \(2 new, 0 updated\)\. 1 row was skipped\./)).toBeVisible()
  await expect(page.getByText('Excel test sneaker')).toBeVisible()
  // CSV import updates an existing SKU
  await page.getByRole('button', { name: 'Import CSV or Excel' }).click()
  await page.getByLabel('Choose a CSV or Excel file').setInputFiles({ name: 'p.csv', mimeType: 'text/csv', buffer: Buffer.from('SKU,Product name,Category,Selling price\nXL-KUR-001,Excel test kurta (renamed),Ethnic wear,1199\n') })
  await expect(page.getByText('1 ready to import (0 new, 1 update).')).toBeVisible()
  await page.getByRole('button', { name: 'Import 1 product' }).click()
  await expect(page.getByText('Excel test kurta (renamed)')).toBeVisible()

  // Log a return by picking the product: name, category and price fill in
  await page.goto('/demo/returns/new')
  await page.getByLabel('Search your products').fill('nimbus canvas low')
  await page.getByRole('option', { name: /Nimbus Canvas Low-top Sneakers/ }).click()
  await expect(page.getByLabel('Product name')).toHaveValue('Nimbus Canvas Low-top Sneakers')
  await expect(page.getByLabel('Category')).toHaveValue('Footwear')
  await expect(page.getByLabel('Original selling price')).toHaveValue('2999')
  await page.getByLabel('Order ID (optional)').fill('SAMPLE-ORD-4107')
  await expect(page.getByText(/already has a return logged/)).toBeVisible() // same order as a sample return
  await page.getByLabel('Order ID (optional)').fill('E2E-ORDER-1')
  await page.getByRole('radiogroup', { name: 'Platform' }).getByRole('radio', { name: /Meesho/ }).click()
  await page.getByLabel('Save these settings to SAMPLE-FTW-0311').check()
  if (shots) await page.screenshot({ path: `${shots}/pick-product-${test.info().project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Save return' }).click()
  await expect(page).toHaveURL(/\?new=1/)
  await expect(page.getByText(/Logged .* by You \(owner\) · Order E2E-ORDER-1/)).toBeVisible()

  // The product now remembers Meesho
  await page.goto('/demo/products')
  await expect(page.getByRole('button', { name: /Nimbus Canvas Low-top Sneakers/ })).toContainText('Meesho')

  // A new product saved straight from a return
  await page.goto('/demo/returns/new')
  await page.getByLabel('Product name').fill('E2E Linen Kurta')
  await page.getByLabel('Category').selectOption('Ethnic wear')
  await page.getByLabel('Original selling price').fill('1499')
  await page.getByLabel('SKU', { exact: true }).fill('e2e-kur-9')
  await page.getByLabel('Save to my product list with these settings').check()
  await page.getByRole('button', { name: 'Save return' }).click()
  await expect(page).toHaveURL(/\?new=1/)
  await page.goto('/demo/products')
  await expect(page.getByText('E2E Linen Kurta')).toBeVisible()

  // Team: code to share, approve a request
  await page.goto('/demo/team')
  await expect(page.getByLabel('Team code')).toHaveText('RR-DEMO0000')
  await expect(page.getByText('Arjun (sample)')).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Arjun (sample) can now log returns.')).toBeVisible()
  await expect(page.getByText('Fog Oversized Fleece Hoodie')).toBeVisible() // flagged sample
  if (shots) await page.screenshot({ path: `${shots}/team-${test.info().project.name}.png`, fullPage: true })
})

test('warehouse: logs and confirms but can’t change settings; flags reach ops @mobile', async ({ page }) => {
  await fresh(page, 'warehouse')
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  await expect(page.getByText(/as Ravi \(sample\)/).first()).toBeVisible()
  // Owner-only pages are closed
  await page.goto('/demo/rates')
  await expect(page.getByText('For the brand owner or ops')).toBeVisible()
  await page.goto('/demo/team')
  await expect(page.getByText('For the brand owner or ops')).toBeVisible()
  // Products are view-only
  await page.goto('/demo/products')
  await expect(page.getByRole('button', { name: 'Add product' })).toHaveCount(0)

  // A product not in the list: the return is flagged for ops automatically
  await page.goto('/demo/returns/new')
  await expect(page.getByText(/GST, fees and delivery are set by your ops team/)).toBeVisible()
  await expect(page.getByLabel('Set GST myself')).toHaveCount(0)
  await expect(page.getByText('Recovery estimates')).toHaveCount(0)
  await page.getByLabel('Product name').fill('Unknown denim jacket')
  await page.getByLabel('Category').selectOption('Topwear')
  await page.getByLabel('Original selling price').fill('2199')
  await page.getByRole('button', { name: 'Save return' }).click()
  await expect(page).toHaveURL(/\?new=1/)
  await expect(page.getByText(/Not in the product list/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0)

  // A graded sample: confirm is allowed, overriding isn't; flag it instead
  await page.goto('/demo/returns/sample-07')
  await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose another option' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Change grade' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Flag for ops' }).click()
  await page.getByLabel('What should ops check?').fill('Zip may be fine after cleaning — please check.')
  await page.getByRole('button', { name: 'Send to ops' }).click()
  await expect(page.getByText('Flagged for ops', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark resolved' })).toHaveCount(0)
  if (shots) await page.screenshot({ path: `${shots}/warehouse-${test.info().project.name}.png`, fullPage: true })

  // Ops sees it and resolves it
  await page.getByRole('radiogroup', { name: 'View the demo as' }).getByRole('radio', { name: 'Owner / ops' }).click()
  await page.goto('/demo/returns/sample-07')
  await page.getByRole('button', { name: 'Mark resolved' }).click()
  await expect(page.getByText('Flagged for ops', { exact: true })).toHaveCount(0)
})
