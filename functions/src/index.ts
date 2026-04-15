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
//import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Cost control
setGlobalOptions({ maxInstances: 10 });
//const geminiKey = defineSecret('GEMINI_KEY');

// Simple CORS helper: allow all origins for dev. If you want to restrict,
// replace '*' with your origin like 'http://localhost:5174' or your hosting URL.
const handleCors = (req: any, res: any) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');
  res.set('Access-Control-Max-Age', '3600');
  if (req.method === 'OPTIONS') {
    // Preflight request
    res.status(204).send('');
    return true;
  }
  return false;
};

const getSteamApiKeyFromRequest = (req: any): string => {
  const queryKey = typeof req?.query?.apiKey === 'string' ? req.query.apiKey : '';
  const bodyKey = typeof req?.body?.apiKey === 'string' ? req.body.apiKey : '';
  return (queryKey || bodyKey).trim();
};

// Response shape for GetOwnedGames when include_appinfo=1
type Game = {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
  img_logo_url?: string;
  achievements: string[];
  rarityWeightedAchievementScore: number;
};

type Achievement = {
  api_name: string;
  name: string;
  achieved: boolean | number;
  date_unlocked: Date;
  percent: number;
  game_id: number;
}

type SteamPlayerAchievement = {
  apiname?: string;
  name?: string;
  achieved?: boolean | number;
  unlocktime?: number;
};

type GetOwnedGamesResponse = {
  response: {
    games: Game[]
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

export const getOwnedGames = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  try {
    const steamId = req.query.steamId as string;
    const apiKey = getSteamApiKeyFromRequest(req);
    if (!steamId) {
      res.status(400).send('Missing steamId parameter');
      return;
    }
    if (!apiKey) {
      res.status(400).json({ error: 'Missing apiKey parameter' });
      return;
    }
    const data = await fetchOwnedGames(steamId, apiKey);
    // Ensure CORS headers are present on the actual response as well
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (err) {
    logger.error('getOwnedGames error', err);
    res.status(500).send('Internal Server Error:' + err);
  }
});

type PlayerSummary = {
  steamid: string;
  personaname?: string;
  avatar?: string;
  avatarmedium?: string;
  avatarfull?: string;
  profileurl?: string;
  personastate?: number;
};

type GetPlayerSummariesResponse = {
  response: {
    players?: PlayerSummary[];
  };
};

const fetchPlayerSummaries = async (
  steamId: string,
  key: string,
): Promise<GetPlayerSummariesResponse> => {
  try {
    const params = new URLSearchParams();
    params.set('key', key);
    params.set('steamids', steamId);
    params.set('format', 'json');

    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '<no body>');
      const safeUrl = url.replace(/(key=)[^&]+/, '$1[REDACTED]');
      console.error('fetchPlayerSummaries non-OK response', { status: res.status, url: safeUrl, body });
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${body}`);
    }

    const data = (await res.json()) as GetPlayerSummariesResponse;
    return data;
  } catch (err) {
    console.error('fetchPlayerSummaries error', err);
    throw err;
  }
};

export const getPlayerSummaries = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const steamId = req.query.steamId as string;
    const apiKey = getSteamApiKeyFromRequest(req);
    if (!steamId) {
      res.status(400).send('Missing steamId parameter');
      return;
    }
    if (!apiKey) {
      res.status(400).json({ error: 'Missing apiKey parameter' });
      return;
    }

    const data = await fetchPlayerSummaries(steamId, apiKey);
    const player = data.response.players?.[0] ?? null;

    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      steamId,
      profile: player
        ? {
            steamId: player.steamid,
            personaName: player.personaname ?? 'Steam User',
            avatar: player.avatarfull ?? player.avatarmedium ?? player.avatar ?? '',
            profileUrl: player.profileurl ?? '',
            personaState: player.personastate ?? 0,
          }
        : null,
    });
  } catch (err) {
    logger.error('getPlayerSummaries error', err);
    res.status(500).send('Internal Server Error:' + err);
  }
});


interface GameVec {
  appid: number;
  featureVector: number[];
  similarity: number;
}

const cosineSimilarity = (a: number[], b: number[]): number => {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB || 1);
};

// Given a seed game, rank all others by similarity
const recommend = (
  seedAppid: number,
  table: GameVec[],
  topN: number = 10
): GameVec[] => {
  const seed = table.find((g) => g.appid === seedAppid);
  if (!seed) {
    throw new Error(`Game with appid ${seedAppid} not found in table`);
  }
  
  return table
    .filter((g) => g.appid !== seedAppid)
    .map((g) => {
      const numericSimilarity = cosineSimilarity(seed.featureVector.slice(0, 3), g.featureVector.slice(0, 3));
      const tagSimilarity = cosineSimilarity(seed.featureVector.slice(3), g.featureVector.slice(3));

      const finalScore = 0.8 * tagSimilarity + 0.2 * numericSimilarity;
      return { ...g, similarity: finalScore}
    })
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, topN);
};

export const getSimilarGames = onRequest({
  maxInstances: 5,
}, async (req: any, res: any) => {
  if (handleCors(req, res)) return;
  
  try {
    const appid = parseInt(req.query.appid as string, 10);
    const topN = parseInt(req.query.topN as string, 10) || 10;

    if (!appid || isNaN(appid)) {
      res.status(400).json({ error: 'Missing or invalid appid parameter' });
      return;
    }

    logger.info(`Getting ${topN} similar games for appid: ${appid}`);

    const gamesSnapshot = await db
      .collection('games')
      .select('featureVector', 'name')
      .get();

    if (gamesSnapshot.empty) {
      res.status(404).json({ error: 'No games found in database' });
      return;
    }

    // Convert Firestore docs to Game interface
    const gameTable: GameVec[] = gamesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        appid: parseInt(doc.id, 10),
        featureVector: data.featureVector || [],
        ...data,
      } as GameVec;
    });

    // Use content-similarity to get recommendations
    const similarGames = recommend(appid, gameTable, topN);

    logger.info(`Found ${similarGames.length} similar games for appid ${appid}`);

    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      appid,
      similarGames: similarGames.map((g) => ({
        appid: g.appid,
        similarity: g.similarity,
      })),
    });
  } catch (err) {
    logger.error('getSimilarGames error', err);
    res.status(500).json({ error: `Internal Server Error: ${err}` });
  }
});

const fetchPlayerAchievements = async (
  steamId: string,
  appId: number,
  key: string
): Promise<Achievement[]> => {
  const params = new URLSearchParams();
  params.set('key', key);
  params.set('steamid', steamId);
  params.set('appid', String(appId));
  params.set('l', 'en');
  params.set('format', 'json');

  const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    return [];
  }

  const json = (await res.json()) as {
    playerstats?: { achievements?: SteamPlayerAchievement[] };
  };

  const rawAchievements = json.playerstats?.achievements ?? [];
  return rawAchievements
    .filter((a) => typeof a.apiname === 'string' && a.apiname.length > 0)
    .map((a) => ({
      api_name: a.apiname as string,
      name: a.name ?? a.apiname ?? '',
      achieved: a.achieved ?? 0,
      date_unlocked: new Date((a.unlocktime ?? 0) * 1000),
      percent: 0,
      game_id: appId,
    }));
};

const fetchGlobalAchievementPercentages = async (
  appId: number
): Promise<Map<string, number>> => {
  const params = new URLSearchParams();
  params.set('gameid', String(appId));
  params.set('format', 'json');
  const url = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    return new Map<string, number>();
  }

  const json = (await res.json()) as {
    achievementpercentages?: {
      achievements?: Array<{ name: string; percent: number }>;
    };
  };

  const result = new Map<string, number>();
  for (const a of json.achievementpercentages?.achievements ?? []) {
    result.set(a.name, a.percent);
  }
  return result;
};

export const getGames = onRequest(async (req: any, res: any) => {
  if (handleCors(req, res)) return;

  try {
    const steamId = req.query.steamId as string;
    const apiKey = getSteamApiKeyFromRequest(req);
    if (!steamId) {
      res.status(400).json({ error: 'Missing steamId parameter' });
      return;
    }
    if (!apiKey) {
      res.status(400).json({ error: 'Missing apiKey parameter' });
      return;
    }

    logger.info(`Fetching games for Steam ID: ${steamId}`);

    const ownedGamesResponse = await fetchOwnedGames(steamId, apiKey);
    const games = ownedGamesResponse.response.games ?? [];

    logger.info(`Found ${games.length} games for user`);

    // Fetch achievements and global percentages for each game in parallel
    const allAchievements: Achievement[] = [];
    const gamesWithAchievements = await Promise.all(
      games.map(async (game) => {
        try {
          const [achievements, globalPercentages] = await Promise.all([
            fetchPlayerAchievements(steamId, game.appid, apiKey),
            fetchGlobalAchievementPercentages(game.appid),
          ]);

          // Calculate rarity-weighted achievement score
          let rarityWeightedAchievementScore = 0;
          const achievementIds: string[] = [];

          for (const achievement of achievements) {
            const globalPercent = globalPercentages.get(achievement.api_name) ?? 0;
            const rarityScore = 1 - globalPercent / 100;
            rarityWeightedAchievementScore += rarityScore;

            // Add achievement to the master list
            allAchievements.push({
              api_name: achievement.api_name,
              name: achievement.name,
              achieved: achievement.achieved,
              date_unlocked: achievement.date_unlocked,
              percent: globalPercent,
              game_id: game.appid,
            });
            achievementIds.push(achievement.api_name);
          }

          return {
            appid: game.appid,
            name: game.name,
            playtime_forever: game.playtime_forever ?? 0,
            img_icon_url: game.img_icon_url,
            img_logo_url: game.img_logo_url,
            achievements: achievementIds,
            rarityWeightedAchievementScore
          };
        } catch (err) {
          logger.warn(`Error fetching achievements for app ${game.appid}:`, err);
          return {
            appid: game.appid,
            name: game.name,
            playtime_forever: game.playtime_forever ?? 0,
            img_icon_url: game.img_icon_url,
            img_logo_url: game.img_logo_url,
            achievements: [],
            rarityWeightedAchievementScore: 0
          };
        }
      })
    );

    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      steamId,
      games: gamesWithAchievements,
      achievements: allAchievements,
    });
  } catch (err) {
    logger.error('getGames error', err);
    res.status(500).json({ error: `Internal Server Error: ${err}` });
  }
});

// export const getAIResponse = onRequest({
//   secrets: [geminiKey],
// }, async (req: any, res: any) => {
//   if (handleCors(req, res)) return;


//   try {
//     const { eraId, eraName, games, achievements } = req.body;

//     // Validate required fields
//     if (!eraId || !eraName || !games || !achievements) {
//       res.status(400).json({ error: 'Missing required fields: eraId, eraName, games, achievements' });
//       return;
//     }

//     const key = await geminiKey.value();

//     // Build the era-specific gaming habit prompt
//     const gameList = games
//       .slice(0, 10)
//       .map((g: any) => `- ${g.name} (${g.achievements?.length || 0} achievements)`)
//       .join('\n');

//     const achievedCount = achievements.filter((a: any) => a.achieved).length;

//     const eraPrompt = `Analyze this gamer's ${eraName} era and write a quirky, fun, memorable description of their gaming habits during this period.

// Era: ${eraName}
// Total Games: ${games.length}
// Achievements Unlocked: ${achievedCount}

// Top Games Played:
// ${gameList}

// Write a creative, personality-filled paragraph (2-3 sentences) that captures their gaming essence during this era. Be quirky, use humor, and make it memorable! Reference specific games if interesting. Highlight their playstyle (completionist, casual, speedrunner, achievement hunter, etc.).`;

//     const systemInstruction = `You are a witty gaming historian analyzing a player's gaming habits. Your responses should be:
// - Quirky and personality-filled (use humor and creative language)
// - Specific to their games and playstyle
// - Memorable and unique
// - 2-3 sentences that capture the essence of their gaming era
// - Avoid generic descriptions; reference specific games and habits when possible`;

//     const requestBody = {
//       contents: [{ parts: [{ text: eraPrompt }] }],
//       systemInstruction: {
//         parts: [{ text: systemInstruction }],
//       },
//     };

//     const geminiRes = await fetch(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
//       {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(requestBody),
//       }
//     );

//     if (!geminiRes.ok) {
//       const body = await geminiRes.text().catch(() => '<no body>');
//       logger.error('Gemini API error', { status: geminiRes.status, body });
//       res.status(502).json({ error: `Gemini API error: ${geminiRes.status} - ${body}` });
//       return;
//     }

//     const geminiData = (await geminiRes.json()) as {
//       candidates?: Array<{
//         content?: {
//           parts?: Array<{ text?: string }>;
//         };
//       }>;
//     };

//     const quirkyInsight = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Unable to generate insight';

//     res.set('Access-Control-Allow-Origin', '*');
//     res.status(200).json({
//       eraId,
//       eraName,
//       insight: quirkyInsight
//     });
//   } catch (err) {
//     logger.error('getAIResponse error', err);
//     res.status(500).json({ error: `Internal Server Error: ${err}` });
//   }
// });

/**
 * Get Game Details - Proxy to Steam API to bypass CORS restrictions
 * Fetches game details from Steam Store API
 * 
 * @param appId - Steam App ID
 * @returns Game details object (name, header image, genres, etc.)
 */
export const getGameDetails = onRequest(async (req: any, res: any) => {
    if (handleCors(req, res)) return;
    try {
      const appId = req.query.appid || req.query.appId;

      if (!appId || !/^\d+$/.test(String(appId))) {
        res.status(400).json({
          error: 'Invalid appId - must be numeric',
          appId,
        });
        return;
      }

      // Fetch from Steam API
      const steamResponse = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}`
      );

      if (!steamResponse.ok) {
        res.status(steamResponse.status).json({
          error: 'Failed to fetch from Steam API',
          appId,
        });
        return;
      }

      const steamData = (await steamResponse.json()) as Record<string, any>;
      const gameData = steamData[String(appId)];

      if (!gameData || !gameData.success) {
        res.status(404).json({
          error: 'Game not found',
          appId,
        });
        return;
      }

      const data = gameData.data || {};

      // Extract relevant game details
      const gameDetails = {
        appId: parseInt(String(appId)),
        name: data.name || `App ${appId}`,
        headerImage: data.header_image || null,
        releaseDate: data.release_date?.date || null,
        developers: data.developers || [],
        publishers: data.publishers || [],
        genres: (data.genres || []).map((g: any) => g.description),
        categories: (data.categories || []).map((c: any) => c.description),
        shortDescription: data.short_description || null,
      };

      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).json(gameDetails);
    } catch (error) {
      logger.error('getGameDetails error', error);
      res.set('Access-Control-Allow-Origin', '*');
      res.status(500).json({
        error: 'Failed to fetch game details',
        appId: req.query.appid || req.query.appId,
      });
    }
  }
);

