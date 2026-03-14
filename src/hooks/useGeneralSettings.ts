import { useCallback, useState, useEffect } from "react";
import { authApi } from "@/lib/api";

export function useGeneralSettings() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadUserInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authApi.me();
      setUser(response.user);
    } catch (error) {
      console.error("Failed to load user info:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  return { user, isLoading, refetch: loadUserInfo };
}
