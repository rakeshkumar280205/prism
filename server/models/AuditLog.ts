
import mongoose, { Schema, Model } from "mongoose";
import { getNextId } from "../utils/getNextId";

let auditLogModel: Model<any> | undefined;

export function getAuditLogModel(): Model<any> {
    if (!auditLogModel) {
        const auditLogSchema = new Schema(
            {
                id: { type: Number },
                actorId: { type: Number, required: true },
                actorType: { type: String, required: true },
                actorName: { type: String, required: true },
                action: { type: String, required: true },
                targetId: { type: Number },
                targetType: { type: String },
                details: { type: String },
                createdAt: { type: Date, default: Date.now },
            },
            { strict: true }
        );
        auditLogSchema.pre("save", async function () {
            if (this.id === undefined) {
                this.id = await getNextId("auditLogs");
            }
        });
        auditLogSchema.index({ id: 1 }, { unique: true });
        auditLogSchema.index({ targetType: 1 });
        auditLogSchema.index({ targetId: 1 });
        auditLogSchema.index({ createdAt: 1 });
        auditLogModel = mongoose.model("AuditLog", auditLogSchema);
    }
    return auditLogModel;
}
