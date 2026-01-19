export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

export function withBase(url: string): string {
    if (!url) return API_BASE_URL;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
