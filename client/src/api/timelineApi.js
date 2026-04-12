/**
 * Timeline API - Frontend API calls for timeline data
 */

const DEFAULT_TIMELINE_URL = "https://getGames-e4wyzyxcia-uc.a.run.app";

/**
 * Fetches game details from backend (local in dev, Firebase in production)
 * @param {number} appId - Steam App ID
 * @returns {Promise<Object>} - Game details object
 */
export async function getGameDetails(appId) {
  // Use local backend in development, Firebase in production
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const gameDetailsUrl = isDev
    ? `http://localhost:5000/api/games/details/${appId}`
    : `https://us-central1-wildhacks26.cloudfunctions.net/getGameDetails?appId=${appId}`;
  
  try {
    const response = await fetch(gameDetailsUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch game details for ${appId}:`, error);
    return null;
  }
}

/**
 * Fetches timeline data for a Steam user
 * @param {string} steamId - Steam ID of the user
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Timeline data with eras
 */

const SEASON_BY_MONTH = [
  "Winter",
  "Winter",
  "Spring",
  "Spring",
  "Spring",
  "Summer",
  "Summer",
  "Summer",
  "Fall",
  "Fall",
  "Fall",
  "Winter",
];

const getSeason = (monthIndex) => SEASON_BY_MONTH[monthIndex] || "Unknown";

const getSeasonKey = (date) => {
  const season = getSeason(date.getUTCMonth());
  const year = date.getUTCFullYear();
  return `${year}-${season}`;
};

const getSeasonLabel = (date) =>
  `${getSeason(date.getUTCMonth())} ${date.getUTCFullYear()}`;

const parseUnlockDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() <= 1970) return null;
  return date;
};

const getSeasonSortIndex = (season) => {
  switch (season) {
    case "Spring":
      return 0;
    case "Summer":
      return 1;
    case "Fall":
      return 2;
    case "Winter":
      return 3;
    default:
      return 4;
  }
};

function bucketizeTimelineData(data) {
  if (!data) {
    return { eras: [], steamId: null };
  }

  const games = Array.isArray(data?.games) ? data.games : [];
  const achievements = Array.isArray(data?.achievements)
    ? data.achievements
    : [];

  // Create game map for quick lookup
  const gameMap = new Map(games.map((game) => [Number(game.appid), game]));
  const bucketMap = new Map();
  let firstUnlock = null;
  let lastUnlock = null;

  // Bucket achievements by season
  for (const achievement of achievements) {
    if (!achievement?.achieved) continue;

    const unlockDate = parseUnlockDate(achievement.date_unlocked);
    if (!unlockDate) continue;

    const game = gameMap.get(Number(achievement.game_id));
    if (!game) continue;

    // Check if achievement api_name is in game's achievement list
    const gameAchievements = Array.isArray(game.achievements)
      ? game.achievements
      : [];
    const achievementApiName = achievement.api_name || achievement.name;
    if (!gameAchievements.includes(achievementApiName)) continue;

    const bucketKey = getSeasonKey(unlockDate);
    if (!bucketMap.has(bucketKey)) {
      bucketMap.set(bucketKey, []);
    }

    bucketMap.get(bucketKey).push({ game, achievement });

    if (!firstUnlock || unlockDate < firstUnlock) firstUnlock = unlockDate;
    if (!lastUnlock || unlockDate > lastUnlock) lastUnlock = unlockDate;
  }

  // Sort and transform buckets into eras
  const eras = Array.from(bucketMap.entries())
    .sort(([leftKey], [rightKey]) => {
      const [leftYear, leftSeason] = leftKey.split("-");
      const [rightYear, rightSeason] = rightKey.split("-");
      const yearDiff = Number(leftYear) - Number(rightYear);
      if (yearDiff !== 0) return yearDiff;
      return getSeasonSortIndex(leftSeason) - getSeasonSortIndex(rightSeason);
    })
    .map(([bucketKey, events]) => {
      const [yearString, season] = bucketKey.split("-");
      const year = Number(yearString);
      const seasonMonthIndex =
        {
          Spring: 2,
          Summer: 5,
          Fall: 8,
          Winter: 0,
        }[season] ?? 0;

      const startDate = new Date(Date.UTC(year, seasonMonthIndex, 1));
      const endMonth =
        season === "Spring"
          ? 4
          : season === "Summer"
            ? 7
            : season === "Fall"
              ? 10
              : 2;
      const endDate = new Date(Date.UTC(year, endMonth + 1, 0));

      const gamesById = new Map();

      // Group events by game appid
      for (const event of events) {
        const appId = Number(event.game.appid);
        if (gamesById.has(appId)) continue;

        const matchedAchievements = events
          .filter((candidate) => Number(candidate.game.appid) === appId)
          .map((candidate) => ({
            api_name:
              candidate.achievement.api_name || candidate.achievement.name,
            name: candidate.achievement.name,
            achieved: candidate.achievement.achieved,
            date_unlocked: candidate.achievement.date_unlocked,
            percent: candidate.achievement.percent,
            game_id: candidate.achievement.game_id,
          }))
          .sort(
            (left, right) =>
              new Date(left.date_unlocked) - new Date(right.date_unlocked),
          );

        const playtimeHours = (Number(event.game.playtime_forever) || 0) / 60;

        gamesById.set(appId, {
          appId,
          name: event.game.name || String(appId),
          playtimeHours,
          achievements: matchedAchievements,
          rarityWeightedAchievementScore:
            Number(event.game.rarityWeightedAchievementScore) || 0,
          genres: Array.isArray(event.game.genres) ? event.game.genres : [],
          tags: Array.isArray(event.game.tags) ? event.game.tags : [],
        });
      }

      const eraGames = Array.from(gamesById.values()).sort(
        (left, right) => right.playtimeHours - left.playtimeHours,
      );

      const totalHours = eraGames.reduce(
        (sum, game) => sum + game.playtimeHours,
        0,
      );
      const achievementCount = eraGames.reduce(
        (sum, game) => sum + game.achievements.length,
        0,
      );
      const averageHoursPerGame =
        eraGames.length > 0 ? totalHours / eraGames.length : 0;

      return {
        eraId: bucketKey,
        name: getSeasonLabel(startDate),
        year: startDate.getUTCFullYear(),
        season: getSeason(startDate.getUTCMonth()),
        dateRange: {
          start: startDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          end: endDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        },
        stats: {
          totalHours,
          gameCount: eraGames.length,
          achievementCount,
          averageHoursPerGame,
        },
        dominantGenres: [],
        games: eraGames,
        topGames: [...eraGames],
        description: `You unlocked ${achievementCount} achievements across ${eraGames.length} games during ${getSeasonLabel(startDate)}.`,
      };
    });

  return {
    steamId: data?.steamId ?? null,
    timeline: {
      totalHours: eras.reduce((sum, era) => sum + era.stats.totalHours, 0),
      gameCount: new Set(eras.flatMap((era) => era.games.map((g) => g.appId)))
        .size,
      achievementCount: eras.reduce(
        (sum, era) => sum + era.stats.achievementCount,
        0,
      ),
      dateRange: {
        start: firstUnlock
          ? firstUnlock.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : null,
        end: lastUnlock
          ? lastUnlock.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : null,
      },
    },
    eras,
  };
}
export async function fetchTimeline(steamId, options = {}) {
  const url = new URL(options.url || DEFAULT_TIMELINE_URL);
  url.searchParams.set("steamId", steamId);

  if (options.maxGames) {
    url.searchParams.set("maxGames", String(options.maxGames));
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // console.log(data);
    const bucketizedData = bucketizeTimelineData(data);

    const data_for_similarity = bucketizedData.eras.reduce((acc, era) => {
      const eraGames = Array.isArray(era?.games) ? era.games : [];
      if (eraGames.length === 0) return acc;

      const topGame = [...eraGames].sort((left, right) => {
        const leftCount = Array.isArray(left?.achievements)
          ? left.achievements.length
          : 0;
        const rightCount = Array.isArray(right?.achievements)
          ? right.achievements.length
          : 0;
        if (rightCount !== leftCount) return rightCount - leftCount;
        return (
          (Number(right?.playtimeHours) || 0) -
          (Number(left?.playtimeHours) || 0)
        );
      })[0];

      if (!topGame) return acc;

      const label = era.eraId.toLowerCase();
      acc[label] = Number(topGame.appId) || null;

      return acc;
    }, {});

    // console.log(data_for_similarity);

    console.log(bucketizedData);

    return bucketizedData;
  } catch (error) {
    console.error("Failed to fetch timeline:", error);
    throw error;
  }
}

export { bucketizeTimelineData };

export async function getSimilarGames(appId) {
  if (!appId) {
    console.error("appId is required");
    return null;
  }

  try {
    const response = await fetch(
      "https://getsimilargames-e4wyzyxcia-uc.a.run.app?appid=" + appId,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "Similar games API error:",
        errorData.error || `HTTP ${response.status}`,
      );
      return null;
    }

    const result = await response.json();
    console.log("Similar games result:", result);
    return result;
  } catch (error) {
    console.error("Failed to fetch similar games:", error);
    return null;
  }
}
