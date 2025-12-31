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
  const tenantIdParam = req.query.tenantId;

  if (!tenantIdParam || typeof tenantIdParam !== "string") {
    return res.status(400).json({ error: "Missing or invalid tenantId parameter" });
  }

  const tenantId = Number(tenantIdParam);
  if (isNaN(tenantId)) {
    return res.status(400).json({ error: "Invalid tenantId format" });
  }

  const belongsToTenant = await userBelongsToTenant(userId, tenantId);
  if (!belongsToTenant) {
    return res.status(403).json({ error: "Access denied: User does not belong to this tenant" });
  }

  const allowed = await hasPermission(userId, tenantId, "user.read");
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden: Missing user.read permission" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select(`
        user_id,
        users!inner (
          id,
          email
        ),
        roles!inner (
          tenant_id
        )
      `)
      .eq("roles.tenant_id", tenantId);

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    const usersMap = new Map<number, { id: number; email: string }>();
    
    data?.forEach((userRole: any) => {
      const user = userRole.users;
      if (user) {
        usersMap.set(user.id, {
          id: Number(user.id),
          email: user.email
        });
      }
    });

    const users = Array.from(usersMap.values());

    return res.json(users);
  } catch (err) {
    console.error("Error in users endpoint:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default requireAuth(handler);
