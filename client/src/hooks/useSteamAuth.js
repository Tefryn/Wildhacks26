import { useEffect, useMemo, useState } from "react";
import { fetchSteamProfile } from "../api/steamApi";
import {
  buildSteamOpenIdUrl,
  clearSteamAuthQuery,
  extractSteamIdFromClaimed,
} from "../utils/steamOpenId";

const STEAM_ID_STORAGE_KEY = "steamId";

const readStoredSteamId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(STEAM_ID_STORAGE_KEY) || "";
};

export function useSteamAuth() {
  const [steamId, setSteamId] = useState(() => readStoredSteamId());
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

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

    const params = new URLSearchParams(window.location.search);
    const claimed = params.get("openid.claimed_id");
    const mode = params.get("openid.mode");

    if (mode === "id_res" && claimed) {
      const extractedSteamId = extractSteamIdFromClaimed(claimed);

      if (extractedSteamId) {
        window.localStorage.setItem(STEAM_ID_STORAGE_KEY, extractedSteamId);
        setSteamId(extractedSteamId);
        clearSteamAuthQuery();
        window.dispatchEvent(new Event("steam-id-changed"));
      }
    }

    const handleStorage = (event) => {
      if (event.key === STEAM_ID_STORAGE_KEY) {
        setSteamId(event.newValue || "");
      }
    };

    const handleSteamChange = () => {
      setSteamId(readStoredSteamId());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("steam-id-changed", handleSteamChange);
    setReady(true);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("steam-id-changed", handleSteamChange);
    };
  }, []);

  const signOut = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(STEAM_ID_STORAGE_KEY);
    setSteamId("");
    window.dispatchEvent(new Event("steam-id-changed"));
  };

  return {
    steamId,
    profile,
    avatarUrl: profile?.avatar || "",
    displayName: profile?.personaName || "",
    isSignedIn: Boolean(steamId),
    ready,
    signInUrl,
    signOut,
  };
}
