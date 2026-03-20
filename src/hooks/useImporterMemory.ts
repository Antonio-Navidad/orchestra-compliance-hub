import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ImporterProfile {
  id: string;
  importer_name: string;
  ein_cbp_number: string | null;
  poa_status: string;
  poa_expiry: string | null;
  bond_status: string;
  bond_number: string | null;
  surety_company: string | null;
  ach_status: boolean;
  commodity_types: string[];
  hts_codes_used: string[];
  fta_programs: string[];
  hold_count: number;
  risk_flags: string[];
  last_shipment_id: string | null;
  last_shipment_date: string | null;
  metadata: Record<string, any>;
}

export interface SupplierEntry {
  id: string;
  supplier_name: string;
  supplier_address: string | null;
  supplier_country: string | null;
  associated_importer: string | null;
  associated_hold: boolean;
  hold_details: string | null;
}

export function useImporterMemory() {
  const queryClient = useQueryClient();

  const { data: importers = [] } = useQuery({
    queryKey: ["importer-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importer_profiles" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ImporterProfile[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["supplier-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_directory" as any)
        .select("*")
        .order("supplier_name");
      if (error) throw error;
      return (data || []) as unknown as SupplierEntry[];
    },
  });

  const upsertImporter = useMutation({
    mutationFn: async (profile: Partial<ImporterProfile> & { importer_name: string }) => {
      const { data, error } = await supabase
        .from("importer_profiles" as any)
        .upsert(
          { ...profile, updated_at: new Date().toISOString() } as any,
          { onConflict: "importer_name,workspace_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["importer-profiles"] }),
  });

  const upsertSupplier = useMutation({
    mutationFn: async (supplier: Partial<SupplierEntry> & { supplier_name: string }) => {
      const { data, error } = await supabase
        .from("supplier_directory" as any)
        .upsert(supplier as any, { onConflict: "supplier_name,workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-directory"] }),
  });

  const getImporter = useCallback((name: string) => {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    return importers.find(imp => imp.importer_name.toLowerCase().trim() === lower) || null;
  }, [importers]);

  const getMatchingShipmentSuggestion = useCallback((importerName: string, commodity: string, origin: string) => {
    const profile = getImporter(importerName);
    if (!profile || !profile.last_shipment_id) return null;
    const commodityMatch = profile.commodity_types.some(c => commodity.toLowerCase().includes(c.toLowerCase()));
    if (commodityMatch) {
      return {
        shipmentId: profile.last_shipment_id,
        htsCodesUsed: profile.hts_codes_used,
        ftaPrograms: profile.fta_programs,
      };
    }
    return null;
  }, [getImporter]);

  const recordShipment = useCallback(async (importerName: string, shipmentData: {
    shipmentId: string;
    commodity: string;
    hsCode: string;
    ftaProgram?: string;
    origin: string;
  }) => {
    if (!importerName) return;
    const existing = getImporter(importerName);
    const commodities = [...new Set([...(existing?.commodity_types || []), shipmentData.commodity].filter(Boolean))];
    const htsCodes = [...new Set([...(existing?.hts_codes_used || []), shipmentData.hsCode].filter(Boolean))];
    const ftaPrograms = [...new Set([...(existing?.fta_programs || []), shipmentData.ftaProgram].filter(Boolean))];

    await upsertImporter.mutateAsync({
      importer_name: importerName,
      commodity_types: commodities,
      hts_codes_used: htsCodes,
      fta_programs: ftaPrograms,
      last_shipment_id: shipmentData.shipmentId,
      last_shipment_date: new Date().toISOString(),
    });
  }, [getImporter, upsertImporter]);

  const getSupplierAutocomplete = useCallback((query: string) => {
    if (!query || query.length < 2) return [];
    const lower = query.toLowerCase();
    return suppliers
      .filter(s => s.supplier_name.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [suppliers]);

  const isSupplierFlagged = useCallback((name: string) => {
    const supplier = suppliers.find(s => s.supplier_name.toLowerCase() === name.toLowerCase());
    return supplier?.associated_hold || false;
  }, [suppliers]);

  return {
    importers,
    suppliers,
    getImporter,
    getMatchingShipmentSuggestion,
    recordShipment,
    upsertImporter: upsertImporter.mutateAsync,
    upsertSupplier: upsertSupplier.mutateAsync,
    getSupplierAutocomplete,
    isSupplierFlagged,
  };
}
