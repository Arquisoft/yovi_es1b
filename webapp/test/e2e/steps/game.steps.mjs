import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

// Quitamos el "que" para que coincida con el log
Given('el usuario está en la pantalla de inicio', async function () {
    await this.page.goto('http://localhost:5173');
});

When('el usuario escribe el nombre {string}', async function (nickname) {
    const input = await this.page.getByPlaceholder(/Your nickname/i);
    await input.fill(nickname);
});

When('pulsa el botón {string}', async function (botonTexto) {
    await this.page.getByRole('button', { name: botonTexto }).click();
});

// Ponemos la "E" mayúscula para que coincida con tu log
Then('El tablero debería aparecer en pantalla', async function () {
    const h2 = await this.page.locator('h2', { hasText: /Jugador:/i });
    await h2.waitFor({ state: 'visible' });
    const content = await h2.textContent();
    expect(content).to.contain('Jugador:');
});

When('el usuario pulsa en la primera casilla vacía', async function () {
    const firstCell = await this.page.locator('button.cell.empty').first();
    await firstCell.click();
});

Then('el sistema debería confirmar {string}', async function (mensaje) {
    const statusText = await this.page.getByText(new RegExp(mensaje, "i"));
    await statusText.waitFor({ state: 'visible' });
    const isVisible = await statusText.isVisible();
    expect(isVisible).to.be.true;
});