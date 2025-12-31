import type { NextApiResponse } from "next";
import { requireAuth, type AuthenticatedNextApiRequest } from "@/lib/middleware/auth";
import { supabaseClient } from "@/lib/supabaseClient";

async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { data, error } = await supabaseClient
      .from("permissions")
      .select("id, key, description")
      .order("key");

    if (error) {
      console.error("Error fetching permissions:", error);
      return res.status(500).json({ error: "Failed to fetch permissions" });
    }

    return res.json(data || []);
  } catch (err) {
    console.error("Error listing permissions:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default requireAuth(handler);