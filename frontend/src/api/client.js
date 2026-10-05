// frontend/src/api/client.js

export class ApiError extends Error {
  constructor(code, message, details = null, statusCode = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

export async function apiRequest(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
  const token = localStorage.getItem('token');
  const correlationId = 'req_' + Math.random().toString(36).substring(2, 10);

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Correlation-Id': correlationId,
    ...headers
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers: defaultHeaders
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api/v1${endpoint}`, options);
  } catch (networkErr) {
    throw new ApiError(
      'NETWORK_FAILURE',
      'Unable to connect to the scoring server. Please verify network connectivity.',
      networkErr.message,
      0
    );
  }

  let json;
  try {
    json = await res.json();
  } catch (parseErr) {
    throw new ApiError(
      'INVALID_SERVER_RESPONSE',
      'The server returned an unparseable response.',
      parseErr.message,
      res.status
    );
  }

  if (!res.ok || json.success === false) {
    const errObj = json.error || {};
    throw new ApiError(
      errObj.code || 'UNKNOWN_ERROR',
      errObj.message || 'An unexpected error occurred.',
      errObj.details || null,
      res.status
    );
  }

  return json.data;
}
