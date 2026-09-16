type UnknownRecord = Record<string, unknown>;

const SENSITIVE_HEADER = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token)$/i;
const SENSITIVE_QUERY = /([?&](?:consumer_key|consumer_secret|access_token|token|api_key|secret|password)=)[^&]*/gi;
const AUTH_VALUE = /\b(Basic|Bearer)\s+[A-Za-z0-9._~+/=-]+/gi;

function redactString(value: string): string {
  return value
    .replace(SENSITIVE_QUERY, '$1[REDACTED]')
    .replace(AUTH_VALUE, '$1 [REDACTED]');
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function redactHeaders(headers: unknown): void {
  if (!isRecord(headers)) return;

  const deleteHeader = headers.delete;
  if (typeof deleteHeader === 'function') {
    for (const name of ['Authorization', 'Proxy-Authorization', 'Cookie', 'Set-Cookie', 'X-Api-Key', 'X-Auth-Token']) {
      deleteHeader.call(headers, name);
    }
  }

  for (const key of Object.keys(headers)) {
    if (SENSITIVE_HEADER.test(key)) headers[key] = '[REDACTED]';
  }
}

function sanitizeConfig(config: unknown): void {
  if (!isRecord(config)) return;
  delete config.auth;
  redactHeaders(config.headers);
  if (typeof config.url === 'string') config.url = redactString(config.url);
  if (isRecord(config.params)) {
    for (const key of Object.keys(config.params)) {
      if (/consumer_key|consumer_secret|access_token|token|api_key|secret|password/i.test(key)) {
        config.params[key] = '[REDACTED]';
      }
    }
  }
}

export function sanitizeAxiosErrorForLogging<T>(error: T): T {
  if (!isRecord(error)) return error;
  const record: UnknownRecord = error;
  if (typeof record.message === 'string') record.message = redactString(record.message);
  sanitizeConfig(record.config);
  delete record.request;

  if (isRecord(record.response)) {
    delete record.response.request;
    sanitizeConfig(record.response.config);
    redactHeaders(record.response.headers);
  }
  return error;
}

export function safeErrorForLog(error: unknown): UnknownRecord {
  const sanitized = sanitizeAxiosErrorForLogging(error);
  if (!isRecord(sanitized)) return { message: String(sanitized) };

  const config = isRecord(sanitized.config) ? sanitized.config : {};
  const response = isRecord(sanitized.response) ? sanitized.response : {};
  return {
    name: typeof sanitized.name === 'string' ? sanitized.name : 'Error',
    message: typeof sanitized.message === 'string' ? redactString(sanitized.message) : 'Unknown error',
    code: typeof sanitized.code === 'string' ? sanitized.code : undefined,
    status: typeof response.status === 'number' ? response.status : undefined,
    method: typeof config.method === 'string' ? config.method.toUpperCase() : undefined,
    url: typeof config.url === 'string' ? config.url : undefined,
  };
}
