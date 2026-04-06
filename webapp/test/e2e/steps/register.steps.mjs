import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  

  await page.goto('http://localhost:5173') 
  
  await page.waitForSelector('#username', { state: 'visible', timeout: 10000 })
})

When('I enter {string} as the username and submit', async function (username) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  try {
    await page.waitForSelector('#username', { timeout: 5000 })
    await page.fill('#username', username)
    await page.click('.submit-button')
  } catch (error) {
    console.error("DEBUG: Fallo al encontrar #username. HTML de la página:");
    console.log(await page.content());
    throw error;
  }
})

Then('I should see a welcome message containing {string}', async function (expected) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  
  
  await page.waitForSelector('.success-message', { timeout: 10000 })
  const text = await page.textContent('.success-message')
  assert.ok(text && text.includes(expected), `Expected success message to include "${expected}", got: "${text}"`)
})