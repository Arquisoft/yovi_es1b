import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

const API_URL = 'https://localhost:3000';

Given('the login page is open', async function () {
  const page = this.page;
  
  // 1. Aseguramos que el usuario existe en la DB antes de intentar entrar
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
    }).catch(() => {}); // Si ya existe, no pasa nada
  }, API_URL);

  await page.goto('https://localhost:5173/login.html'); 
});

When('I login with {string} and {string}', async function (username, password) {
  const page = this.page;
  // Usamos los IDs que tienes en tu LoginScreen
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
});

Then('I should be redirected to the game page and see {string}', async function (expectedUsername) {
  const page = this.page;
  
  // 1. Esperamos a que cargue la pantalla de la selección de modo (gamemode.html)
  await page.waitForURL('**/gamemode.html', { timeout: 15000 });

  // 2. Verificamos el título h1 según el HTML que me has pasado
  const title = await page.locator('.gamemode-title').innerText();
  assert.strictEqual(title, 'Selecciona tu modo de juego');

  // 3. Como en esa pantalla no sale el nombre "Alice" escrito, 
  // verificamos que el login ha funcionado comprobando el localStorage
  const storedUser = await page.evaluate(() => localStorage.getItem('yovi_user'));
  assert.strictEqual(storedUser, expectedUsername, `Se esperaba el usuario ${expectedUsername} en el almacenamiento`);
});