import { useMemo } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { createApiClient } from "../lib/api";

export function useApi() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? null;

  return useMemo(
    () => createApiClient(getToken, userId, userEmail),
    [getToken, userId, userEmail]
  );
}
