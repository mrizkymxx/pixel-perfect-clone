import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MasterOrder, StockMaterial } from "@/lib/ppic-types";

export function useOrders(opts: { activeOnly?: boolean; releasedOrFinished?: boolean } = {}) {
  const { activeOnly = false, releasedOrFinished = false } = opts;

  const query = useQuery({
    queryKey: ["orders", { activeOnly, releasedOrFinished }],
    queryFn: async () => {
      let q = supabase.from("master_orders").select("*").order("delivery_date", { ascending: true, nullsFirst: false });
      if (activeOnly) q = q.eq("is_finished", false).eq("is_released", false);
      if (releasedOrFinished) q = q.or("is_released.eq.true,is_finished.eq.true");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MasterOrder[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "master_orders" }, () => {
        query.refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
}

export function useStock() {
  return useQuery({
    queryKey: ["stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_materials").select("*").order("substance");
      if (error) throw error;
      return (data ?? []) as StockMaterial[];
    },
  });
}

export function useSetting(key: string) {
  return useQuery({
    queryKey: ["setting", key],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("key", key).maybeSingle();
      if (error) throw error;
      return data?.value ?? "";
    },
  });
}
