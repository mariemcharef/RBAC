import { supabaseAdmin } from "../supabaseAdmin";


interface PermissionData {
  key: string;
  description?: string;
}

interface RolePermissionData {
  permission_id: number;
  permissions: PermissionData;
}

interface RoleData {
  id: number;
  tenant_id: number;
  role_permissions: RolePermissionData[];
}

interface UserRoleData {
  role_id: number;
  roles: RoleData;
}

export async function hasPermission(
  userId: number,
  tenantId: number,
  permissionKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select(`
        role_id,
        roles!inner (
          id,
          tenant_id,
          role_permissions!inner (
            permission_id,
            permissions!inner (
              key
            )
          )
        )
      `)
      .eq("user_id", userId)
      .eq("roles.tenant_id", tenantId) as { data: UserRoleData[] | null; error: any };

    if (error) {
      console.error("Permission check error:", error);
      return false;
    }

    if (!data || data.length === 0) {
      return false;
    }

    for (const userRole of data) {
      const role = userRole?.roles;
      if (!role || !Array.isArray(role.role_permissions)) {
        continue;
      }

      for (const rolePermission of role.role_permissions) {
        const permission = rolePermission?.permissions;
        if (permission && permission.key === permissionKey) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error("Permission check exception:", err);
    return false;
  }
}

export async function verifyRoleTenant(
  roleId: number,
  tenantId: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("roles")
      .select("tenant_id")
      .eq("id", roleId)
      .single();

    if (error || !data) {
      return false;
    }

    return Number(data.tenant_id) === tenantId;
  } catch (err) {
    console.error("Role tenant verification error:", err);
    return false;
  }
}

export async function userBelongsToTenant(
  userId: number,
  tenantId: number
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select(`
        roles!inner (
          tenant_id
        )
      `)
      .eq("user_id", userId)
      .eq("roles.tenant_id", tenantId)
      .limit(1);

    if (error) {
      console.error("Tenant membership check error:", error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error("Tenant membership check exception:", err);
    return false;
  }
}
