const TOKEN_KEY = "hormuz_jwt_token";
const memoryStore: Record<string, string> = {};

export function getToken() {
  try {
    return memoryStore[TOKEN_KEY] || window.name || "";
  } catch {
    return memoryStore[TOKEN_KEY] || "";
  }
}

export function setToken(token: string) {
  memoryStore[TOKEN_KEY] = token;
  try {
    window.name = token;
  } catch {}
}

export function clearToken() {
  delete memoryStore[TOKEN_KEY];
  try {
    window.name = "";
  } catch {}
}
