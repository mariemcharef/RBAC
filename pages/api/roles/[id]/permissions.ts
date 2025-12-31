import type { NextApiResponse } from "next";
import { requireAuth, type AuthenticatedNextApiRequest } from "@/lib/middleware/auth";
import { hasPermission, userBelongsToTenant } from "@/lib/middleware/permission";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const userId = req.user.dbUserId;
  const roleIdParam = req.query.id;

  if (!roleIdParam || typeof roleIdParam !== "string") {
    return res.status(400).json({ error: "Missing or invalid role ID" });
  }

  const roleId = Number(roleIdParam);
  if (isNaN(roleId)) {
    return res.status(400).json({ error: "Invalid role ID format" });
  }

  const { data: role, error: fetchError } = await supabaseAdmin
    .from("roles")
    .select("id, tenant_id, name")
    .eq("id", roleId)
    .single();

  if (fetchError || !role) {
    return res.status(404).json({ error: "Role not found" });
  }

  const tenantId = Number(role.tenant_id);

  const belongsToTenant = await userBelongsToTenant(userId, tenantId);
  if (!belongsToTenant) {
    return res.status(403).json({ error: "Access denied: User does not belong to this tenant" });
  }

  const allowed = await hasPermission(userId, tenantId, "role.read");
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden: Missing role.read permission" });
  }

  const { data, error } = await supabaseAdmin
    .from("role_permissions")
    .select(`
      permission_id,
      permissions (
        id,
        key,
        description
      )
    `)
    .eq("role_id", roleId);

  if (error) {
    console.error("Error fetching role permissions:", error);
    return res.status(500).json({ error: "Failed to fetch role permissions" });
  }

  const permissions = data?.map(rp => rp.permissions).filter(Boolean) || [];

  return res.json(permissions);
}

export default requireAuth(handler);
