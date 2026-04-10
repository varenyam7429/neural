const BASE_URL = '/api/interview';

async function fetcher(endpoint, options = {}) {
  const res = await window.fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj.error || `API Error: ${res.status}`);
  }
  return res.json();
}

export function createSession(payload) {
  return fetcher('/start', { method: 'POST', body: JSON.stringify(payload) });
}

export function fetchSession(sessionId) {
  return fetcher(`/sessions/${sessionId}`);
}

export function submitAnswer(payload) {
  return fetcher('/answer', { method: 'POST', body: JSON.stringify(payload) });
}

export function endSession(sessionId) {
  return fetcher('/end', { method: 'POST', body: JSON.stringify({ sessionId }) });
}
