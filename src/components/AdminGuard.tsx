import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client.ts";
import { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAdminStatus(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkAdminStatus(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (session: Session | null) => {
    if (!session) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!error && data && data.role === "admin") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session) {
    navigate("/auth");
    return null;
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md mx-auto p-8">
          <div className="bg-red-50 border border-red-200 rounded-full p-6 w-fit mx-auto">
            <Shield className="h-16 w-16 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Truy Cập Bị Từ Chối</h1>
            <p className="text-muted-foreground">
              Bạn không có quyền truy cập vào trang quản trị. Chỉ có quản trị viên mới có thể truy cập trang này.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate("/")}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Về Trang Chủ
            </button>
            
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Đăng Xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render admin content if user is admin
  return <>{children}</>;
};
