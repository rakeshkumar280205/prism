
import mongoose, { Schema, Model } from "mongoose";
import { getNextId } from "../utils/getNextId";

let issueModel: Model<any> | undefined;

export function getIssueModel(): Model<any> {
    if (!issueModel) {
        const issueSchema = new Schema(
            {
                id: { type: Number },
                title: { type: String, required: true },
                description: { type: String, required: true },
                category: { type: String, required: true },
                ward: { type: String, required: true },
                address: { type: String, required: true },
                image: { type: String },
                status: { type: String, required: true, default: "Pending" },
                createdBy: { type: Number, required: true },
                createdAt: { type: Date, default: Date.now },
                updatedAt: { type: Date, default: Date.now },
            },
            { strict: true }
        );
        issueSchema.pre("save", async function () {
            if (this.id === undefined) {
                this.id = await getNextId("issues");
            }
        });
        issueSchema.index({ id: 1 }, { unique: true });
        issueSchema.index({ createdBy: 1 });
        issueSchema.index({ status: 1 });
        issueSchema.index({ ward: 1 });
        issueSchema.index({ category: 1 });
        issueSchema.index({ ward: 1, category: 1 });
        issueSchema.index({ createdAt: 1 });
        issueSchema.index({ updatedAt: 1 });
        issueModel = mongoose.model("Issue", issueSchema);
    }
    return issueModel;
}
