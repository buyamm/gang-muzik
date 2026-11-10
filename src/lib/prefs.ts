/** localStorage an toàn: không bao giờ throw (chế độ ẩn danh, bị chặn...) */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function removePref(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
