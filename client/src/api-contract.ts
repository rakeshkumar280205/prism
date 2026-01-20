// ============================================
// FRONTEND-ONLY API CONTRACT
// ============================================
// This file defines API routes and paths for frontend use only.
// It does NOT include database schemas or backend implementation details.

export const api = {
    auth: {
        loginUser: {
            method: 'POST' as const,
            path: '/api/login',
        },
        loginAdmin: {
            method: 'POST' as const,
            path: '/api/admin/login',
        },
        logout: {
            method: 'POST' as const,
            path: '/api/logout',
        },
        me: {
            method: 'GET' as const,
            path: '/api/me',
        }
    },
    users: {
        register: {
            method: 'POST' as const,
            path: '/api/register',
        },
        updateProfile: {
            method: 'PUT' as const,
            path: '/api/users/profile',
        }
    },
    admins: {
        create: {
            method: 'POST' as const,
            path: '/api/admins',
        },
        list: {
            method: 'GET' as const,
            path: '/api/admins',
        },
        update: {
            method: 'PUT' as const,
            path: '/api/admins/:id',
        },
        delete: {
            method: 'DELETE' as const,
            path: '/api/admins/:id',
        }
    },
    issues: {
        list: {
            method: 'GET' as const,
            path: '/api/issues',
        },
        create: {
            method: 'POST' as const,
            path: '/api/issues',
        },
        updateStatus: {
            method: 'PATCH' as const,
            path: '/api/issues/:id/status',
        },
        update: {
            method: 'PATCH' as const,
            path: '/api/issues/:id',
        },
        delete: {
            method: 'DELETE' as const,
            path: '/api/issues/:id',
        },
        vote: {
            method: 'POST' as const,
            path: '/api/issues/:id/vote',
        },
        analytics: {
            method: 'GET' as const,
            path: '/api/analytics',
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
