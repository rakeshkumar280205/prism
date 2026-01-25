
import mongoose, { Schema, Model } from "mongoose";
import { getNextId } from "../utils/getNextId";

let userModel: Model<any> | undefined;

export function getUserModel(): Model<any> {
    if (!userModel) {
        const userSchema = new Schema(
            {
                id: { type: Number },
                mobile: { type: String, required: true },
                password: { type: String, required: true },
                name: { type: String, required: true },
                email: { type: String },
                address: { type: String },
                ward: { type: String },
                role: { type: String, required: true, default: "USER" },
                createdAt: { type: Date, default: Date.now },
                updatedAt: { type: Date, default: Date.now },
            },
            { strict: true }
        );
        userSchema.pre("save", async function () {
            if (this.id === undefined) {
                this.id = await getNextId("users");
            }
        });
        userSchema.index({ id: 1 }, { unique: true });
        userSchema.index({ mobile: 1 });
        userModel = mongoose.model("User", userSchema);
    }
    return userModel;
}
