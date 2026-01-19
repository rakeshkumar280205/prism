import mongoose, { Schema } from "mongoose";
import { getNextId } from "../utils/getNextId";

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

// Indexes
adminSchema.index({ id: 1 }, { unique: true });
adminSchema.index({ adminId: 1 }, { unique: true });

export const Admin = mongoose.model("Admin", adminSchema);
