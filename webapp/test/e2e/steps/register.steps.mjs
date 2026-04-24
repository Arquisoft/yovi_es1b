import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.goto('http://localhost:5173/register.html')
})

When('I enter {string} as the username and submit', async function (username) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.fill('#register-name', username)
  await page.fill('#register-nickname', username + '_nick')
  await page.fill('#register-birth-date', '1990-01-01')
  await page.fill('#register-password', 'password123')
  await page.fill('#register-confirm-password', 'password123')

  await page.click('input[aria-label="Seleccionar Spain"]')
  await page.click('button[type="submit"].submit-button')
})

Then('I should see a welcome message containing {string}', async function (expected) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('.success-message', { timeout: 5000 })
  const text = await page.textContent('.success-message')
  assert.ok(text && text.includes(expected), `Expected success message to include "${expected}", got: "${text}"`)
})
