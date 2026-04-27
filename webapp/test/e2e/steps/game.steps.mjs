import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

const API_URL = 'https://localhost:3000';
const FRONTEND_URL = 'https://localhost:5173';

const getScenarioUserStore = (world) => {
  world.testUsers ??= {};
  return world.testUsers;
};

const buildUniqueUsername = (baseName) =>
  `${String(baseName || 'user').replace(/[^a-z0-9_-]/gi, '')}${Date.now()}${Math.floor(Math.random() * 10000)}`;

const buildNickname = (username) => `P${String(username || 'user').slice(-14)}`;

const resolveScenarioUsername = (world, logicalUsername) => {
  const store = getScenarioUserStore(world);
  const key = String(logicalUsername || '').toLowerCase();

  if (!store[key]) {
    store[key] = buildUniqueUsername(logicalUsername);
  }

  return store[key];
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const difficultyLabels = {
  Easy: ['Easy', 'Fácil', 'Facil'],
  Medium: ['Medium', 'Medio'],
  Hard: ['Hard', 'Difícil', 'Dificil'],
};

const buildExactLabelPattern = (labels) =>
  new RegExp(`^(${labels.map((label) => escapeRegExp(label)).join('|')})$`, 'i');

const createUserViaApi = async ({ username, nickname, password, birthDate, language }) => {
  const response = await fetch(`${API_URL}/createuser`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, nickname, password, birthDate, language }),
  });

  const bodyText = await response.text();
  let bodyJson = null;

  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = null;
  }

  return { status: response.status, bodyText, bodyJson };
};

Given('the game page is open for user {string} with password {string}', async function (username, password) {
  const page = this.page;
  const actualUsername = resolveScenarioUsername(this, username);
  const actualNickname = buildNickname(actualUsername);

  const createdUser = await createUserViaApi({
    username: actualUsername,
    nickname: actualNickname,
    password,
    birthDate: '2000-01-01',
    language: 'en',
  });

  assert.ok(
    createdUser.status === 200 || createdUser.status === 409,
    `No se pudo preparar el usuario ${actualUsername}: ${createdUser.status} ${createdUser.bodyText}`
  );

  await page.goto(`${FRONTEND_URL}/login.html`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.fill('#login-username', actualUsername);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/gamemode.html', { timeout: 15000 });
  await page.click('#botModeBtn');
  await page.waitForURL('**/game.html', { timeout: 15000 });

  const firstCell = page.locator('button[aria-label*="Celda"]').first();
  await firstCell.waitFor({ state: 'visible', timeout: 60000 });
});

When('I click on the cell {string}', async function (cellIndex) {
  const cell = this.page.locator(`button[aria-label*="Celda ${cellIndex}"]`).first();
  await cell.waitFor({ state: 'visible', timeout: 15000 });
  await cell.click({ force: true });
});

Then('the cell {string} should be occupied by a piece', async function (cellIndex) {
  const page = this.page;
  const cell = page.locator(`button[aria-label*="Celda ${cellIndex}"]`).first();

  await page.waitForFunction((index) => {
    const button = document.querySelector(`button[aria-label*="Celda ${index}"]`);
    return button && !button.classList.contains('empty');
  }, cellIndex, { timeout: 10000 });

  const classes = await cell.getAttribute('class');
  assert.ok(!classes.includes('empty'), `La celda ${cellIndex} sigue estando vacia.`);
});

Then('the turn timer should be visible', async function () {
  const timerSelector = '[class*="turn-timer"]';

  await this.page.waitForSelector(timerSelector, { state: 'visible', timeout: 5000 });
  const isVisible = await this.page.locator(timerSelector).first().isVisible();

  assert.strictEqual(isVisible, true, 'El temporizador de turno deberia ser visible');
});

Given('I have played a move on cell {string}', async function (cellIndex) {
  const cell = this.page.locator(`button[aria-label*="Celda ${cellIndex}"]`).first();
  await cell.waitFor({ state: 'visible', timeout: 10000 });
  await cell.click({ force: true });
});

When('I click the button to {string}', async function (title) {
  const titleMap = {
    'Reiniciar partida': /restart game|reiniciar partida/i,
    'Terminar partida': /end game|terminar partida/i,
  };

  await this.page.getByTitle(titleMap[title] || new RegExp(title, 'i')).click({ force: true });
});

Then('all cells on the board should be empty', async function () {
  const page = this.page;

  await page.waitForFunction(() => {
    const cells = Array.from(document.querySelectorAll('button[aria-label*="Celda"]'));
    return (
      cells.length > 0 &&
      cells.every((cell) => cell.classList.contains('empty') && (cell.textContent || '').trim() === '')
    );
  }, { timeout: 15000 });

  const cells = page.locator('button[aria-label*="Celda"]');
  const count = await cells.count();

  for (let i = 0; i < count; i += 1) {
    const cell = cells.nth(i);
    const text = (await cell.innerText()).trim();
    const classes = await cell.getAttribute('class');

    assert.ok(classes?.includes('empty'), `La celda ${i} no tiene estado vacio.`);
    assert.strictEqual(text, '', `La celda ${i} no esta vacia: "${text}"`);
  }
});

When('I change the difficulty to {string}', async function (difficulty) {
  const labels = difficultyLabels[difficulty] || [difficulty];

  await this.page.getByRole('button', { name: /difficulty|dificultad/i }).click();
  await this.page.getByRole('button', { name: buildExactLabelPattern(labels) }).click();
});

Then('the game should reflect the {string} difficulty setting', async function (expected) {
  const labels = difficultyLabels[expected] || [expected];
  const buttonText = await this.page.getByRole('button', { name: /difficulty|dificultad/i }).innerText();
  const normalizedText = buttonText.toLowerCase();

  assert.ok(
    labels.some((label) => normalizedText.includes(label.toLowerCase())),
    `Se esperaba una de estas etiquetas: ${labels.join(', ')}. Texto actual: ${buttonText}`
  );
});
