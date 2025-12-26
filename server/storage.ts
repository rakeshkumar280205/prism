import { db } from "./db";
import { users, admins, issues, votes, type User, type InsertUser, type Admin, type InsertAdmin, type Issue, type InsertIssue, type Vote } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Admins
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByAdminId(adminId: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  listAdmins(): Promise<Admin[]>;

  // Issues
  getIssue(id: number): Promise<Issue | undefined>;
  getIssues(filters?: { ward?: string; status?: string; category?: string }): Promise<(Issue & { voteCount: number; userHasVoted: boolean })[]>; // Adjusted return type
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssueStatus(id: number, status: string): Promise<Issue>;
  deleteIssue(id: number): Promise<void>;

  // Votes
  toggleVote(issueId: number, userId: number): Promise<{ votes: number; voted: boolean }>;
  getVoteCount(issueId: number): Promise<number>;
  hasUserVoted(issueId: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.mobile, mobile));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  // Admins
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByAdminId(adminId: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.adminId, adminId));
    return admin;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  async listAdmins(): Promise<Admin[]> {
    return await db.select().from(admins).orderBy(desc(admins.createdAt));
  }

  // Issues
  async getIssue(id: number): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue;
  }

  async getIssues(filters: { ward?: string; status?: string; category?: string } = {}, userId?: number): Promise<(Issue & { voteCount: number; userHasVoted: boolean })[]> {
    let query = db.select().from(issues);
    const conditions = [];

    if (filters.ward) conditions.push(eq(issues.ward, filters.ward));
    if (filters.status) conditions.push(eq(issues.status, filters.status));
    if (filters.category) conditions.push(eq(issues.category, filters.category));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Sort by votes (high to low) and then date
    const allIssues = await query.orderBy(desc(issues.createdAt));

    // Enhance with vote data
    // Ideally this should be a JOIN or aggregation query for performance, but loop is fine for MVP
    const enhancedIssues = await Promise.all(allIssues.map(async (issue) => {
      const voteCount = await this.getVoteCount(issue.id);
      let userHasVoted = false;
      if (userId) {
        userHasVoted = await this.hasUserVoted(issue.id, userId);
      }
      return { ...issue, voteCount, userHasVoted };
    }));
    
    // Sort by votes in memory since we didn't join
    return enhancedIssues.sort((a, b) => b.voteCount - a.voteCount);
  }

  async createIssue(insertIssue: InsertIssue): Promise<Issue> {
    const [issue] = await db.insert(issues).values(insertIssue).returning();
    return issue;
  }

  async updateIssueStatus(id: number, status: string): Promise<Issue> {
    const [issue] = await db.update(issues).set({ status, updatedAt: new Date() }).where(eq(issues.id, id)).returning();
    return issue;
  }

  async deleteIssue(id: number): Promise<void> {
    await db.delete(votes).where(eq(votes.issueId, id)); // Cascade delete votes
    await db.delete(issues).where(eq(issues.id, id));
  }

  // Votes
  async toggleVote(issueId: number, userId: number): Promise<{ votes: number; voted: boolean }> {
    const existingVote = await db.select().from(votes).where(and(eq(votes.issueId, issueId), eq(votes.userId, userId)));

    if (existingVote.length > 0) {
      // Unvote
      await db.delete(votes).where(eq(votes.id, existingVote[0].id));
      const count = await this.getVoteCount(issueId);
      return { votes: count, voted: false };
    } else {
      // Vote
      await db.insert(votes).values({ issueId, userId });
      const count = await this.getVoteCount(issueId);
      return { votes: count, voted: true };
    }
  }

  async getVoteCount(issueId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(votes).where(eq(votes.issueId, issueId));
    return Number(result[0]?.count || 0);
  }

  async hasUserVoted(issueId: number, userId: number): Promise<boolean> {
    const result = await db.select().from(votes).where(and(eq(votes.issueId, issueId), eq(votes.userId, userId)));
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
