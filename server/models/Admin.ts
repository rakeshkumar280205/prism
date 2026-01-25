
import mongoose, { Schema, Model } from "mongoose";
import { getNextId } from "../utils/getNextId";

let adminModel: Model<any> | undefined;

export function getAdminModel(): Model<any> {
    if (!adminModel) {
        const adminSchema = new Schema(
            {
                id: { type: Number },
                adminId: { type: String, required: true },
                password: { type: String, required: true },
                name: { type: String, required: true },
                wardAssigned: { type: String },
                role: { type: String, required: true, default: "ADMIN" },
                isActive: { type: Boolean, default: true },
                createdBy: { type: Number },
                createdAt: { type: Date, default: Date.now },
                updatedAt: { type: Date, default: Date.now },
            },
            { strict: true }
        );
        adminSchema.pre("save", async function () {
            if (this.id === undefined) {
                this.id = await getNextId("admins");
            }
        });
        adminSchema.index({ id: 1 }, { unique: true });
        adminSchema.index({ adminId: 1 }, { unique: true });
        adminModel = mongoose.model("Admin", adminSchema);
    }
    return adminModel;
}
