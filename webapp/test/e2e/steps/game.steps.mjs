import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

const API_URL = 'https://localhost:3000';
const FRONTEND_URL = 'https://localhost:5173';

Given('the game page is open for user {string} with password {string}', async function (username, password) {
  const page = this.page;

  await page.goto(`${FRONTEND_URL}/login.html`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');

  await page.evaluate(async ({ apiUrl, user, pass }) => {
    await fetch(`${apiUrl}/createuser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user,
        nickname: `${user}Nick`,
        password: pass,
        birthDate: '2000-01-01',
        language: 'en',
      }),
    }).catch(() => {});
  }, { apiUrl: API_URL, user: username, pass: password });

  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/gamemode.html', { timeout: 15000 });
  await page.click('#botModeBtn');
  await page.waitForURL('**/game.html', { timeout: 15000 });

  console.log('Esperando a que las celdas se rendericen');
  const firstCell = page.locator('button[aria-label*="Celda"]').first();
  await firstCell.waitFor({ state: 'visible', timeout: 60000 });
  console.log('Celdas detectadas');
});

When('I click on the cell {string}', async function (cellIndex) {
  const cell = this.page.locator(`button[aria-label*="Celda ${cellIndex}"]`).first();

  await cell.waitFor({ state: 'visible', timeout: 15000 });
  await cell.click({ force: true });
});

Then('the cell {string} should be occupied by a piece', async function (cellIndex) {
  const page = this.page;
  const cell = page.locator(`button[aria-label*="Celda ${cellIndex}"]`);

  await page.waitForFunction((idx) => {
    const btn = document.querySelector(`button[aria-label*="Celda ${idx}"]`);
    return btn && !btn.classList.contains('empty');
  }, cellIndex, { timeout: 10000 });

  const classes = await cell.getAttribute('class');
  assert.ok(!classes.includes('empty'), `La celda ${cellIndex} sigue estando vacia.`);
});

Then('the turn timer should be visible', async function () {
  const page = this.page;
  const timerSelector = '[class*="turn-timer"]';

  await page.waitForSelector(timerSelector, { state: 'visible', timeout: 5000 });
  const isVisible = await page.locator(timerSelector).first().isVisible();

  assert.strictEqual(isVisible, true, 'El temporizador de turno deberia ser visible');
});

Given('I have played a move on cell {string}', async function (cellIndex) {
  const cell = this.page.locator(`button[aria-label*="Celda ${cellIndex}"]`).first();
  await cell.waitFor({ state: 'visible', timeout: 10000 });
  await cell.click({ force: true });
});

When('I click the button to {string}', async function (title) {
  if (/reiniciar|restart/i.test(title)) {
    const resetButton = this.page.locator('button.nav-btn-with-restart').first();
    await resetButton.waitFor({ state: 'visible', timeout: 15000 });
    await resetButton.click({ force: true });
    return;
  }

  await this.page.getByTitle(new RegExp(title, 'i')).click({ force: true });
});

Then('all cells on the board should be empty', async function () {
  const page = this.page;

  await page.waitForFunction(() => {
    const cells = Array.from(document.querySelectorAll('button[aria-label*="Celda"]'));
    return cells.length > 0 && cells.every((cell) => {
      const text = cell.textContent?.trim() || '';
      return text === '' || text === '.' || cell.classList.contains('empty');
    });
  }, null, { timeout: 15000 });

  const cells = page.locator('button[aria-label*="Celda"]');
  const count = await cells.count();

  for (let i = 0; i < count; i++) {
    const text = (await cells.nth(i).innerText()).trim();
    const classes = (await cells.nth(i).getAttribute('class')) || '';
    assert.ok(text === '' || text === '.' || classes.includes('empty'), `La celda ${i} no esta vacia: "${text}"`);
  }
});

When('I change the difficulty to {string}', async function (difficulty) {
  const difficultyButton = this.page.locator('.custom-dropdown-container .dropdown-trigger').nth(1);
  await difficultyButton.waitFor({ state: 'visible', timeout: 15000 });
  await difficultyButton.click();

  const optionIndex = { Easy: 0, Medium: 1, Hard: 2 }[difficulty] ?? 0;
  await this.page.locator('.dropdown-floating-list .dropdown-item').nth(optionIndex).click();
});

Then('the game should reflect the {string} difficulty setting', async function (expected) {
  const page = this.page;
  const diffButton = page.locator('.custom-dropdown-container .dropdown-trigger').nth(1);

  await page.waitForTimeout(500);
  const buttonText = await diffButton.innerText();
  const normalizedText = buttonText.normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').toLowerCase();

  const expectedWords = {
    Hard: ['hard', 'dificil'],
    Medium: ['medium', 'medio'],
    Easy: ['easy', 'facil'],
  }[expected] || [String(expected).toLowerCase()];

  assert.ok(
    expectedWords.some((word) => normalizedText.includes(word)),
    `Se esperaba ${expected}, pero se ve: ${buttonText}`,
  );
});
