import { expect, test } from '@playwright/test'

// Chromium's fake camera feeds a test pattern, so the live-capture flow can run headless.
test.use({
  permissions: ['camera'],
  launchOptions: {
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--single-process', '--no-zygote', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
})

test('take photos with the camera on the add-return form @mobile', async ({ page }) => {
  await page.goto('/demo/returns/new')
  await page.getByRole('button', { name: 'Take photo' }).first().click()
  const cam = page.getByRole('dialog', { name: 'Take a photo' })
  await expect(cam).toBeVisible()
  const shutter = cam.getByRole('button', { name: 'Take photo' })
  await expect(shutter).toBeEnabled({ timeout: 15_000 })
  await shutter.click()
  await expect(cam.getByText('1 taken · 3 more allowed')).toBeVisible()
  await shutter.click()
  await expect(cam.getByText('2 taken · 2 more allowed')).toBeVisible()
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/camera-live.png` : undefined })
  await cam.getByRole('button', { name: 'Done' }).click()
  await expect(cam).toBeHidden()
  await expect(page.getByAltText('Return photo')).toHaveCount(2)
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/camera-form.png` : undefined })

  // The captured photos save with the return like uploaded ones.
  await page.getByLabel('Product name').fill('Camera test tee')
  await page.getByLabel('Original selling price').fill('999')
  await page.getByRole('button', { name: 'Save return' }).click()
  await expect(page.getByRole('heading', { name: 'Camera test tee' })).toBeVisible()
})
