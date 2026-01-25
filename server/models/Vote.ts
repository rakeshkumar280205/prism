
import mongoose, { Schema, Model } from "mongoose";
import { getNextId } from "../utils/getNextId";

let voteModel: Model<any> | undefined;

export function getVoteModel(): Model<any> {
    if (!voteModel) {
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
        voteSchema.index({ id: 1 }, { unique: true });
        voteSchema.index({ issueId: 1, userId: 1 }, { unique: true });
        voteModel = mongoose.model("Vote", voteSchema);
    }
    return voteModel;
}
