// localStorage can be unavailable (private mode, blocked storage); the app works without it.
export function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not remembered then.
  }
}
