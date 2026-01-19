import mongoose, { Schema, Document } from "mongoose";

export interface CounterDocument extends Document {
    _id: string;
    seq: number;
}

const counterSchema = new Schema<CounterDocument>(
    {
        _id: { type: String, required: true },
        seq: { type: Number, required: true, default: 0 },
    },
    { timestamps: false, strict: true }
);

// Ensure _id is the primary key and unique (MongoDB does this by default, but explicit for clarity)
// MongoDB serializes updates to the same document, preventing concurrent increments
counterSchema.index({ _id: 1 }, { unique: true, sparse: false });

export const Counter = mongoose.model<CounterDocument>("Counter", counterSchema);
