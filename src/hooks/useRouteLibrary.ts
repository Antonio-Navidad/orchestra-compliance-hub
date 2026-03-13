import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { NewRouteData } from "@/components/NewRouteBuilder";

export interface SavedRoute {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  status: string; // draft | saved | archived | deleted
  is_template: boolean;
  origin_name: string | null;
  destination_name: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  mode: string;
  segments: any;
  network_route: any;
  notes: string;
  sensitivity: string;
  tags: string[];
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useRouteLibrary() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [deletedRoutes, setDeletedRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<SavedRoute | null>(null);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("saved_routes" as any)
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setRoutes((data as any[]) || []);

      // Fetch recently deleted
      const { data: deleted } = await supabase
        .from("saved_routes" as any)
        .select("*")
        .eq("user_id", user.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .limit(20);

      setDeletedRoutes((deleted as any[]) || []);
    } catch (e) {
      console.error("Failed to fetch routes:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const saveRoute = useCallback(async (routeData: NewRouteData, notes = "", sensitivity = "medium") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Sign in to save routes"); return null; }

      const firstSeg = routeData.segments[0];
      const record = {
        user_id: user.id,
        name: routeData.name || "Unnamed Route",
        status: routeData.routeState === "rendered" ? "saved" : "draft",
        is_template: routeData.isTemplate,
        origin_name: firstSeg?.from.resolvedName || firstSeg?.from.name || null,
        origin_lat: firstSeg?.from.lat || null,
        origin_lng: firstSeg?.from.lng || null,
        destination_name: firstSeg?.to.resolvedName || firstSeg?.to.name || null,
        destination_lat: firstSeg?.to.lat || null,
        destination_lng: firstSeg?.to.lng || null,
        mode: firstSeg?.mode || "sea",
        segments: routeData.segments,
        network_route: routeData.networkRoute || null,
        notes,
        sensitivity,
      };

      const { data, error } = await supabase
        .from("saved_routes" as any)
        .insert(record as any)
        .select("*")
        .single();

      if (error) throw error;
      toast.success(`Route "${record.name}" saved`);
      await fetchRoutes();
      return data as any as SavedRoute;
    } catch (e: any) {
      toast.error("Failed to save route: " + e.message);
      return null;
    }
  }, [fetchRoutes]);

  const updateRoute = useCallback(async (id: string, updates: Partial<SavedRoute>) => {
    try {
      const { error } = await supabase
        .from("saved_routes" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      await fetchRoutes();
    } catch (e: any) {
      toast.error("Failed to update route: " + e.message);
    }
  }, [fetchRoutes]);

  const softDelete = useCallback(async (id: string) => {
    const route = routes.find(r => r.id === id);
    try {
      const { error } = await supabase
        .from("saved_routes" as any)
        .update({ deleted_at: new Date().toISOString(), status: "deleted" } as any)
        .eq("id", id);
      if (error) throw error;
      setLastDeleted(route || null);
      await fetchRoutes();
      toast("Route deleted", {
        action: {
          label: "Undo",
          onClick: () => restoreRoute(id),
        },
      });
    } catch (e: any) {
      toast.error("Failed to delete route: " + e.message);
    }
  }, [routes, fetchRoutes]);

  const restoreRoute = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_routes" as any)
        .update({ deleted_at: null, status: "saved" } as any)
        .eq("id", id);
      if (error) throw error;
      setLastDeleted(null);
      await fetchRoutes();
      toast.success("Route restored");
    } catch (e: any) {
      toast.error("Failed to restore: " + e.message);
    }
  }, [fetchRoutes]);

  const permanentDelete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_routes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchRoutes();
      toast.success("Route permanently deleted");
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  }, [fetchRoutes]);

  const duplicateRoute = useCallback(async (id: string) => {
    const route = routes.find(r => r.id === id) || deletedRoutes.find(r => r.id === id);
    if (!route) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("saved_routes" as any)
        .insert({
          user_id: user.id,
          name: route.name + " (copy)",
          status: "draft",
          is_template: false,
          origin_name: route.origin_name,
          origin_lat: route.origin_lat,
          origin_lng: route.origin_lng,
          destination_name: route.destination_name,
          destination_lat: route.destination_lat,
          destination_lng: route.destination_lng,
          mode: route.mode,
          segments: route.segments,
          network_route: route.network_route,
          notes: route.notes,
          sensitivity: route.sensitivity,
        } as any);
      if (error) throw error;
      await fetchRoutes();
      toast.success("Route duplicated");
    } catch (e: any) {
      toast.error("Failed to duplicate: " + e.message);
    }
  }, [routes, deletedRoutes, fetchRoutes]);

  return {
    routes,
    deletedRoutes,
    loading,
    lastDeleted,
    saveRoute,
    updateRoute,
    softDelete,
    restoreRoute,
    permanentDelete,
    duplicateRoute,
    refresh: fetchRoutes,
  };
}
