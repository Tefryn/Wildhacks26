const DEFAULT_PROD_FUNCTION_URL =
  "https://us-central1-wildhacks2026.cloudfunctions.net/getPlayerSummaries";

const getSteamProfileFunctionUrl = () =>
  import.meta.env.VITE_STEAM_PROFILE_FUNCTION_URL ||
  DEFAULT_PROD_FUNCTION_URL;

export async function fetchSteamProfile(steamId, options = {}) {
  const url = new URL(options.url || getSteamProfileFunctionUrl());
  url.searchParams.set("steamId", steamId);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}
