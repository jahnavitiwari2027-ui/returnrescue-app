import { expect, test } from '@playwright/test'

const shots = process.env.SHOT_DIR

test('a photo that isn’t clothing, footwear or a bag is refused, with a way to contact support @mobile', async ({ page }) => {
  await page.goto('/demo/returns')
  await page.waitForFunction(() => !!localStorage.getItem('returnrescue.demo.v1'))
  // Stand-in for an AI result on a medicine photo filed as footwear (the demo can't call the AI).
  await page.evaluate(() => {
    const key = 'returnrescue.demo.v1'
    const store = JSON.parse(localStorage.getItem(key)!)
    const item = store.items.find((i: { id: string }) => i.id === 'sample-03')
    item.ai_inspection = {
      model: 'test', created_at: new Date().toISOString(), image_count: 1, image_quality: 'good', product_match: 'mismatch',
      summary: 'These photos don’t look like clothing, footwear or a bag — they look like a strip of tablets. ReturnRescue only inspects apparel, footwear and accessories, so this item wasn’t graded or priced.',
      defects: [], proposed_grade: 'MANUAL_REVIEW', grade_rationale: 'Not an item ReturnRescue inspects, so no grade was given.', confidence: 'high',
      limitations: ['ReturnRescue only inspects clothing, footwear, bags and fashion accessories.'], recommended_physical_checks: ['Check the photos.'],
      eligible_routes: [], item_kind: 'other', item_seen: 'a strip of tablets', out_of_scope: true, guardrail_notes: [],
    }
    localStorage.setItem(key, JSON.stringify(store))
  })
  await page.goto('/demo/returns/sample-03')
  await expect(page.getByText('Not something ReturnRescue can inspect')).toBeVisible()
  await expect(page.getByText(/look like a strip of tablets/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm' })).toHaveCount(0)
  if (shots) await page.screenshot({ path: `${shots}/refused-${test.info().project.name}.png`, fullPage: true })

  await page.getByRole('link', { name: 'Contact support' }).first().click()
  await expect(page).toHaveURL(/\/contact\?topic=ai_result&ref=sample-03/)
  await expect(page.getByLabel('Topic')).toHaveValue('An AI result looks wrong')
  await expect(page.getByLabel('Return reference')).toHaveValue('sample-03')
  await expect(page.getByLabel('How can we help?')).toHaveValue(/The item is actually:/)
  // The template alone isn't enough to send
  await page.getByLabel('Name').fill('Test')
  await page.getByLabel('Work email').fill('test@example.com')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Tell us a little more (10+ characters).')).toBeVisible()
})
