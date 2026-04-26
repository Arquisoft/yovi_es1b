import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

const API_URL = 'https://localhost:3000';
const FRONTEND_URL = 'https://localhost:5173';

Given('the game page is open for user {string} with password {string}', async function (username, password) {
  const page = this.page;

  // ... (Pasos de login y navegación igual que antes) ...
  await page.goto(`${FRONTEND_URL}/login.html`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');

  // 2. Registro vía API (Esto es lo que master borró y necesitamos para que Alice exista)
  await page.evaluate(async ({ apiUrl, user, pass }) => {
    await fetch(`${apiUrl}/createuser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user, nickname: user + 'Nick',
        password: pass, birthDate: '2000-01-01', language: 'en'
      }),
    }).catch(() => {}); // Si ya existe, ignoramos el error 409
  }, { apiUrl: API_URL, user: username, pass: password });
  
  // ... login ...
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/gamemode.html', { timeout: 15000 });
  await page.click('#botModeBtn');
  await page.waitForURL('**/game.html', { timeout: 15000 });
  console.log("--- 🕵️‍♀️ Esperando a que las celdas se rendericen ---");

  // Esperamos a que aparezca al menos un botón de celda
  const firstCell = page.locator('button[aria-label*="Celda"]').first();
  await firstCell.waitFor({ state: 'visible', timeout: 30000 });
  console.log("✅ Celdas detectadas!");
});

// 2. EL CUANDO CLICO (Corregido para el label en español)
When('I click on the cell {string}', async function (cellIndex) {
  // Selector ultra-flexible para tu HTML: "Celda 0, vacia"
  const cell = this.page.locator(`button[aria-label*="Celda ${cellIndex}"]`).first();
  
  // Esperamos a que sea clicable (por si Rust está tardando)
  await cell.waitFor({ state: 'visible', timeout: 15000 });
  await cell.click({ force: true });
});

// 3. EL ENTONCES ESTÁ OCUPADA (Corregido para detectar el cambio de estado)
Then('the cell {string} should be occupied by a piece', async function (cellIndex) {
  const page = this.page;
  const cell = page.locator(`button[aria-label*="Celda ${cellIndex}"]`);

  // Esperamos a que la clase 'empty' DESAPAREZCA o que el label cambie
  await page.waitForFunction((idx) => {
    const btn = document.querySelector(`button[aria-label*="Celda ${idx}"]`);
    // Si ya no tiene la clase 'empty', es que hay una ficha
    return btn && !btn.classList.contains('empty');
  }, cellIndex, { timeout: 10000 });

  const classes = await cell.getAttribute('class');
  assert.ok(!classes.includes('empty'), `La celda ${cellIndex} sigue estando vacía.`);
});

Then('the turn timer should be visible', async function () {
  const page = this.page;
  const timerSelector = '[class*="turn-timer"]';

  await page.waitForSelector(timerSelector, { state: 'visible', timeout: 5000 });
  const isVisible = await page.locator(timerSelector).first().isVisible();
  
  assert.strictEqual(isVisible, true, 'El temporizador de turno debería ser visible');
});

Given('I have played a move on cell {string}', async function (cellIndex) {
  // Hacemos lo mismo aquí para el Given
  const cell = this.page.locator(`button[aria-label*="Celda ${cellIndex}"]`).first();
  await cell.waitFor({ state: 'visible', timeout: 10000 });
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