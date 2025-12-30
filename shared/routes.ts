import { z } from 'zod';
import { insertUserSchema, insertAdminSchema, insertIssueSchema, issues, users, admins } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    loginUser: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        mobile: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(), // Returns User
        401: errorSchemas.unauthorized,
      },
    },
    loginAdmin: {
      method: 'POST' as const,
      path: '/api/admin/login',
      input: z.object({
        adminId: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof admins.$inferSelect>(), // Returns Admin
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: { // Check current session
      method: 'GET' as const,
      path: '/api/me',
      responses: {
        200: z.custom<{ user?: typeof users.$inferSelect; admin?: typeof admins.$inferSelect } | null>(),
      },
    }
  },
  users: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateProfile: {
      method: 'PUT' as const,
      path: '/api/users/profile',
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    }
  },
  admins: {
    create: { // Super Admin only
      method: 'POST' as const,
      path: '/api/admins',
      input: insertAdminSchema,
      responses: {
        201: z.custom<typeof admins.$inferSelect>(),
        403: errorSchemas.unauthorized,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/admins',
      responses: {
        200: z.array(z.custom<typeof admins.$inferSelect>()),
      },
    },
    update: { // Super Admin only
      method: 'PUT' as const,
      path: '/api/admins/:id',
      input: insertAdminSchema.partial(),
      responses: {
        200: z.custom<typeof admins.$inferSelect>(),
        403: errorSchemas.unauthorized,
      },
    },
    delete: { // Super Admin only
      method: 'DELETE' as const,
      path: '/api/admins/:id',
      responses: {
        200: z.object({ message: z.string() }),
        403: errorSchemas.unauthorized,
      },
    }
  },
  issues: {
    list: {
      method: 'GET' as const,
      path: '/api/issues',
      input: z.object({
        ward: z.string().optional(),
        status: z.string().optional(),
        category: z.string().optional(),
        createdBy: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof issues.$inferSelect & { voteCount: number; userHasVoted: boolean }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/issues',
      input: z.any(), // Multipart form data, handled manually in route
      responses: {
        201: z.custom<typeof issues.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: { // Admin only
      method: 'PATCH' as const,
      path: '/api/issues/:id/status',
      input: z.object({ status: z.string() }),
      responses: {
        200: z.custom<typeof issues.$inferSelect>(),
        403: errorSchemas.unauthorized,
      },
    },
    delete: { // Admin only
      method: 'DELETE' as const,
      path: '/api/issues/:id',
      responses: {
        204: z.void(),
        403: errorSchemas.unauthorized,
      },
    },
    vote: { // Toggle vote
      method: 'POST' as const,
      path: '/api/issues/:id/vote',
      responses: {
        200: z.object({ votes: z.number(), voted: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
    analytics: {
      method: 'GET' as const,
      path: '/api/analytics',
      responses: {
        200: z.object({
          totalIssues: z.number(),
          pendingCount: z.number(),
          inProgressCount: z.number(),
          resolvedCount: z.number(),
          categoryDistribution: z.array(z.object({ name: z.string(), value: z.number() })),
          wardDistribution: z.array(z.object({ name: z.string(), value: z.number() })),
          monthlyTrend: z.array(z.object({ month: z.string(), count: z.number() })),
        }),
      },
    }
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
