import { z } from "zod";

// ============================================
// FRONTEND-ONLY VALIDATION SCHEMAS
// ============================================

// User validation (for registration and profile updates)
export const insertUserSchema = z.object({
    mobile: z.string().min(1, "Mobile is required").regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    ward: z.string().optional().or(z.literal("")),
});

// Admin validation (for admin creation/updates)
export const insertAdminSchema = z.object({
    adminId: z.string().min(1, "Admin ID is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Name is required"),
    wardAssigned: z.string().optional().or(z.literal("")),
    role: z.enum(["ADMIN", "SUPER_ADMIN"]).optional(),
    isActive: z.boolean().optional(),
});

// Issue validation (for creating and updating issues)
export const insertIssueSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    category: z.string().min(1, "Category is required"),
    ward: z.string().refine(
        (ward) => {
            const wardNum = parseInt(ward, 10);
            return !isNaN(wardNum) && wardNum >= 1 && wardNum <= 200;
        },
        { message: "Ward must be a number between 1 and 200" }
    ),
    address: z.string().min(1, "Address is required"),
    image: z.any().optional(),
});

export const updateIssueSchema = insertIssueSchema.partial();

// ============================================
// FRONTEND-ONLY TYPE DEFINITIONS
// ============================================

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type UpdateIssue = z.infer<typeof updateIssueSchema>;

// API response types (inferred from backend, safe for frontend)
export type User = {
    id: number;
    mobile: string;
    name: string;
    email?: string;
    address?: string;
    ward?: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
};

export type Admin = {
    id: number;
    adminId: string;
    name: string;
    wardAssigned?: string;
    role: "ADMIN" | "SUPER_ADMIN";
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type Issue = {
    id: number;
    title: string;
    description: string;
    category: string;
    ward: string;
    address: string;
    image?: string;
    status: "Pending" | "In Progress" | "Resolved";
    createdBy: number;
    createdAt: Date;
    updatedAt: Date;
};

export type Vote = {
    id: number;
    issueId: number;
    userId: number;
    createdAt: Date;
};

export type AuditLog = {
    id: number;
    actorId: number;
    actorType: string;
    actorName: string;
    action: string;
    targetId?: number;
    targetType?: string;
    details?: string;
    createdAt: Date;
};

// Special types
export type IssueWithVoteCount = Issue & { voteCount: number; userHasVoted: boolean };

// Request types
export type LoginUserRequest = { mobile: string; password: string };
export type LoginAdminRequest = { adminId: string; password: string };
export type UpdateIssueStatusRequest = { status: string };
