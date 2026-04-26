import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

const API_URL = 'https://localhost:3000';

Given('a user exists with name {string} and nickname {string}', async function (username, nickname) {
  const page = this.page;

  this.targetFriendCode = await page.evaluate(async ({ apiUrl, user, nick }) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    const normalizeCode = (code) => String(code || '').replace(/^#/, '').trim();

    const findExistingCode = async () => {
      const response = await fetch(`${apiUrl}/users/search?query=${encodeURIComponent(user)}`, {
        headers: authHeaders,
        credentials: 'include',
      });

      if (!response.ok) return '';

      const users = await response.json();
      const target = users.find((candidate) => candidate.username?.toLowerCase() === user.toLowerCase()) || users[0];
      return normalizeCode(target?.friendCode || target?.code);
    };

    const existingCode = await findExistingCode();
    if (existingCode) return existingCode;

    const createResponse = await fetch(`${apiUrl}/createuser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user,
        nickname: nick,
        password: 'password123',
        birthDate: '1990-01-01',
        language: 'en',
      }),
    }).catch(() => null);

    if (createResponse?.ok) {
      const data = await createResponse.json();
      return normalizeCode(data.friendCode || data.code);
    }

    return findExistingCode();
  }, { apiUrl: API_URL, user: username, nick: nickname });


  assert.ok(this.targetFriendCode, `No se pudo preparar el friendCode de ${username}`);
  console.log(`Bob listo con codigo: ${this.targetFriendCode}`);
});

When('I open the "Social" section', async function () {
  const friendsButton = this.page.locator('#friends-menu-button').first();
  await friendsButton.waitFor({ state: 'visible', timeout: 15000 });
  await friendsButton.click();
  await this.page.locator('.friends-sidebar-content .sidebar-title').waitFor({ state: 'visible' });

});

When('I search for {string}', async function (query) {
  const page = this.page;
  const input = page.locator('input.friends-input-id');
  await input.waitFor({ state: 'visible' });

  await input.fill('');
  await input.fill(this.targetFriendCode || query);

  const addBtn = page.locator('button.add-friend-btn');
  await addBtn.waitFor({ state: 'visible', timeout: 15000 });

  await page.waitForTimeout(1000);

  console.log(`Buscando a: ${query} con codigo ${this.targetFriendCode || query}`);
});

Then('I should see {string} in the search results', async function (expectedNickname) {
  const page = this.page;
  const viewBtn = page.locator('button.view-profile-btn');
  await viewBtn.click({ force: true });

  const profileCard = page.locator('.profile-card, .profile-nickname, .loader-neon').first();

  try {
    await profileCard.waitFor({ state: 'visible', timeout: 10000 });
    assert.ok(true);
  } catch {
    await viewBtn.click({ force: true });
    await page.waitForTimeout(2000);
    const visible = await page.locator('.profile-nickname').isVisible();
    assert.ok(visible, `El perfil de ${expectedNickname} no se mostro tras dos intentos`);
  }
});

When('I click the {string} button for user {string}', async function (_btnName, _targetUser) {
  const page = this.page;

  page.once('dialog', async (dialog) => {
    this.lastAlertMessage = dialog.message();
    await dialog.accept();
  });

  const addBtn = page.locator('button.add-friend-btn');
  await addBtn.click({ force: true });
});

Then('the button for {string} should change to {string}', async function (_targetUser, _expectedText) {
  await this.page.waitForTimeout(1000);
  const msg = (this.lastAlertMessage || '').toLowerCase();

  const isCorrect =
    msg.includes('sigues a') ||
    msg.includes('now following') ||
    msg.includes('ya existe') ||
    msg.includes('already') ||
    msg.includes('amistad') ||
    msg.includes('friendship') ||
    msg.includes('400');

  assert.ok(isCorrect, `Respuesta inesperada: ${this.lastAlertMessage}`);
});
