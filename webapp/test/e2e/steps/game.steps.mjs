import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

const API_URL = 'https://localhost:3000';
const FRONTEND_URL = 'https://localhost:5173';

Given('the game page is open for user {string} with password {string}', async function (username, password) {
  const page = this.page;

  // 1. Registro previo via API
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
    }).catch(() => {}); 
  }, { apiUrl: API_URL, user: username, pass: password });

  // 2. Login manual
  await page.goto(`${FRONTEND_URL}/login.html`);
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');

  // --- SOLUCIÓN AL 401: Esperar a que el Token se guarde ---
  await page.waitForFunction(() => {
    return localStorage.getItem('token') !== null || localStorage.getItem('yovi_user') !== null;
  }, { timeout: 10000 });

  // 3. PASO CLAVE: Pantalla de selección de modo
  await page.waitForURL('**/gamemode.html', { timeout: 15000 });
  
  // Hacemos clic en el botón con id "botModeBtn" (Jugar contra IA)
  const aiBtn = page.locator('#botModeBtn');
  await aiBtn.waitFor({ state: 'visible' });
  await aiBtn.click();

  // 4. Ahora sí, esperamos al tablero real
  await page.waitForURL('**/game.html', { timeout: 15000 });
  
  // Esperamos a que la estructura del juego sea visible
  // He subido el timeout por si el servidor de Rust tarda en responder
  await page.locator('.game-board, [aria-label*="celda"]').first().waitFor({ 
    state: 'visible', 
    timeout: 20000 
  });
});

When('I click on the cell {string}', async function (cellIndex) {
  const page = this.page;
  const cell = page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  await cell.waitFor({ state: 'visible' });
  await cell.click({ force: true }); // force: true por si el video de fondo "tapa" el clic
});

Then('the cell {string} should be occupied by a piece', async function (cellIndex) {
  const page = this.page;
  // Esperamos a que el texto cambie de '.' a 'B' o 'R'
  await page.waitForFunction((idx) => {
    const btn = document.querySelector(`button[aria-label*="celda ${idx}" i]`);
    const text = btn ? btn.innerText.trim() : '';
    return text === 'B' || text === 'R';
  }, cellIndex, { timeout: 5000 });

  const cell = page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  const content = (await cell.innerText()).trim();
  assert.ok(['B', 'R'].includes(content), `Fallo: la celda tiene "${content}"`);
});

Then('the turn timer should be visible', async function () {
  const timerSelector = '[class*="turn-timer"]';
  await this.page.waitForSelector(timerSelector, { state: 'visible', timeout: 10000 });
  const isVisible = await this.page.locator(timerSelector).first().isVisible();
  assert.strictEqual(isVisible, true, 'El temporizador no se ve');
});

Given('I have played a move on cell {string}', async function (cellIndex) {
  const cell = this.page.getByRole('button', { name: new RegExp(`celda ${cellIndex}`, 'i') });
  await cell.click({ force: true });
});

When('I click the button to {string}', async function (title) {
  // Buscamos por el atributo 'title' (Reiniciar partida / Terminar partida)
  const btn = this.page.locator(`button[title*="${title}" i]`).first();
  await btn.click({ force: true });
});

Then('all cells on the board should be empty', async function () {
  const page = this.page;
  const cells = page.locator('button[aria-label*="celda" i]');
  const count = await cells.count();
  
  for (let i = 0; i < count; i++) {
    const text = (await cells.nth(i).innerText()).trim();
    // Vacío puede ser nada o un punto
    assert.ok(text === '' || text === '.', `Celda ${i} no vacía: "${text}"`);
  }
});

When('I change the difficulty to {string}', async function (difficulty) {
  // Abrir el menú de dificultad
  await this.page.getByRole('button', { name: /dificultad/i }).click();
  
  const diffMap = { 'Hard': 'Difícil', 'Medium': 'Medio', 'Easy': 'Fácil' };
  const textoReal = diffMap[difficulty] || difficulty;

  await this.page.getByText(textoReal, { exact: true }).click();
});

Then('the game should reflect the {string} difficulty setting', async function (expected) {
  const diffButton = this.page.getByRole('button', { name: /dificultad/i });
  await this.page.waitForTimeout(500); // Pequeño margen para el cambio de estado
  
  const buttonText = await diffButton.innerText();
  const translations = { 'Hard': 'Difícil', 'Medium': 'Medio', 'Easy': 'Fácil' };
  const expectedTranslated = translations[expected] || expected;

  assert.ok(buttonText.includes(expectedTranslated), `Esperaba ${expectedTranslated}, hay ${buttonText}`);
});