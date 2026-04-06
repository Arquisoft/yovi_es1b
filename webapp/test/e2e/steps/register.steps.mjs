import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  
  await page.goto('http://localhost:5173')
  
  // Usamos el ID real que detectamos en el HTML: #login-username
  await page.waitForSelector('#login-username', { state: 'visible', timeout: 10000 })
})

When('I enter {string} as the username and submit', async function (username) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  // 1. Rellenamos el campo de usuario con el ID correcto
  await page.fill('#login-username', username)
  
  // 2. IMPORTANTE: Tu HTML tiene un campo de password obligatorio (#login-password).
  // Si no lo rellenas, el formulario no se enviará. 
  // He puesto una clave genérica, ajústala si tu feature tiene un paso para esto.
  await page.fill('#login-password', 'password123')
  
  // 3. Hacemos clic específicamente en el botón de "Iniciar sesion" 
  // para evitar confundirlo con el botón "Volver"
  await page.click('button:has-text("Iniciar sesion")')
})

Then('I should see a welcome message containing {string}', async function (expected) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  
  // Nota crítica: Asegúrate de que tras el login aparezca un elemento 
  // con la clase .success-message, si no, este paso fallará por timeout.
  await page.waitForSelector('.success-message', { timeout: 10000 })
  const text = await page.textContent('.success-message')
  
  assert.ok(text && text.includes(expected), 
    `Se esperaba que el mensaje incluyera "${expected}", pero se obtuvo: "${text}"`)
})