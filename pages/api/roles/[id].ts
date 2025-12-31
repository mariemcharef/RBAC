import type { NextApiResponse } from "next";
import { requireAuth, type AuthenticatedNextApiRequest } from "@/lib/middleware/auth";
import { hasPermission, userBelongsToTenant } from "@/lib/middleware/permission";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse): Promise<void> {
  const userId = req.user.dbUserId;
  const roleIdParam = req.query.id;

  if (!roleIdParam || typeof roleIdParam !== "string") {
    res.status(400).json({ error: "Missing or invalid role ID" });
    return;
  }

  const roleId = Number(roleIdParam);
  if (isNaN(roleId)) {
    res.status(400).json({ error: "Invalid role ID format" });
    return;
  }

  const { data: role, error: fetchError } = await supabaseAdmin
    .from("roles")
    .select("id, tenant_id, name")
    .eq("id", roleId)
    .single();

  if (fetchError || !role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }

  const tenantId = Number(role.tenant_id);

  // Verify user belongs to tenant
  const belongsToTenant = await userBelongsToTenant(userId, tenantId);
  if (!belongsToTenant) {
    res.status(403).json({ error: "Access denied: User does not belong to this tenant" });
    return;
  }

  // PUT: Update role
  if (req.method === "PUT") {
    const allowed = await hasPermission(userId, tenantId, "role.update");
    if (!allowed) {
      res.status(403).json({ error: "Forbidden: Missing role.update permission" });
      return;
    }

    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Missing or invalid role name" });
      return;
    }

    const trimmedName = name.trim();

    // Check for duplicate role name within tenant (excluding current role)
    const { data: existingRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", trimmedName)
      .neq("id", roleId)
      .single();

    if (existingRole) {
      res.status(409).json({ error: "Role name already exists in this tenant" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("roles")
      .update({ name: trimmedName })
      .eq("id", roleId)
      .select("id, tenant_id, name")
      .single();

    if (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ error: "Failed to update role" });
      return;
    }

    res.json(data);
    return;
  }

  // DELETE: Delete role
  if (req.method === "DELETE") {
    const allowed = await hasPermission(userId, tenantId, "role.delete");
    if (!allowed) {
      res.status(403).json({ error: "Forbidden: Missing role.delete permission" });
      return;
    }

    // Check if role has assigned users
    const { data: assignedUsers, error: checkError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role_id", roleId)
      .limit(1);

    if (checkError) {
      console.error("Error checking role assignments:", checkError);
      res.status(500).json({ error: "Failed to check role assignments" });
      return;
    }

    if (assignedUsers && assignedUsers.length > 0) {
      res.status(400).json({ 
        error: "Cannot delete role: Role is assigned to users. Remove all user assignments first." 
      });
      return;
    }

    const { error } = await supabaseAdmin
      .from("roles")
      .delete()
      .eq("id", roleId);

    if (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ error: "Failed to delete role" });
      return;
    }

    res.status(204).end();
    return;
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

export default requireAuth(handler);
