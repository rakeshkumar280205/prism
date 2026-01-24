// Require explicit API base; avoid accidental calls to the frontend origin
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Warn in development if env var is missing, but don't crash at module load
if (!API_BASE_URL && typeof console !== "undefined") {
    console.warn(
        "⚠️ VITE_API_BASE_URL is not set. API calls will fail. " +
        "Set this environment variable in Vercel or your .env file."
    );
}

export { API_BASE_URL };

export function withBase(url: string): string {
    // Fallback to empty string if API_BASE_URL is undefined (runtime safety)
    const base = API_BASE_URL || "";
    if (!url) return base;
    if (/^https?:\/\//i.test(url)) return url;
    return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}
