import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  await page.goto('https://localhost:5173/register.html')
})

When('I enter {string} as the username and submit', async function (username) {
  const page = this.page;
  if (!page) throw new Error('Page not initialized');

  // 1. Generamos el nombre dinámico una sola vez
  const username_now = `Alice_${Date.now()}`;
  
  // 2. Limpieza de seguridad: nos aseguramos de que los campos estén vacíos 
  // y escribimos con un pequeño delay para que React no se pierda nada
  await page.click('#register-name');
  await page.fill('#register-name', ''); 
  await page.type('#register-name', username_now, { delay: 30 });
  
  await page.fill('#register-nickname', username_now + '_nick');
  await page.fill('#register-birth-date', '1990-01-01');
  await page.fill('#register-password', 'password123');
  await page.fill('#register-confirm-password', 'password123');

  // 3. Selección de país (Asegúrate de que el selector es exacto)
  // A veces es mejor buscar por texto si el aria-label falla
  await page.click('text=Spain'); 

  // 4. EL TRUCO FINAL: Esperar un segundo antes de dar al botón
  // Esto evita que la petición salga antes de que el estado de React se actualice
  await page.waitForTimeout(500);
  
  // Usamos Promise.all para capturar la respuesta del servidor
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/createuser') && response.status() === 201),
    page.click('button[type="submit"].submit-button')
  ]);
});

Then('I should see a welcome message containing {string}', async function (expected) {
  const page = this.page;

  // 1. Esperamos a que la URL contenga 'game.html' sin importar lo que haya antes
  await page.waitForURL(/.*game.html.*/, { timeout: 10000 });

  // 2. Verificamos el localStorage con un pequeño reintento automático
  const storedUser = await page.waitForFunction(() => localStorage.getItem('yovi_user'));
  const username = await storedUser.jsonValue();
  
  assert.ok(
    username && username.startsWith("Alice"), 
    `El usuario guardado "${username}" no empieza por Alice`
  );
});
