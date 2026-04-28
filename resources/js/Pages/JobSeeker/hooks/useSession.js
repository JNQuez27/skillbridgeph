import { useEffect, useState } from "react";
import { defaultProfile } from "../data/jobSeekerData";

const SESSION_KEY = "sbph-session";

export function getSession() {
  if (typeof window === "undefined") return defaultProfile;
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : defaultProfile;
}

export function setSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function useSessionState() {
  const [session, setSessionState] = useState(getSession());

  useEffect(() => {
    setSession(session);
  }, [session]);

  return [session, setSessionState];
}
