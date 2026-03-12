import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "ops_manager" | "analyst" | "viewer";

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
}

export function useRole() {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as unknown as UserRole[];
    },
    enabled: !!user,
  });

  const isAdmin = roles.some((r) => r.role === "admin");
  const isOpsManager = roles.some((r) => r.role === "ops_manager") || isAdmin;
  const isAnalyst = roles.some((r) => r.role === "analyst") || isOpsManager;
  const highestRole: AppRole | null = isAdmin
    ? "admin"
    : roles.some((r) => r.role === "ops_manager")
    ? "ops_manager"
    : roles.some((r) => r.role === "analyst")
    ? "analyst"
    : roles.some((r) => r.role === "viewer")
    ? "viewer"
    : null;

  return { roles, isAdmin, isOpsManager, isAnalyst, highestRole, isLoading };
}
