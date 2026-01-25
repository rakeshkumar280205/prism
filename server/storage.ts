// TDZ audit: No module-scope mutable state captured by closures. All state is class- or function-scoped. TDZ-proof.
import { type User, type InsertUser, type Admin, type InsertAdmin, type Issue, type InsertIssue, type Vote, type IssueWithVoteCount, type AuditLog, type InsertAuditLog } from "@shared/schema";
import { User as UserModel } from "./models/User";
import { Admin as AdminModel } from "./models/Admin";
import { Issue as IssueModel } from "./models/Issue";
import { Vote as VoteModel } from "./models/Vote";
import { AuditLog as AuditLogModel } from "./models/AuditLog";

/**
 * Strips MongoDB internal fields (_id, __v) and sensitive fields (password)
 * to prevent leaking database implementation details and credentials to API responses
 */
function cleanObject<T extends Record<string, any>>(obj: T | null | undefined): T | undefined {
  if (!obj) return undefined;
  const { _id, __v, password, ...clean } = obj;
  return clean as T;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  getUserByMobileForAuth(mobile: string): Promise<(User & { password: string }) | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Admins
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByAdminId(adminId: string): Promise<Admin | undefined>;
  getAdminByAdminIdForAuth(adminId: string): Promise<(Admin & { password: string }) | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  listAdmins(): Promise<Admin[]>;
  updateAdmin(id: number, updates: Partial<InsertAdmin>): Promise<Admin>;
  deleteAdmin(id: number): Promise<void>;

  // Issues
  getIssue(id: number): Promise<Issue | undefined>;
  getIssues(filters?: { ward?: string | number; status?: string; category?: string; createdBy?: number }, userId?: number): Promise<IssueWithVoteCount[]>;
  createIssue(issue: any): Promise<Issue>;
  updateIssue(id: number, updates: any): Promise<Issue | undefined>;
  updateIssueStatus(id: number, status: string): Promise<Issue>;
  deleteIssue(id: number): Promise<void>;
  deleteOldResolvedIssues(): Promise<void>;
  findPotentialDuplicates(data: { ward: string; category: string; title: string }): Promise<IssueWithVoteCount[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  listAuditLogs(): Promise<AuditLog[]>;

  // Votes
  toggleVote(issueId: number, userId: number): Promise<{ votes: number; voted: boolean }>;
  getVoteCount(issueId: number): Promise<number>;
  hasUserVoted(issueId: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const user = await UserModel.findOne({ id }).lean();
    if (!user || user.id == null) return undefined;
    return cleanObject(user) as User;
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ mobile }).lean();
    if (!user || user.id == null) return undefined;
    return cleanObject(user) as User;
  }

  async getUserByMobileForAuth(mobile: string): Promise<(User & { password: string }) | undefined> {
    const user = await UserModel.findOne({ mobile }).lean();
    if (!user || user.id == null) return undefined;
    return user as (User & { password: string });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await UserModel.create(insertUser);
    return cleanObject(user.toObject() as User) as User;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const user = await UserModel.findOneAndUpdate({ id }, updates, { new: true }).lean();
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return cleanObject(user) as User;
  }

  // Admins
  async getAdmin(id: number): Promise<Admin | undefined> {
    const admin = await AdminModel.findOne({ id }).lean();
    if (!admin || admin.id == null) return undefined;
    return cleanObject(admin) as Admin;
  }

  async getAdminByAdminId(adminId: string): Promise<Admin | undefined> {
    const admin = await AdminModel.findOne({ adminId }).lean();
    if (!admin || admin.id == null) return undefined;
    return cleanObject(admin) as Admin;
  }

  async getAdminByAdminIdForAuth(adminId: string): Promise<(Admin & { password: string }) | undefined> {
    const admin = await AdminModel.findOne({ adminId }).lean();
    if (!admin || admin.id == null) return undefined;
    return admin as (Admin & { password: string });
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    // Prepare admin data with proper defaults for Mongoose
    const adminData: any = {
      adminId: insertAdmin.adminId,
      password: insertAdmin.password,
      name: insertAdmin.name,
      role: insertAdmin.role || "ADMIN",
      wardAssigned: insertAdmin.wardAssigned,
      isActive: insertAdmin.isActive !== null ? insertAdmin.isActive : true,
      createdBy: insertAdmin.createdBy,
    };

    const admin = await AdminModel.create(adminData);
    const savedAdmin = admin.toObject();
    if (savedAdmin.id == null) throw new Error("Admin created without ID");
    return cleanObject(savedAdmin) as Admin;
  }

  async listAdmins(): Promise<Admin[]> {
    // Defensive limit to prevent memory exhaustion (1000 admins is far beyond expected scale)
    const admins = await AdminModel.find().sort({ createdAt: -1 }).limit(1000).lean();
    return admins.map(cleanObject) as Admin[];
  }

  async updateAdmin(id: number, updates: Partial<InsertAdmin>): Promise<Admin> {
    const admin = await AdminModel.findOneAndUpdate({ id }, updates, { new: true }).lean();
    if (!admin) {
      throw new Error(`Admin with id ${id} not found`);
    }
    return cleanObject(admin) as Admin;
  }

  async deleteAdmin(id: number): Promise<void> {
    await AdminModel.deleteOne({ id });
  }

  // Issues
  async getIssue(id: number): Promise<Issue | undefined> {
    const issue = await IssueModel.findOne({ id }).lean();
    if (!issue || issue.id == null) return undefined;
    return cleanObject(issue) as Issue;
  }

  async getIssues(filters: { ward?: string | number; status?: string; category?: string; createdBy?: number } = {}, userId?: number): Promise<IssueWithVoteCount[]> {
    const query: any = {};

    if (filters.ward) query.ward = filters.ward.toString();
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.createdBy) query.createdBy = filters.createdBy;

    // Limit results to prevent unbounded queries and memory exhaustion
    const MAX_ISSUES = 10000; // Hard limit for safety

    // Sort by date and apply limit
    const allIssues = await IssueModel.find(query).sort({ createdAt: -1 }).limit(MAX_ISSUES).lean();

    if (allIssues.length === 0) {
      return [];
    }

    // Filter out any issues without valid IDs (defensive)
    const validIssues = allIssues.filter(issue => issue.id != null);
    if (validIssues.length === 0) {
      return [];
    }

    // Batch fetch vote counts for all issues (single aggregation query)
    const issueIds = validIssues.map(issue => issue.id!);
    const voteCounts = await VoteModel.aggregate([
      { $match: { issueId: { $in: issueIds } } },
      { $group: { _id: "$issueId", count: { $sum: 1 } } }
    ]);
    const voteCountMap = new Map(voteCounts.map(v => [v._id, v.count]));

    // Batch fetch user votes for all issues (single query if userId provided)
    let userVotesMap = new Map<number, boolean>();
    if (userId) {
      const userVotes = await VoteModel.find({
        issueId: { $in: issueIds },
        userId
      }).lean();
      userVotesMap = new Map(userVotes.map(v => [v.issueId, true]));
    }

    // Enhance with vote data
    const enhancedIssues = validIssues.map((issue) => {
      const voteCount = voteCountMap.get(issue.id!) || 0;
      const userHasVoted = userVotesMap.get(issue.id!) || false;
      return { ...cleanObject(issue), voteCount, userHasVoted } as IssueWithVoteCount & { voteCount: number; userHasVoted: boolean };
    });

    return enhancedIssues.sort((a, b) => b.voteCount - a.voteCount);
  }

  async createIssue(insertIssue: any): Promise<Issue> {
    const issue = await IssueModel.create(insertIssue);
    return cleanObject(issue.toObject() as Issue) as Issue;
  }

  async updateIssueStatus(id: number, status: string): Promise<Issue> {
    const issue = await IssueModel.findOneAndUpdate({ id }, { status, updatedAt: new Date() }, { new: true }).lean();
    if (!issue) {
      throw new Error("Issue not found");
    }
    return cleanObject(issue) as Issue;
  }

  async updateIssue(id: number, updates: any): Promise<Issue | undefined> {
    const issue = await IssueModel.findOneAndUpdate({ id }, { ...updates, updatedAt: new Date() }, { new: true }).lean();
    return cleanObject(issue) as Issue | undefined;
  }

  async deleteIssue(id: number): Promise<void> {
    await VoteModel.deleteMany({ issueId: id }); // Cascade delete votes
    await IssueModel.deleteOne({ id });
  }

  async deleteOldResolvedIssues(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const BATCH_SIZE = 1000; // Process in batches to avoid memory exhaustion
    let totalDeleted = 0;

    // Use bulk operations to delete in batches without loading all IDs into memory
    while (true) {
      // Find one batch of old issues
      const batch = await IssueModel.find({
        status: "Resolved",
        updatedAt: { $lt: thirtyDaysAgo }
      }).select('id').limit(BATCH_SIZE).lean();

      if (batch.length === 0) break; // No more issues to delete

      const batchIds = batch.map(issue => issue.id).filter((id): id is number => id != null);
      if (batchIds.length === 0) break;

      totalDeleted += batchIds.length;

      // Delete votes and issues for this batch in parallel
      await Promise.all([
        VoteModel.deleteMany({ issueId: { $in: batchIds } }),
        IssueModel.deleteMany({ id: { $in: batchIds } })
      ]);
    }

    if (totalDeleted > 0) {
      console.log(`[Cleanup] Auto-deleted ${totalDeleted} resolved issue(s) older than 30 days`);
    }
  }

  async findPotentialDuplicates(data: { ward: string; category: string; title: string }): Promise<IssueWithVoteCount[]> {
    // Escape regex special characters to prevent ReDoS attacks and injection
    const escapedTitle = data.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const similarIssues = await IssueModel.find({
      ward: data.ward,
      category: data.category,
      title: { $regex: escapedTitle, $options: 'i' }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (similarIssues.length === 0) {
      return [];
    }

    // Filter valid issues with IDs
    const validIssues = similarIssues.filter(issue => issue.id != null);
    if (validIssues.length === 0) {
      return [];
    }

    // Batch fetch vote counts using aggregation instead of N+1 queries
    const issueIds = validIssues.map(issue => issue.id!);
    const voteCounts = await VoteModel.aggregate([
      { $match: { issueId: { $in: issueIds } } },
      { $group: { _id: '$issueId', count: { $sum: 1 } } }
    ]);

    // Create a map for O(1) lookup
    const voteCountMap = new Map(voteCounts.map(vc => [vc._id, vc.count]));

    return validIssues.map(issue => ({
      ...cleanObject(issue),
      voteCount: voteCountMap.get(issue.id!) || 0,
      userHasVoted: false
    } as IssueWithVoteCount & { voteCount: number; userHasVoted: boolean }));
  }

  // Votes
  async toggleVote(issueId: number, userId: number): Promise<{ votes: number; voted: boolean }> {
    const existingVote = await VoteModel.findOne({ issueId, userId }).lean();

    if (existingVote) {
      // Unvote
      await VoteModel.deleteOne({ id: existingVote.id });
      const count = await this.getVoteCount(issueId);
      return { votes: count, voted: false };
    } else {
      // Vote
      try {
        await VoteModel.create({ issueId, userId });
      } catch (error: any) {
        if (error && error.code === 11000) {
          const count = await this.getVoteCount(issueId);
          return { votes: count, voted: true };
        }
        throw error;
      }
      const count = await this.getVoteCount(issueId);
      return { votes: count, voted: true };
    }
  }

  async getVoteCount(issueId: number): Promise<number> {
    const count = await VoteModel.countDocuments({ issueId });
    return count;
  }

  async hasUserVoted(issueId: number, userId: number): Promise<boolean> {
    const vote = await VoteModel.findOne({ issueId, userId }).lean();
    return vote !== null;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const auditLog = await AuditLogModel.create(log);
    return cleanObject(auditLog.toObject() as AuditLog) as AuditLog;
  }

  async listAuditLogs(): Promise<AuditLog[]> {
    // Defensive limit to prevent memory exhaustion in production (10000 logs should cover months of activity)
    const logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(10000).lean();
    return logs.map(cleanObject) as AuditLog[];
  }

  // Analytics
  async getAnalytics(userId?: number, ward?: string, isSuperAdmin?: boolean) {
    const match: any = {};

    // Filter based on role
    if (userId && !isSuperAdmin && !ward) {
      // User: only their own issues (fallback if no ward)
      match.createdBy = userId;
    } else if (ward && !isSuperAdmin) {
      // User/Admin: only their assigned ward
      match.ward = ward;
    }
    // SuperAdmin: all issues (no filter)

    // Use MongoDB aggregation to compute counts without loading all documents
    const pipeline: any[] = [
      { $match: match },
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: "$category", count: { $sum: 1 } } }
          ],
          byWard: [
            { $group: { _id: "$ward", count: { $sum: 1 } } }
          ],
          byMonth: [
            { $match: { createdAt: { $type: "date" } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
          ],
        },
      },
    ];

    const aggResult = await IssueModel.aggregate(pipeline);
    const facet = aggResult[0] || { total: [], byStatus: [], byCategory: [], byWard: [], byMonth: [] };

    const totalIssues = facet.total.length ? facet.total[0].count : 0;

    // Status counts
    const statusMap = new Map<string, number>(facet.byStatus.map((s: any) => [s._id, s.count]));
    const pendingCount = statusMap.get("Pending") || 0;
    const inProgressCount = statusMap.get("In Progress") || 0;
    const resolvedCount = statusMap.get("Resolved") || 0;

    // Category distribution
    const categoryDistribution = (facet.byCategory as any[])
      .filter((c) => c._id != null)
      .map((c) => ({ name: c._id as string, value: c.count as number }));

    // Ward distribution
    const wardDistribution = (facet.byWard as any[])
      .filter((w) => w._id != null)
      .map((w) => ({ name: w._id as string, value: w.count as number }));

    // Monthly trend (last 12 months)
    const monthlyCounts = new Map<string, number>();
    (facet.byMonth as any[]).forEach((m) => monthlyCounts.set(m._id as string, m.count as number));

    const monthlyTrend: Array<{ month: string; count: number }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ymKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      const count = monthlyCounts.get(ymKey) || 0;
      monthlyTrend.push({ month: label, count });
    }

    return {
      totalIssues,
      pendingCount,
      inProgressCount,
      resolvedCount,
      categoryDistribution,
      wardDistribution,
      monthlyTrend,
    };
  }
}

export const storage = new DatabaseStorage();
