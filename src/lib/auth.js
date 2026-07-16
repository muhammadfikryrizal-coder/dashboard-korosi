export const DEMO_CREDENTIALS = {
  username: 'admin',
  password: 'pipeline2026',
};

export const DEMO_USER = {
  name: 'Admin',
  role: 'Operator',
  initial: 'A',
  username: DEMO_CREDENTIALS.username,
};

const STORAGE_KEY = 'pipelineguard_auth_session';

export function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.username || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function validateCredentials(username, password) {
  const u = String(username ?? '').trim();
  const p = String(password ?? '');
  if (u === DEMO_CREDENTIALS.username && p === DEMO_CREDENTIALS.password) {
    return { ...DEMO_USER };
  }
  return null;
}
