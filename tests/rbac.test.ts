// Mock environment variables before importing supabaseAdmin
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key-123";

jest.mock("@/lib/supabaseAdmin");

import { hasPermission, verifyRoleTenant, userBelongsToTenant } from "@/lib/middleware/permission";

describe("RBAC System - Permission Checks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hasPermission", () => {
    it("should return false when database query fails", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        as: jest.fn().mockResolvedValue({ data: null, error: { message: "DB Error" } }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await hasPermission(1, 1, "role.read");
      expect(result).toBe(false);
    });

    it("should return false when user has no roles in the tenant", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        as: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await hasPermission(1, 2, "role.read");
      expect(result).toBe(false);
    });

    it("should return false when user lacks the required permission", async () => {
      const mockUserRoles = [
        {
          role_id: 1,
          roles: {
            id: 1,
            tenant_id: 1,
            role_permissions: [
              {
                permission_id: 1,
                permissions: { key: "role.read" },
              },
            ],
          },
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        as: jest.fn().mockResolvedValue({ data: mockUserRoles, error: null }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await hasPermission(1, 1, "role.delete");
      expect(result).toBe(false);
    });
  });

  describe("userBelongsToTenant", () => {
    it("should return true when user has at least one role in tenant", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [{ roles: { tenant_id: 1 } }], error: null }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await userBelongsToTenant(1, 1);
      expect(result).toBe(true);
    });

    it("should return false when user has no roles in tenant", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await userBelongsToTenant(1, 2);
      expect(result).toBe(false);
    });

    it("should return false on database error", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: { message: "DB Error" } }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await userBelongsToTenant(1, 1);
      expect(result).toBe(false);
    });

    it("should return false on connection exception", async () => {
      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockImplementationOnce(() => {
        throw new Error("Connection failed");
      });

      const result = await userBelongsToTenant(1, 1);
      expect(result).toBe(false);
    });
  });

  describe("verifyRoleTenant", () => {
    it("should return true when role belongs to the specified tenant", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { tenant_id: 1 }, error: null }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await verifyRoleTenant(1, 1);
      expect(result).toBe(true);
    });

    it("should return false when role belongs to a different tenant", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { tenant_id: 2 }, error: null }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await verifyRoleTenant(1, 1);
      expect(result).toBe(false);
    });

    it("should return false when role does not exist", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await verifyRoleTenant(999, 1);
      expect(result).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: "Connection error" } }),
      };

      const { supabaseAdmin } = require("@/lib/supabaseAdmin");
      supabaseAdmin.from.mockReturnValue(mockChain);

      const result = await verifyRoleTenant(1, 1);
      expect(result).toBe(false);
    });
  });
});

describe("RBAC System - Tenant Isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should prevent user from accessing permissions in different tenant", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      as: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const { supabaseAdmin } = require("@/lib/supabaseAdmin");
    supabaseAdmin.from.mockReturnValue(mockChain);

    const result = await hasPermission(1, 2, "role.read");
    expect(result).toBe(false);
  });

  it("should respect role-tenant boundaries", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { tenant_id: 2 }, error: null }),
    };

    const { supabaseAdmin } = require("@/lib/supabaseAdmin");
    supabaseAdmin.from.mockReturnValue(mockChain);

    const result = await verifyRoleTenant(1, 1);
    expect(result).toBe(false);
  });

  it("should enforce tenant isolation at assignment boundary", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const { supabaseAdmin } = require("@/lib/supabaseAdmin");
    supabaseAdmin.from.mockReturnValue(mockChain);

    const result = await userBelongsToTenant(1, 2);
    expect(result).toBe(false);
  });
});

describe("RBAC System - Backend Enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return false for errors", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      as: jest.fn().mockResolvedValue({ data: null, error: new Error("DB Error") }),
    };

    const { supabaseAdmin } = require("@/lib/supabaseAdmin");
    supabaseAdmin.from.mockReturnValue(mockChain);

    const result = await hasPermission(1, 1, "role.read");
    expect(result).toBe(false);
  });

  it("should safely handle permission check exceptions", async () => {
    const { supabaseAdmin } = require("@/lib/supabaseAdmin");
    supabaseAdmin.from.mockImplementationOnce(() => {
      throw new Error("Service unavailable");
    });

    const result = await hasPermission(1, 1, "role.read");
    expect(result).toBe(false);
  });

  it("should verify user authenticity before permission check", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      as: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const { supabaseAdmin } = require("@/lib/supabaseAdmin");
    supabaseAdmin.from.mockReturnValue(mockChain);

    const result = await hasPermission(NaN, 1, "role.read");
    expect(result).toBe(false);
  });
});

