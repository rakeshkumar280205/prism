// Prefer env; fall back to current origin (avoids pointing to localhost in production)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

export function withBase(url: string): string {
    if (!url) return API_BASE_URL;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
