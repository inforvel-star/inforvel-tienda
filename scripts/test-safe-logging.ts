import { safeErrorForLog, sanitizeAxiosErrorForLogging } from '../lib/safeLogging';

const config = {
  method: 'get',
  url: '/products?consumer_key=ck_QUERY_SECRET&consumer_secret=cs_QUERY_SECRET',
  auth: { username: 'ck_AUTH_SECRET', password: 'cs_AUTH_SECRET' },
  headers: { Authorization: 'Basic VERY_SECRET', Cookie: 'session=VERY_SECRET' },
  params: { access_token: 'VERY_SECRET', page: 1 },
};
const fake = {
  name: 'AxiosError',
  message: 'Request failed: Basic VERY_SECRET /products?consumer_secret=cs_MESSAGE_SECRET',
  code: 'EAI_AGAIN',
  config,
  request: { _header: 'Authorization: Basic VERY_SECRET' },
  response: {
    status: 503,
    request: { _header: 'Authorization: Basic VERY_SECRET' },
    headers: { 'set-cookie': 'session=VERY_SECRET' },
    config,
  },
};

const sanitized = sanitizeAxiosErrorForLogging(fake);
const serialized = JSON.stringify(sanitized);
for (const forbidden of ['ck_QUERY_SECRET', 'cs_QUERY_SECRET', 'ck_AUTH_SECRET', 'cs_AUTH_SECRET', 'cs_MESSAGE_SECRET', 'VERY_SECRET']) {
  if (serialized.includes(forbidden)) throw new Error(`Secret leaked after sanitization: ${forbidden}`);
}
const summary = safeErrorForLog(fake);
if (summary.status !== 503 || summary.code !== 'EAI_AGAIN' || summary.method !== 'GET') {
  throw new Error(`Unexpected safe summary: ${JSON.stringify(summary)}`);
}
console.log('OK: Axios credentials and sensitive headers are redacted');
