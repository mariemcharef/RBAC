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
  const { tenantId, targetUserId, roleId } = req.body;

  if (!tenantId || !targetUserId || !roleId) {
    return res.status(400).json({ 
      error: "Missing required fields: tenantId, targetUserId, and roleId are required" 
    });
  }

  const tenantIdNum = Number(tenantId);
  const targetUserIdNum = Number(targetUserId);
  const roleIdNum = Number(roleId);

  if (isNaN(tenantIdNum) || isNaN(targetUserIdNum) || isNaN(roleIdNum)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  const belongsToTenant = await userBelongsToTenant(userId, tenantIdNum);
  if (!belongsToTenant) {
    return res.status(403).json({ error: "Access denied: User does not belong to this tenant" });
  }

  const allowed = await hasPermission(userId, tenantIdNum, "user.assign_role");
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden: Missing user.assign_role permission" });
  }

  const roleValid = await verifyRoleTenant(roleIdNum, tenantIdNum);
  if (!roleValid) {
    return res.status(400).json({ 
      error: "Invalid role: Role does not belong to the specified tenant" 
    });
  }

  const { data: targetUser, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", targetUserIdNum)
    .single();

  if (userError || !targetUser) {
    return res.status(404).json({ error: "Target user not found" });
  }

  const { data: existing } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role_id")
    .eq("user_id", targetUserIdNum)
    .eq("role_id", roleIdNum)
    .single();

  if (existing) {
    return res.status(409).json({ error: "Role already assigned to this user" });
  }

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .insert({
      user_id: targetUserIdNum,
      role_id: roleIdNum,
    })
    .select();

  if (error) {
    console.error("Error assigning role:", error);
    return res.status(500).json({ error: "Failed to assign role" });
  }

  return res.status(201).json({ success: true, data });
}

export default requireAuth(handler);