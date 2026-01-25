// TDZ audit: No module-scope mutable state. All state is function-scoped. TDZ-proof.
import { getCloudinary } from "./cloudinary";
import streamifier from "streamifier";
import sharp from "sharp";
import type { UploadApiResponse } from "cloudinary";

/**
 * Upload options for Cloudinary
 */
interface UploadOptions {
    issueId: number;
}

/**
 * Result of a successful Cloudinary upload
 */
interface UploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
}

/**
 * Uploads an image buffer to Cloudinary with optimization and validation
 * Uses deterministic folder structure: issues/<issueId>/<timestamp>-image
 * 
 * @param buffer - Image buffer from Multer memory storage
 * @param options - Upload options (requires issueId)
 * @returns Upload result with url, publicId, dimensions, and format
 * @throws Error if upload fails, dimensions exceed limits, or issueId is missing
 */
export async function uploadToCloudinary(
    buffer: Buffer,
    options: UploadOptions
): Promise<UploadResult> {
    console.log("[UPLOAD:UTIL_START] uploadToCloudinary called", { issueId: options?.issueId, bufferSize: buffer?.length });
    // Validate issueId is provided
    if (!options || !options.issueId) {
        throw new Error("Invalid issue reference");
    }
    // Validate image dimensions before upload (defense-in-depth)
    try {
        const metadata = await sharp(buffer).metadata();
        const { width, height } = metadata;

        if (width && height && (width > 8000 || height > 8000)) {
            throw new Error("Image dimensions too large");
        }
    } catch (err) {
        if (err instanceof Error && err.message === "Image dimensions too large") {
            throw err;
        }
        // If sharp fails to parse, let Cloudinary handle it (will fail with proper error)
    }

    // Upload with 30-second timeout - pass uploadStream holder to timeout so it can abort
    let uploadStream: any = null;
    const uploadPromise = createUploadPromise(buffer, options, (stream) => { uploadStream = stream; });
    const timeoutPromise = createTimeoutPromise(() => uploadStream);

    console.log("[UPLOAD:PROMISE_RACE] Starting race between upload and timeout");
    const result = await Promise.race([uploadPromise, timeoutPromise]);
    console.log("[UPLOAD:PROMISE_RESOLVED] Promise race resolved successfully");
    return result;
}

/**
 * Create the Cloudinary upload promise
 */
function createUploadPromise(
    buffer: Buffer,
    options: UploadOptions,
    onStreamCreated?: (stream: any) => void
): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        console.log("[UPLOAD:CLOUDINARY_INIT] Getting cloudinary instance");
        const cloudinary = getCloudinary();
        console.log("[UPLOAD:CLOUDINARY_CONFIG_CHECK] Cloudinary configured");
        // Generate deterministic public ID: <timestamp>-image
        const timestamp = Date.now();
        const publicId = `${timestamp}-image`;

        // Deterministic folder structure: issues/<issueId>
        const folder = `issues/${options.issueId}`;

        // Cloudinary upload configuration with transformations
        const uploadOptions = {
            folder,
            public_id: publicId,
            resource_type: "image" as const,
            secure: true,
            // Image optimization transformations (applied at upload time)
            transformation: {
                width: 1280,
                height: 1280,
                crop: "limit",  // Never upscale, only downscale if needed
                quality: "auto:eco",
                fetch_format: "auto",
            },
        };

        // Create upload stream
        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error || !result) {
                    console.error("[UPLOAD:STREAM_ERROR] Upload stream error", {
                        error: error?.message,
                        hasResult: !!result,
                        httpCode: (error as any)?.http_code
                    });
                    // Detect Cloudinary service failures (5xx errors)
                    if (error && (error as any).http_code >= 500) {
                        console.error("Cloudinary service error:", error.message || "Unknown error");
                        reject(new Error("Image service unavailable"));
                        return;
                    }
                    reject(new Error("Image upload failed"));
                    return;
                }

                console.log("[UPLOAD:STREAM_SUCCESS] Upload stream completed", {
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height
                });
                // Return clean, typed result
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                });
            }
        );

        // Notify caller of stream for timeout abort handling
        if (onStreamCreated) {
            onStreamCreated(uploadStream);
        }

        // Pipe buffer to Cloudinary via stream
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

/**
 * Create a timeout promise that rejects after 30 seconds and aborts the stream
 */
function createTimeoutPromise(getUploadStream: () => any): Promise<UploadResult> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            // Destroy upload stream if it exists to free resources and abort upload
            const uploadStream = getUploadStream();
            if (uploadStream && typeof uploadStream.destroy === 'function') {
                try {
                    uploadStream.destroy();
                } catch (err) {
                    // Ignore errors during stream destruction
                }
            }
            reject(new Error("Image upload timeout"));
        }, 30000); // 30 second timeout
    });
}
