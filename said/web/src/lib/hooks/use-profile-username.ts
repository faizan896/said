"use client";

import { useQuery } from "@tanstack/react-query";

export function useProfileUsername(address?: string) {
  const { data } = useQuery({
    queryKey: ["profile-username", address],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${address}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.username as string | null;
    },
    enabled: !!address,
    staleTime: 60_000,
  });
  return data ?? null;
}
