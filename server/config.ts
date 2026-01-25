// config.ts
// Centralized config for TDZ safety. Only primitive values, no imports.

export const NODE_ENV = process.env.NODE_ENV;
export const MONGO_URI = process.env.MONGO_URI;
export const SESSION_SECRET = process.env.SESSION_SECRET;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const FRONTEND_URL = process.env.FRONTEND_URL;
export const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
export const PORT = process.env.PORT;
