import { useEffect, useMemo, useState } from "react";

const AUTH_KEY = "sbph-auth";

export function getAuthState() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_KEY) === "true";
}

export function setAuthState(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, value ? "true" : "false");
}

export function useAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(getAuthState());

  useEffect(() => {
    setIsAuthenticated(getAuthState());
  }, []);

  const actions = useMemo(() => ({
    signIn() {
      setAuthState(true);
      setIsAuthenticated(true);
    },
    signOut() {
      setAuthState(false);
      setIsAuthenticated(false);
    },
  }), []);

  return { isAuthenticated, ...actions };
}

export function useRequireAuth() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getAuthState()) {
      window.location.href = "/login";
    }
  }, []);
}
