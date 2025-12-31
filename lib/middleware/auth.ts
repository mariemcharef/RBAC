
import type { NextApiRequest, NextApiResponse, NextApiHandler } from "next";
import { supabaseClient } from "@/lib/supabaseClient";

export interface AuthenticatedNextApiRequest extends NextApiRequest {
  user: {
    id: string;        
    email: string;
    dbUserId: number;  
  };
}

type AuthenticatedNextApiHandler = (
  req: AuthenticatedNextApiRequest,
  res: NextApiResponse
) => void | Promise<void>;

export function requireAuth(
  handler: AuthenticatedNextApiHandler
): NextApiHandler {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token" });
      }

      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }

      const { data: dbUser, error: dbError } = await supabaseClient
        .from("users")
        .select("id, email")
        .eq("auth_id", user.id)
        .single();

      if (dbError || !dbUser) {
        return res.status(401).json({ error: "User not found in database" });
      }

      (req as AuthenticatedNextApiRequest).user = {
        id: user.id,
        email: user.email ?? "",
        dbUserId: Number(dbUser.id),
      };

      return handler(req as AuthenticatedNextApiRequest, res);
    } catch (err) {
      console.error("Auth middleware error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
