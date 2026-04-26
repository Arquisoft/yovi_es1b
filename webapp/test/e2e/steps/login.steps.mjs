import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

const API_URL = 'https://localhost:3000';

Given('the login page is open', async function () {
  const page = this.page;
  if (!page) throw new Error('Page not initialized');
  
  // 1. Antes de loguearnos, registramos al usuario en la DB para que exista
  // Lo hacemos mediante una petición directa a la API para ir más rápido
  await page.evaluate(async (apiUrl) => {
    await fetch(`${apiUrl}/createuser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Alice',
        nickname: 'AliceNick',
        password: 'password123',
        birthDate: '2000-01-01',
        language: 'Spain'
      }),
    });
  }, API_URL);

  // 2. Vamos a la página de login
  await page.goto('https://localhost:5173/login.html'); 
});

When('I login with {string} and {string}', async function (username, password) {
  const page = this.page;
  
  // Ajusta estos IDs según cómo los tengas en tu LoginScreen.tsx
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
});

Then('I should be redirected to the game page and see {string}', async function (expected) {
  const page = this.page;
  
  // 1. Esperamos la redirección
  await this.page.waitForURL('**/gamemode.html', { timeout: 15000 });

  // 2. Verificamos que el usuario está en el localStorage
  const title = await this.page.locator('h1, h2, .selection-title').innerText();
  assert.ok(title.includes('modo de juego'));
});