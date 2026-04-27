const PAYPAL_XP_AMOUNT = 1000;
const PAYPAL_CURRENCY = 'EUR';
const PAYPAL_PRICE = '1.00';

const getPayPalApiBase = () => {
  const override = String(process.env.PAYPAL_API_BASE || '').trim();
  if (override) return override.replace(/\/$/, '');

  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
};

const getCredentials = () => {
  const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    const err = new Error('Missing PayPal credentials');
    err.statusCode = 503;
    err.publicMessage = 'PayPal no esta configurado en el servidor.';
    throw err;
  }

  return { clientId, clientSecret };
};

const readJson = async (response) => {
  const text = await response.text().catch(() => '');
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_err) {
    return { raw: text };
  }
};

const assertPayPalOk = async (response, publicMessage) => {
  if (response.ok) return;

  const details = await readJson(response);
  const err = new Error(`PayPal request failed with status ${response.status}`);
  err.statusCode = 502;
  err.publicMessage = publicMessage;
  err.details = details;
  throw err;
};

const requestPayPalAccessToken = async () => {
  const { clientId, clientSecret } = getCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  await assertPayPalOk(response, 'No se pudo autenticar con PayPal.');
  const data = await readJson(response);

  if (!data.access_token) {
    const err = new Error('PayPal did not return an access token');
    err.statusCode = 502;
    err.publicMessage = 'PayPal no devolvio un token valido.';
    throw err;
  }

  return data.access_token;
};

const createPayPalOrder = async () => {
  const accessToken = await requestPayPalAccessToken();

  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: 'Purchase of 1,000 XP - GameY',
          amount: {
            currency_code: PAYPAL_CURRENCY,
            value: PAYPAL_PRICE,
          },
        },
      ],
    }),
  });

  await assertPayPalOk(response, 'No se pudo crear la orden de PayPal.');
  return readJson(response);
};

const capturePayPalOrder = async (orderId) => {
  const safeOrderId = String(orderId || '').trim();
  if (!safeOrderId) {
    const err = new Error('Missing PayPal order id');
    err.statusCode = 400;
    err.publicMessage = 'Falta el identificador de la orden de PayPal.';
    throw err;
  }

  const accessToken = await requestPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${encodeURIComponent(safeOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  await assertPayPalOk(response, 'No se pudo capturar la orden de PayPal.');
  return readJson(response);
};

module.exports = {
  PAYPAL_XP_AMOUNT,
  createPayPalOrder,
  capturePayPalOrder,
};
