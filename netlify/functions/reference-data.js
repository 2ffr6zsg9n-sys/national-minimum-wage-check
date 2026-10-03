const DEFAULT_API = 'https://1g0vserusc.execute-api.eu-west-2.amazonaws.com';
const reply = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'Method not allowed.' });
  const key = process.env.CARCULATOR_PASSKEY;
  if (!key) return reply(503, { error: 'Pay data access is not configured. Set CARCULATOR_PASSKEY in Netlify and redeploy.' });
  const base = (process.env.CARCULATOR_API_BASE_URL || DEFAULT_API).replace(/\/$/, '');
  try {
    const load = async endpoint => {
      const response = await fetch(`${base}/${endpoint}`, { headers: { 'x-quote-api-key': key }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Upstream unavailable');
      const body = await response.json();
      if (!Array.isArray(body.items) || !body.items.length) throw new Error('Invalid reference data');
      return body.items;
    };
    const [afc, nmw] = await Promise.all([load('agenda-for-change-pay-rates'), load('national-minimum-wage-rates')]);
    return reply(200, { afc, nmw });
  } catch {
    return reply(502, { error: 'Pay and minimum wage rates could not be loaded. Check the shared API connection and scheme passkey.' });
  }
};
