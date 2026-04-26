import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

const API_URL = 'https://localhost:3000';
const FRONTEND_URL = 'https://localhost:5173'; // El Nginx que configuramos

Given('the game page is open for user {string} with password {string}', async function (username, password) {
  const page = this.page;

  // 1. Registro previo via API para asegurar que el usuario existe
  await page.evaluate(async ({ apiUrl, user, pass }) => {
    await fetch(`${apiUrl}/createuser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user,
        nickname: user + 'Nick',
        password: pass,
        birthDate: '2000-01-01',
        language: 'en'
      }),
    });
  }, { apiUrl: API_URL, user: username, pass: password });

  // 2. Login manual para llegar a la pantalla de juego
  await page.goto(`${FRONTEND_URL}/login.html`);
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');

  // 3. Esperar a estar en el tablero
  await page.waitForURL('**/game.html');
});

When('I click on the cell {string}', async function (cellIndex) {
  const page = this.page;
  // Usamos el rol que definiste en Vitest: "celda X"
  const cell = page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  await cell.click();
});

Then('the cell {string} should be occupied by a piece', async function (cellIndex) {
  const page = this.page;
  const cell = page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  
  // Verificamos que el texto sea 'B' o 'R' (no esté vacío '.')
  const content = await cell.innerText();
  assert.ok(['B', 'R'].includes(content), `La celda ${cellIndex} debería estar ocupada. Encontrado: ${content}`);
});

Then('the turn timer should be visible', async function () {
  const page = this.page;
  // 1. Esperamos a que el selector esté en el DOM y sea visible
  const timerSelector = '[class*="turn-timer"]';

  await page.waitForSelector(timerSelector, { state: 'visible', timeout: 5000 });

  // 2. Comprobamos con el assert básico que ya tienes
  const timer = page.locator(timerSelector).first();
  const isVisible = await timer.isVisible();
  
  assert.strictEqual(isVisible, true, 'El temporizador de turno debería ser visible tras el movimiento');
});

Given('I have played a move on cell {string}', async function (cellIndex) {
  const cell = this.page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  await cell.click();
});

When('I click the button to {string}', async function (title) {
  // Buscamos por el title: "Reiniciar partida" o "Terminar partida"
  await this.page.getByTitle(new RegExp(title, 'i')).click();
});

Then('all cells on the board should be empty', async function () {
  const page = this.page;
  // Obtenemos todas las celdas (ajusta el selector si es necesario)
  const cells = page.locator('.game-cell');
  const count = await cells.count();
  
  for (let i = 0; i < count; i++) {
    const text = await cells.nth(i).innerText();
    assert.strictEqual(text, '', `La celda ${i} no está vacía tras el reinicio`);
  }
});

When('I change the difficulty to {string}', async function (difficulty) {
  // 1. Clic en el botón que abre el desplegable
  await this.page.getByRole('button', { name: /dificultad/i }).click();
  
  // 2. Mapeamos el nombre del feature al texto real de tu UI
  const diffMap = {
    'Hard': 'Difícil',
    'Medium': 'Medio',
    'Easy': 'Fácil'
  };
  const textoReal = diffMap[difficulty] || difficulty;

  // 3. Clic en la opción
  await this.page.getByText(textoReal, { exact: true }).click();
});

Then('the game should reflect the {string} difficulty setting', async function (expected) {
  const page = this.page;
  const diffButton = page.getByRole('button', { name: /dificultad/i });
  const buttonText = await diffButton.innerText();

  // Mapeamos lo que viene del .feature a lo que sale en pantalla
  const translations = {
    'Hard': 'Difícil',
    'Medium': 'Medio',
    'Easy': 'Fácil'
  };

  const expectedTranslated = translations[expected] || expected;

  assert.ok(
    buttonText.includes(expectedTranslated), 
    `La dificultad esperada era ${expectedTranslated}, pero se ve: ${buttonText}`
  );
});