import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.goto('https://localhost:5173/register.html')
})

When('I enter {string} as the username and submit', async function (username) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  this.registeredUser = username + Date.now();
  console.log(`DEBUG-STEPS: Registrando a ${this.registeredUser}`);

  await page.fill('#register-name', this.registeredUser)
  await page.fill('#register-nickname', this.registeredUser + '_nick')
  await page.fill('#register-birth-date', '1990-01-01')
  await page.fill('#register-password', 'password123')
  await page.fill('#register-confirm-password', 'password123')

  await page.click('input[aria-label="Seleccionar Spain"]')
  await page.click('button[type="submit"].submit-button')
})

Then('I should see a welcome message containing {string}', async function (expected) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.waitForURL('**/game.html', { timeout: 10000 })

  const storedUser = await page.evaluate(() => localStorage.getItem('yovi_user'));
  
  console.log(`DEBUG-STEPS: En localStorage hay: ${storedUser}`);
  console.log(`DEBUG-STEPS: En el contexto del test (this) hay: ${this.registeredUser}`);

  assert.strictEqual(
    storedUser, 
    this.registeredUser, 
    `El usuario en localStorage (${storedUser}) no coincide con el registrado (${this.registeredUser})`
  );
})
