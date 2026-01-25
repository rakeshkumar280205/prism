// TDZ audit: No module-scope mutable state captured by closures. 'initialized' is only mutated inside getCloudinary. TDZ-proof.
import { v2 as cloudinary } from "cloudinary";

let initialized = false;

export function getCloudinary() {
    if (!initialized) {
        console.log("[CLOUDINARY:INIT_CHECK] First time initialization");
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        console.log("[CLOUDINARY:ENV_CHECK] Environment variables", {
            hasCloudName: !!cloudName,
            hasApiKey: !!apiKey,
            hasApiSecret: !!apiSecret,
            nodeEnv: process.env.NODE_ENV
        });

        if (process.env.NODE_ENV === "production") {
            if (!cloudName || !apiKey || !apiSecret) {
                throw new Error(
                    "FATAL: Missing Cloudinary credentials. " +
                    "Required environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
                );
            }
        }

        console.log("[CLOUDINARY:CONFIGURING] Setting cloudinary config");
        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
        });

        initialized = true;
        console.log("[CLOUDINARY:INITIALIZED] Cloudinary initialization complete");
    }

    return cloudinary;
}
