const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
let steamAuthCallbackConsumed = false;

const getCurrentReturnTo = () => {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.origin}${window.location.pathname}`;
};

const getCurrentRealm = () => {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.origin}/`;
};

export const buildSteamOpenIdUrl = (returnTo, realm) => {
  const url = new URL(OPENID_ENDPOINT);
  url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0");
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", returnTo || getCurrentReturnTo());
  url.searchParams.set("openid.realm", realm || getCurrentRealm());
  url.searchParams.set(
    "openid.identity",
    "http://specs.openid.net/auth/2.0/identifier_select",
  );
  url.searchParams.set(
    "openid.claimed_id",
    "http://specs.openid.net/auth/2.0/identifier_select",
  );
  return url.toString();
};

export const extractSteamIdFromClaimed = (claimedId) => {
  if (!claimedId) {
    return null;
  }

  try {
    const parsedUrl = new URL(claimedId);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    const candidate = parts[parts.length - 1];

    if (candidate && /^\d{17}$/.test(candidate)) {
      return candidate;
    }

    return null;
  } catch {
    return null;
  }
};

export const clearSteamAuthQuery = () => {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.search = "";
  window.history.replaceState({}, document.title, nextUrl.toString());
};

export const getSteamAuthReturnSteamId = (search) => {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(search || window.location.search);
  if (params.get("openid.mode") !== "id_res") {
    return null;
  }

  return extractSteamIdFromClaimed(params.get("openid.claimed_id"));
};

export const consumeSteamAuthReturnFromUrl = () => {
  if (typeof window === "undefined" || steamAuthCallbackConsumed) {
    return null;
  }

  const steamId = getSteamAuthReturnSteamId();
  if (!steamId) {
    return null;
  }

  steamAuthCallbackConsumed = true;
  return steamId;
};
