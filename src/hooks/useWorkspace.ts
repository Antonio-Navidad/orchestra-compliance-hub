import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  joined_at: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  switchWorkspace: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  currentMemberRole: string | null;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  currentWorkspace: null,
  members: [],
  isLoading: true,
  switchWorkspace: () => {},
  refreshWorkspaces: async () => {},
  currentMemberRole: null,
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function useWorkspaceProvider() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true });

    const ws = (data || []) as unknown as Workspace[];
    setWorkspaces(ws);

    // Restore last workspace from localStorage or pick first
    const savedId = localStorage.getItem("orchestra-workspace-id");
    const saved = ws.find((w) => w.id === savedId);
    const active = saved || ws[0] || null;
    setCurrentWorkspace(active);

    if (active) {
      localStorage.setItem("orchestra-workspace-id", active.id);
      // Load members for current workspace
      const { data: memberData } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", active.id);
      setMembers((memberData || []) as unknown as WorkspaceMember[]);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const switchWorkspace = useCallback(async (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;
    setCurrentWorkspace(ws);
    localStorage.setItem("orchestra-workspace-id", id);

    const { data: memberData } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", id);
    setMembers((memberData || []) as unknown as WorkspaceMember[]);
  }, [workspaces]);

  const currentMemberRole = user
    ? members.find((m) => m.user_id === user.id)?.role || null
    : null;

  return {
    workspaces,
    currentWorkspace,
    members,
    isLoading,
    switchWorkspace,
    refreshWorkspaces: loadWorkspaces,
    currentMemberRole,
  };
}
