import type { NextApiResponse } from "next";
import { requireAuth, type AuthenticatedNextApiRequest } from "@/lib/middleware/auth";
import { hasPermission, verifyRoleTenant, userBelongsToTenant } from "@/lib/middleware/permission";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const userId = req.user.dbUserId;
  const { tenantId, roleId, permissionId } = req.body;

  if (!tenantId || !roleId || !permissionId) {
    return res.status(400).json({ 
      error: "Missing required fields: tenantId, roleId, and permissionId are required" 
    });
  }

  const tenantIdNum = Number(tenantId);
  const roleIdNum = Number(roleId);
  const permissionIdNum = Number(permissionId);

  if (isNaN(tenantIdNum) || isNaN(roleIdNum) || isNaN(permissionIdNum)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  const belongsToTenant = await userBelongsToTenant(userId, tenantIdNum);
  if (!belongsToTenant) {
    return res.status(403).json({ error: "Access denied: User does not belong to this tenant" });
  }


  const allowed = await hasPermission(userId, tenantIdNum, "permission.assign");
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden: Missing permission.assign permission" });
  }

  const roleValid = await verifyRoleTenant(roleIdNum, tenantIdNum);
  if (!roleValid) {
    return res.status(400).json({ 
      error: "Invalid role: Role does not belong to the specified tenant" 
    });
  }

  const { data: permission, error: permError } = await supabaseAdmin
    .from("permissions")
    .select("id")
    .eq("id", permissionIdNum)
    .single();

  if (permError || !permission) {
    return res.status(404).json({ error: "Permission not found" });
  }

  const { data: existing } = await supabaseAdmin
    .from("role_permissions")
    .select("role_id, permission_id")
    .eq("role_id", roleIdNum)
    .eq("permission_id", permissionIdNum)
    .single();

  if (existing) {
    return res.status(409).json({ error: "Permission already assigned to this role" });
  }

  const { data, error } = await supabaseAdmin
    .from("role_permissions")
    .insert({
      role_id: roleIdNum,
      permission_id: permissionIdNum,
    })
    .select();

  if (error) {
    console.error("Error assigning permission:", error);
    return res.status(500).json({ error: "Failed to assign permission" });
  }

  return res.status(201).json({ success: true, data });
}

export default requireAuth(handler);