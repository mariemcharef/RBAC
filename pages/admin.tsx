import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabaseClient } from "@/lib/supabaseClient";
import RBACDashboard from "./rbacDashboardWrapper";


const AdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          router.replace("/login");
          return;
        }

        if (!session) {
          console.log("No session found, redirecting to login");
          router.replace("/login");
          return;
        }

        setSession(session);
        setLoading(false);
      } catch (err) {
        console.error("Session check error:", err);
        router.replace("/login");
      }
    };

    checkSession();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      } else {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; 
  }

  return <RBACDashboard />;
};

export default AdminPage;
