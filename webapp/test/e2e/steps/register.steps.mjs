import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

// URL del backend para comprobaciones (si fuera necesario)
const API_URL = 'https://localhost:3000';

Given('the register page is open', async function () {
  const page = this.page;
  await page.goto('https://localhost:5173/register.html');
});

When('I enter {string} as the username and submit', async function (username) {
  const page = this.page;

  this.registeredUser = username + Date.now();
  console.log(`DEBUG-STEPS: Registrando a ${this.registeredUser}`);

  await page.fill('#register-name', this.registeredUser);
  await page.fill('#register-nickname', this.registeredUser + '_nick');
  await page.fill('#register-birth-date', '1990-01-01');
  await page.fill('#register-password', 'password123');
  await page.fill('#register-confirm-password', 'password123');

  // Clicamos en el elemento que acabas de encontrar
  // He añadido un pequeño wait por si la lista de países tarda en cargar
  const country = page.getByText('Español');
  await country.waitFor({ state: 'visible' });
  await country.click();
  
  // Enviamos
  await page.click('button[type="submit"]');
});

Then('I should see a welcome message containing {string}', async function (expectedText) {
  const page = this.page;

  // 1. Esperamos la redirección a la pantalla de selección de modo (la que vimos antes)
  await page.waitForURL('**/gamemode.html', { timeout: 15000 });

  // 2. Verificamos que el usuario se ha guardado en el localStorage
  // Como en la pantalla de "Selecciona tu modo" no sale el nombre por pantalla,
  // la prueba de éxito es que el token y el usuario existan en la sesión.
  const storedUser = await page.evaluate(() => localStorage.getItem('yovi_user'));
  
  console.log(`DEBUG-STEPS: En localStorage hay: ${storedUser}`);

  assert.strictEqual(
    storedUser, 
    this.registeredUser, 
    `El registro falló: el usuario guardado (${storedUser}) no es el que registramos (${this.registeredUser})`
  );

  // 3. Opcional: Si quieres verificar que el título de la pantalla de modo está ahí
  const title = await page.locator('.gamemode-title').innerText();
  assert.ok(title.includes('modo de juego'), "No se redirigió a la pantalla de selección de modo");
});