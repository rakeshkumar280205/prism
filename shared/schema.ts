import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// 1. Users Collection
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  mobile: varchar("mobile", { length: 15 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  address: text("address"),
  ward: text("ward"), // Users belong to a ward
  role: text("role").default("USER").notNull(), // Always USER for this table
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Admins Collection (Separate as requested)
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id", { length: 50 }).notNull().unique(), // Used for login
  password: text("password").notNull(),
  name: text("name").notNull(),
  wardAssigned: text("ward_assigned"), // Can be comma separated or single
  role: text("role").default("ADMIN").notNull(), // ADMIN or SUPER_ADMIN
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"), // Reference to Super Admin ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Issues Collection
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // Road, Drainage, etc.
  ward: text("ward").notNull(),
  address: text("address").notNull(),
  image: text("image"), // Filename
  status: text("status").default("Pending").notNull(), // Pending, In Progress, Resolved
  createdBy: integer("created_by").notNull(), // References users.id
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 4. Votes (To track which user voted on which issue)
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const issuesRelations = relations(issues, ({ one, many }) => ({
  author: one(users, {
    fields: [issues.createdBy],
    references: [users.id],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  issue: one(issues, {
    fields: [votes.issueId],
    references: [issues.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, role: true });
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, createdAt: true, updatedAt: true, createdBy: true });
export const updateIssueSchema = insertIssueSchema.partial();

// === EXPLICIT API CONTRACT TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;

export type Vote = typeof votes.$inferSelect;

// Request/Response types
export type CreateIssueRequest = InsertIssue;
export type UpdateIssueStatusRequest = { status: string };

// Auth types
export type LoginUserRequest = { mobile: string; password: string };
export type LoginAdminRequest = { adminId: string; password: string };

export type IssueWithVoteCount = Issue & { voteCount: number; userHasVoted: boolean };
