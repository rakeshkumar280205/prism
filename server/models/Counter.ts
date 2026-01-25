
import mongoose, { Schema, Document, Model } from "mongoose";

export interface CounterDocument extends Document {
    _id: string;
    seq: number;
}

let counterModel: Model<CounterDocument> | undefined;

export function getCounterModel(): Model<CounterDocument> {
    if (!counterModel) {
        const counterSchema = new Schema<CounterDocument>(
            {
                _id: { type: String, required: true },
                seq: { type: Number, required: true, default: 0 },
            },
            { timestamps: false, strict: true }
        );
        counterSchema.index({ _id: 1 }, { unique: true, sparse: false });
        counterModel = mongoose.model<CounterDocument>("Counter", counterSchema);
    }
    return counterModel;
}
