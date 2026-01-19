import multer from "multer";

// Memory-based file upload middleware for image ingestion
// Files are stored in memory (req.file.buffer) and NOT written to disk

// File size limit: 5 MB
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// File filter: accept images only
const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."));
    }
};

// Multer configuration with memory storage
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: FILE_SIZE_LIMIT,
    },
    fileFilter,
});
