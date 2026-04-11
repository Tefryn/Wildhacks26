/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from 'firebase-functions/params';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });
const myApiKey = defineSecret('STEAM_KEY');

export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// Simple CORS helper: allow all origins for dev. If you want to restrict,
// replace '*' with your origin like 'http://localhost:5174' or your hosting URL.
const handleCors = (req: any, res: any) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
  if (req.method === 'OPTIONS') {
    // Preflight request
    res.status(204).send('');
    return true;
  }
  return false;
};

// Response shape for GetOwnedGames when include_appinfo=1
type OwnedGame = {
  appid: number;
  name?: string;
  playtime_2weeks?: number;
  playtime_forever?: number;
  img_icon_url?: string;
  img_logo_url?: string;
  has_community_visible_stats?: boolean;
};

type GetOwnedGamesResponse = {
  response: {
    game_count?: number;
    games?: OwnedGame[];
  };
};

const fetchOwnedGames = async (
  steamId: string,
  key: string,
  includeAppInfo = true,
  includePlayedFreeGames = true
): Promise<GetOwnedGamesResponse> => {
  try {
    const params = new URLSearchParams();
    params.set('key', key);
    params.set('steamid', steamId);
    params.set('format', 'json');
    if (includeAppInfo) params.set('include_appinfo', '1');
    if (includePlayedFreeGames) params.set('include_played_free_games', '1');

    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '<no body>');
      const safeUrl = url.replace(/(key=)[^&]+/, '$1[REDACTED]');
      console.error('fetchOwnedGames non-OK response', { status: res.status, url: safeUrl, body });
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${body}`);
    }
    const data = (await res.json()) as GetOwnedGamesResponse;
    return data;
  } catch (err) {
    console.error('fetchOwnedGames error', err);
    throw err;
  }
};

export const getOwnedGames = onRequest({
  secrets: [myApiKey],
}, async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    const steamId = req.query.steamId as string;
    if (!steamId) {
      res.status(400).send('Missing steamId parameter');
      return;
    }
    const key = await myApiKey.value();
    const data = await fetchOwnedGames(steamId, key);
    // Ensure CORS headers are present on the actual response as well
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (err) {
    logger.error('getOwnedGames error', err);
    res.status(500).send('Internal Server Error:' + err);
  }
});

const fetchPlayerSummaries = async (steamId: string, key: string) => {
  const params = new URLSearchParams();
  params.set('key', key);
  params.set('steamids', steamId);
  params.set('format', 'json');
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?${params.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`PlayerSummaries HTTP ${r.status}`);
  return (await r.json());
};

export const getPlayerSummaries = onRequest({
  secrets: [myApiKey],
}, async (req: any, res: any) => {
  if (handleCors(req, res)) return;
  try {
    const steamId = req.query.steamId as string;
    if (!steamId) {
      res.status(400).send('Missing steamId parameter');
      return;
    }
    const key = await myApiKey.value();
    const data = await fetchPlayerSummaries(steamId, key);
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (err) {
    logger.error('getPlayerSummaries error', err);
    res.status(500).send('Internal Server Error:' + err);
  }
});

const fetchFriendList = async (steamId: string, key: string) => {
  const params = new URLSearchParams();
  params.set('key', key);
  params.set('steamid', steamId);
  params.set('relationship', 'friend');
  params.set('format', 'json');
  const url = `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?${params.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FriendList HTTP ${r.status}`);
  return (await r.json());
};

export const getFriendList = onRequest({
  secrets: [myApiKey],
}, async (req: any, res: any) => {
  if (handleCors(req, res)) return;
  try {
    const steamId = req.query.steamId as string;
    if (!steamId) {
      res.status(400).send('Missing steamId parameter');
      return;
    }
    const key = await myApiKey.value();
    const data = await fetchFriendList(steamId, key);
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (err) {
    logger.error('getFriendList error', err);
    res.status(500).send('Internal Server Error:' + err);
  }
});


