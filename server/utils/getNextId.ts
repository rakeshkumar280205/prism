import { getCounterModel } from "../models/Counter";

/**
 * Get the next sequential ID for an entity (thread-safe, atomic at MongoDB level)
 * Uses findOneAndUpdate with $inc to atomically increment counter
 * All concurrent requests are serialized by MongoDB at the document level
 * This prevents race conditions and duplicate IDs during concurrent registrations
 * 
 * @param entity - The entity type (e.g., "users", "issues", "admins")
 * @returns The next sequential ID
 * @throws Error if counter operation fails
 */
export async function getNextId(entity: string): Promise<number> {
    try {
        // findOneAndUpdate with $inc is atomic at MongoDB level
        // MongoDB acquires a write lock on the document, so concurrent requests are serialized
        // This ensures no two requests can increment the counter simultaneously
        const Counter = getCounterModel();
        const counter = await Counter.findOneAndUpdate(
            { _id: entity },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, returnDocument: "after" }
        );

        if (!counter) {
            throw new Error(`Failed to generate counter for entity: ${entity}`);
        }

        return counter.seq;
    } catch (error: any) {
        const reason = error?.message ? `: ${error.message}` : "";
        throw new Error(`Failed to generate sequential ID for entity: ${entity}${reason}`);
    }
}
