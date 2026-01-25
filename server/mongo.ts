// TDZ audit: No module-scope mutable state. All state is function-scoped. TDZ-proof.
import mongoose from "mongoose";

export async function connectMongo() {
    // Fail fast: MONGO_URI is required for startup
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        const message = "FATAL: MONGO_URI environment variable is not set. Cannot start application.";
        console.error(message);
        process.exit(1);
    }

    try {
        const isProduction = process.env.NODE_ENV === "production";

        await mongoose.connect(mongoUri, {
            // Connection timeout: 10 seconds in both dev and production (5s too aggressive for production)
            serverSelectionTimeoutMS: 10000,
            // Disable automatic index creation in production for performance
            // IMPORTANT: In production, indexes must be created manually via migration scripts
            // or MongoDB Atlas UI to avoid blocking startup and potential production issues.
            // Development auto-creates indexes defined in models (User.ts, Issue.ts, etc.)
            autoIndex: !isProduction,
            // Connection pool size
            maxPoolSize: 10,
            minPoolSize: 5,
        });

        if (process.env.NODE_ENV !== "production") {
            console.log("MongoDB connected successfully");
        }
    } catch (error) {
        console.error("MongoDB connection failed:", error instanceof Error ? error.message : String(error));
        throw error; // Propagate error to caller
    }
}