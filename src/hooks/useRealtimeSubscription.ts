import {useEffect, useRef} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";

export function useRealtimeSubscription(tableName: string, queryKeys: string[][]) {
  const queryClient = useQueryClient();
  // Keep a ref so the effect callback always sees the latest keys
  // without needing to re-subscribe on every render
  const queryKeysRef = useRef(queryKeys);
  useEffect(() => {
    queryKeysRef.current = queryKeys;
  });

  useEffect(() => {
    const channel = supabase
      .channel(`${tableName}-realtime-${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        () => {
          queryKeysRef.current.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // tableName and queryClient are stable; queryKeys handled via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, queryClient]);
}
