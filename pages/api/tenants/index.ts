import type { NextApiResponse } from "next";
import { requireAuth, type AuthenticatedNextApiRequest } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const userId = req.user.dbUserId;

  try {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select(`
        roles!inner (
          tenant_id,
          tenants!inner (
            id,
            name
          )
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching tenants:", error);
      return res.status(500).json({ error: "Failed to fetch tenants" });
    }

    const tenantsMap = new Map<number, { id: number; name: string }>();
    
    data?.forEach((userRole: any) => {
      const tenant = userRole.roles?.tenants;
      if (tenant) {
        tenantsMap.set(tenant.id, {
          id: Number(tenant.id),
          name: tenant.name
        });
      }
    });

    const tenants = Array.from(tenantsMap.values());

    return res.json(tenants);
  } catch (err) {
    console.error("Error in tenants endpoint:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default requireAuth(handler);
