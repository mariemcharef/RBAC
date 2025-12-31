import type { NextApiResponse } from "next";
import { requireAuth, type AuthenticatedNextApiRequest } from "@/lib/middleware/auth";
import { hasPermission, userBelongsToTenant } from "@/lib/middleware/permission";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  const userId = req.user.dbUserId;
  const { tenantId: tenantIdParam } = req.query;

  if (req.method === "GET") {
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

    const allowed = await hasPermission(userId, tenantId, "role.read");
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden: Missing role.read permission" });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("roles")
        .select("id, name, description")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) {
        console.error("Error fetching roles:", error);
        return res.status(500).json({ error: "Failed to fetch roles" });
      }

      return res.json(data || []);
    } catch (err) {
      console.error("Error listing roles:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    if (!tenantIdParam || typeof tenantIdParam !== "string") {
      return res.status(400).json({ error: "Missing or invalid tenantId parameter" });
    }

    const tenantId = Number(tenantIdParam);
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: "Invalid tenantId format" });
    }

    const { name, description } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Missing or invalid role name" });
    }

    const belongsToTenant = await userBelongsToTenant(userId, tenantId);
    if (!belongsToTenant) {
      return res.status(403).json({ error: "Access denied: User does not belong to this tenant" });
    }

    const allowed = await hasPermission(userId, tenantId, "role.create");
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden: Missing role.create permission" });
    }

    try {
      const trimmedName = name.trim();

      const { data: existingRole } = await supabaseAdmin
        .from("roles")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("name", trimmedName)
        .single();

      if (existingRole) {
        return res.status(409).json({ error: "Role name already exists in this tenant" });
      }

      const { data, error } = await supabaseAdmin
        .from("roles")
        .insert({
          tenant_id: tenantId,
          name: trimmedName,
          description: description || null,
        })
        .select("id, name, description");

      if (error) {
        console.error("Error creating role:", error);
        return res.status(500).json({ error: "Failed to create role" });
      }

      return res.status(201).json(data && data[0] ? data[0] : null);
    } catch (err) {
      console.error("Error creating role:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}

export default requireAuth(handler);
