const DEFAULT_PROD_FUNCTION_URL =
  "https://us-central1-wildhacks2026.cloudfunctions.net/getPlayerSummaries";
import { getStoredSteamApiKey } from "../utils/steamApiKey";

const getSteamProfileFunctionUrl = () =>
  import.meta.env.VITE_STEAM_PROFILE_FUNCTION_URL ||
  DEFAULT_PROD_FUNCTION_URL;

export async function fetchSteamProfile(steamId, options = {}) {
  const apiKey = (options.apiKey || getStoredSteamApiKey() || "").trim();
  if (!apiKey) {
    throw new Error("Steam API key is required");
  }

  const url = new URL(options.url || getSteamProfileFunctionUrl());
  url.searchParams.set("steamId", steamId);
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}
