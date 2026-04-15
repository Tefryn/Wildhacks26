const STEAM_API_KEY_STORAGE_KEY = "steamApiKey";
const STEAM_API_KEY_EVENT = "steam-api-key-changed";

export const getStoredSteamApiKey = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(STEAM_API_KEY_STORAGE_KEY) || "";
};

export const setStoredSteamApiKey = (apiKey) => {
  if (typeof window === "undefined") {
    return;
  }

  const trimmedKey = String(apiKey || "").trim();
  window.localStorage.setItem(STEAM_API_KEY_STORAGE_KEY, trimmedKey);
  window.dispatchEvent(new Event(STEAM_API_KEY_EVENT));
};

export const clearStoredSteamApiKey = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STEAM_API_KEY_STORAGE_KEY);
  window.dispatchEvent(new Event(STEAM_API_KEY_EVENT));
};

export const addSteamApiKeyChangeListener = (listener) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(STEAM_API_KEY_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(STEAM_API_KEY_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
};
