import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

Given('el usuario está en la pantalla de inicio', async function () {
    // Le decimos a Playwright que vaya a tu servidor local
    await this.page.goto('http://localhost:5173'); // 5173 es Vite
});

When('el usuario escribe el nombre {string}', async function (nickname) {
    // Playwright busca por placeholder e interactúa
    const input = await this.page.getByPlaceholder(/Your nickname/i);
    await input.fill(nickname);
});

When('pulsa el botón {string}', async function (botonTexto) {
    // Hacemos clic en el botón de login
    await this.page.getByRole('button', { name: botonTexto }).click();
});

Then('El tablero debería aparecer en pantalla', async function () {
    // Esperamos a que el texto "Jugador:" sea visible
    const h2 = await this.page.locator('h2', { hasText: /Jugador:/i });
    await h2.waitFor({ state: 'visible' });
    const content = await h2.textContent();
    expect(content).to.contain('Jugador:');
});

When('el usuario pulsa en la primera casilla vacía', async function () {
    // Buscamos los botones del tablero
    const firstCell = await this.page.locator('button.cell.empty').first();
    await firstCell.click();
});

Then('el sistema debería confirmar {string}', async function (mensaje) {
    // Verificamos que el texto de estado aparezca
    const statusText = await this.page.getByText(new RegExp(mensaje, "i"));
    await statusText.waitFor({ state: 'visible' });
    expect(statusText).to.not.be.null;
});