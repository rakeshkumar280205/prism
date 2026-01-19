import mongoose, { Schema } from "mongoose";
import { getNextId } from "../utils/getNextId";

const voteSchema = new Schema(
    {
        id: { type: Number },
        issueId: { type: Number, required: true },
        userId: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { strict: true }
);

voteSchema.pre("save", async function () {
    if (this.id === undefined) {
        this.id = await getNextId("votes");
    }
});

// Indexes
voteSchema.index({ id: 1 }, { unique: true });
voteSchema.index({ issueId: 1, userId: 1 }, { unique: true });

export const Vote = mongoose.model("Vote", voteSchema);
