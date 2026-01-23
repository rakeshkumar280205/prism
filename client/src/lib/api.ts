// Require explicit API base; avoid accidental calls to the frontend origin
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not set");
}

export { API_BASE_URL };

export function withBase(url: string): string {
    if (!url) return API_BASE_URL;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
