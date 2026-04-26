import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

const API_URL = 'https://localhost:3000';
const FRONTEND_URL = 'https://localhost:5173';

Given('the game page is open for user {string} with password {string}', async function (username, password) {
  const page = this.page;

  // PASO A: Primero cargamos la web (así el origen ya no es 'null' y evitamos CORS)
  await page.goto(`${FRONTEND_URL}/login.html`);

  // PASO B: Registramos al usuario (con el origen ya válido)
  await page.evaluate(async ({ apiUrl, user, pass }) => {
    await fetch(`${apiUrl}/createuser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user, nickname: user + 'Nick',
        password: pass, birthDate: '2000-01-01', language: 'en'
      }),
    }).catch(() => {}); 
  }, { apiUrl: API_URL, user: username, pass: password });

  // PASO C: Login
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');

  // PASO D: LA CLAVE. Esperamos a que el Token exista de verdad en el navegador
  // Esto evita que el juego intente pedir datos sin estar "identificado" (Error 401)
  await page.waitForFunction(() => {
    return localStorage.getItem('yovi_user') !== null;
  }, { timeout: 10000 });

  // PASO E: Seleccionamos el modo (tu nueva ventana)
  await page.waitForURL('**/gamemode.html', { timeout: 15000 });
  await page.click('#botModeBtn');

  // PASO F: Esperamos a que el tablero se pinte
  await page.waitForURL('**/game.html', { timeout: 15000 });
  await page.locator('.game-board, [aria-label*="celda"]').first().waitFor({ state: 'visible', timeout: 20000 });
});

When('I click on the cell {string}', async function (cellIndex) {
  const cell = this.page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  await cell.waitFor({ state: 'visible' });
  await cell.click({ force: true });
});

Then('the cell {string} should be occupied by a piece', async function (cellIndex) {
  const page = this.page;
  // Esperamos a que la ficha aparezca (B o R)
  await page.waitForFunction((idx) => {
    const btn = document.querySelector(`button[aria-label*="celda ${idx}" i]`);
    const text = btn ? btn.innerText.trim() : '';
    return text === 'B' || text === 'R';
  }, cellIndex, { timeout: 8000 });

  const cell = page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  const content = (await cell.innerText()).trim();
  assert.ok(['B', 'R'].includes(content), `La celda ${cellIndex} no tiene ficha. Hay: "${content}"`);
});

Then('the turn timer should be visible', async function () {
  const page = this.page;
  const timerSelector = '[class*="turn-timer"]';

  await page.waitForSelector(timerSelector, { state: 'visible', timeout: 5000 });
  const isVisible = await page.locator(timerSelector).first().isVisible();
  
  assert.strictEqual(isVisible, true, 'El temporizador de turno debería ser visible');
});

Given('I have played a move on cell {string}', async function (cellIndex) {
  const cell = this.page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  await cell.click({ force: true });
});

When('I click the button to {string}', async function (title) {
  // Buscamos por el atributo title
  await this.page.getByTitle(new RegExp(title, 'i')).click({ force: true });
});

Then('all cells on the board should be empty', async function () {
  const page = this.page;
  // Ajustamos el selector a lo que suele haber en el tablero
  const cells = page.locator('button[aria-label*="celda"]');
  const count = await cells.count();
  
  for (let i = 0; i < count; i++) {
    const text = (await cells.nth(i).innerText()).trim();
    // Aceptamos vacío o el punto de celda vacía
    assert.ok(text === '' || text === '.', `La celda ${i} no está vacía: "${text}"`);
  }
});

When('I change the difficulty to {string}', async function (difficulty) {
  await this.page.getByRole('button', { name: /dificultad/i }).click();
  
  const diffMap = { 'Hard': 'Difícil', 'Medium': 'Medio', 'Easy': 'Fácil' };
  const textoReal = diffMap[difficulty] || difficulty;

  await this.page.getByText(textoReal, { exact: true }).click();
});

Then('the game should reflect the {string} difficulty setting', async function (expected) {
  const page = this.page;
  const diffButton = page.getByRole('button', { name: /dificultad/i });
  
  // Damos un momento para que React actualice el estado del botón
  await page.waitForTimeout(500);
  const buttonText = await diffButton.innerText();

  const translations = { 'Hard': 'Difícil', 'Medium': 'Medio', 'Easy': 'Fácil' };
  const expectedTranslated = translations[expected] || expected;

  assert.ok(
    buttonText.includes(expectedTranslated), 
    `Se esperaba ${expectedTranslated}, pero se ve: ${buttonText}`
  );
});