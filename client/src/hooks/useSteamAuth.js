import { useEffect, useMemo, useState } from "react";
import { fetchSteamProfile } from "../api/steamApi";
import {
  buildSteamOpenIdUrl,
  clearSteamAuthQuery,
  consumeSteamAuthReturnFromUrl,
} from "../utils/steamOpenId";

const STEAM_ID_STORAGE_KEY = "steamId";

const readStoredAuthState = () => {
  if (typeof window === "undefined") {
    return { steamId: "" };
  }

  return {
    steamId: window.localStorage.getItem(STEAM_ID_STORAGE_KEY) || "",
  };
};

const writeStoredAuthState = ({ steamId }) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STEAM_ID_STORAGE_KEY, steamId);
};

const clearStoredAuthState = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STEAM_ID_STORAGE_KEY);
};

export function useSteamAuth() {
  const [authState, setAuthState] = useState(() => readStoredAuthState());
  const [profile, setProfile] = useState(null);
  const { steamId } = authState;

  const signInUrl = useMemo(() => buildSteamOpenIdUrl(), []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!steamId) {
        setProfile(null);
        return;
      }

      try {
        const data = await fetchSteamProfile(steamId);
        if (!cancelled) {
          setProfile(data?.profile || null);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [steamId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncAuthState = () => {
      setAuthState(readStoredAuthState());
    };

    const returnedSteamId = consumeSteamAuthReturnFromUrl();

    if (returnedSteamId) {
      writeStoredAuthState({ steamId: returnedSteamId });
      syncAuthState();
      clearSteamAuthQuery();
    }

    const handleStorage = (event) => {
      if (event.key === STEAM_ID_STORAGE_KEY) {
        syncAuthState();
      }
    };

    const handleSteamChange = () => {
      syncAuthState();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("steam-id-changed", handleSteamChange);
    syncAuthState();

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("steam-id-changed", handleSteamChange);
    };
  }, []);

  const signOut = () => {
    if (typeof window === "undefined") {
      return;
    }

    clearStoredAuthState();
    setAuthState({ steamId: "" });
    window.dispatchEvent(new Event("steam-id-changed"));
  };

  return {
    steamId,
    profile,
    avatarUrl: profile?.avatar || "",
    displayName: profile?.personaName || "",
    isSignedIn: Boolean(steamId),
    signInUrl,
    signOut,
  };
}
