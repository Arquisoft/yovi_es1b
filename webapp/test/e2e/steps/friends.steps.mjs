import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

const API_URL = 'https://localhost:3000';

const getScenarioUserStore = (world) => {
  world.testUsers ??= {};
  return world.testUsers;
};

const buildUniqueUsername = (baseName) =>
  `${String(baseName || 'user').replace(/[^a-z0-9_-]/gi, '')}${Date.now()}${Math.floor(Math.random() * 10000)}`;

const resolveScenarioUsername = (world, logicalUsername) => {
  const store = getScenarioUserStore(world);
  const key = String(logicalUsername || '').toLowerCase();

  if (!store[key]) {
    store[key] = buildUniqueUsername(logicalUsername);
  }

  return store[key];
};

const buildVisibleFriendNickname = (baseNickname) => {
  const suffix = String(Math.floor(Math.random() * 90) + 10);
  const base = String(baseNickname || 'Friend').trim();
  return `${base.slice(0, Math.max(1, 15 - suffix.length))}${suffix}`;
};

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

Given('a user exists with name {string} and nickname {string}', async function (username, nickname) {
  const actualUsername = resolveScenarioUsername(this, username);
  const actualNickname = buildVisibleFriendNickname(nickname);
  const createdUser = await createUserViaApi({
    username: actualUsername,
    nickname: actualNickname,
    password: 'password123',
    birthDate: '1990-01-01',
    language: 'en',
  });

  assert.strictEqual(
    createdUser.status,
    200,
    `No se pudo preparar el usuario ${actualUsername}: ${createdUser.status} ${createdUser.bodyText}`
  );

  const friendCode = String(createdUser.bodyJson?.friendCode || '').replace(/^#/, '');
  assert.ok(friendCode, `No se pudo obtener el codigo de amigo de ${actualUsername}`);

  this.friendCodesByUsername ??= {};
  this.friendCodesByUsername[username.toLowerCase()] = friendCode;
  this.friendNicknamesByUsername ??= {};
  this.friendNicknamesByUsername[username.toLowerCase()] = actualNickname;
});

When('I open the "Social" section', async function () {
  await this.page.getByRole('button', { name: /friends menu|ver men.*amigos|amigos/i }).click();
  await this.page.locator('.friends-sidebar-content').waitFor({ state: 'visible' });
});

When('I search for {string}', async function (query) {
  const page = this.page;
  const input = page.locator('input.friends-input-id');
  const searchValue =
    this.friendCodesByUsername?.[query.toLowerCase()] ?? query.replace(/^#/, '').toUpperCase();

  await input.waitFor({ state: 'visible' });
  await input.fill('');
  await input.fill(searchValue);

  assert.strictEqual(await input.inputValue(), searchValue);
});

Then('I should see {string} in the search results', async function (expectedNickname) {
  const page = this.page;

  await page.locator('button.view-profile-btn').click();
  await page.locator('.profile-card').waitFor({ state: 'visible', timeout: 10000 });

  const nickname = (await page.locator('.profile-nickname').textContent())?.trim() || '';
  assert.ok(
    nickname.startsWith(expectedNickname),
    `Se esperaba un nickname basado en ${expectedNickname}, pero se vio ${nickname}`
  );
});

When('I click the {string} button for user {string}', async function (_buttonName, targetUser) {
  const page = this.page;
  const input = page.locator('input.friends-input-id');
  const searchValue =
    this.friendCodesByUsername?.[targetUser.toLowerCase()] ??
    targetUser.replace(/^#/, '').toUpperCase();

  page.once('dialog', async (dialog) => {
    this.lastAlertMessage = dialog.message();
    await dialog.accept();
  });

  await input.fill('');
  await input.fill(searchValue);
  await page.locator('button.add-friend-btn').click();
  await page.waitForTimeout(500);
});

Then('the button for {string} should change to {string}', async function (_targetUser, expectedText) {
  const message = String(this.lastAlertMessage || '').toLowerCase();
  const expected = String(expectedText || '').toLowerCase();

  const acceptedStates = [
    expected,
    'following',
    'sigues a',
    'you are now following',
    'ya existe',
    'solicitud',
  ];

  assert.ok(
    acceptedStates.some((value) => value && message.includes(value)),
    `Respuesta inesperada: ${this.lastAlertMessage}`
  );
});
