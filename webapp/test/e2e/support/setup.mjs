import { setWorldConstructor, Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium } from 'playwright'

setDefaultTimeout(120_000)

class CustomWorld {
  browser = null
  page = null
}

setWorldConstructor(CustomWorld)

Before(async function () {
  // Allow turning off headless mode and enabling slow motion/devtools via env vars
  const headless = true
  const slowMo = 0
  const devtools = false

  this.browser = await chromium.launch({ headless, slowMo, devtools })

  const context = await this.browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 }
  });

  this.page = await context.newPage()

  // 1. CAPTURA LOS CONSOLE.LOG DEL NAVEGADOR
  this.page.on('console', msg => {
    console.log(`[BROWSER-LOG]: ${msg.text()}`);
  });

  // 2. CAPTURA ERRORES CRÍTICOS (JS que explota)
  this.page.on('pageerror', err => {
    console.log(`[BROWSER-ERR]: ${err.message}`);
  });

  // 3. CAPTURA PETICIONES DE RED FALLIDAS
  this.page.on('requestfailed', request => {
    console.log(`[BROWSER-NET-ERR]: ${request.method()} ${request.url()} - ${request.failure().errorText}`);
  });
})

After(async function () {
  if (this.page) await this.page.close()
  if (this.browser) await this.browser.close()
})
