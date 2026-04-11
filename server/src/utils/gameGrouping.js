/**
 * Game Grouping Logic - Groups games into eras by time period and genre
 */

/**
 * Groups games by 6-month time buckets and identifies dominant genres
 * @param {Array} games - Array of game objects from Cloud Functions
 * @returns {Array} Array of era objects with games grouped by time period
 */
function groupGamesByEra(games) {
  // Filter games: only include games with at least 1 hour playtime
  const validGames = games.filter(game => game.playtimeHours >= 1);

  if (validGames.length === 0) {
    return [];
  }

  // Create map of games by time bucket (6-month intervals)
  const buckets = new Map(); // key: "YYYY-MM" (bucket start), value: array of games

  validGames.forEach(game => {
    // Use lastPlayedDate if available, otherwise use firstPlayedDate or current date
    let gameDate = new Date();
    
    if (game.lastPlayedDate) {
      gameDate = new Date(game.lastPlayedDate);
    } else if (game.firstPlayedDate) {
      gameDate = new Date(game.firstPlayedDate);
    }

    // Calculate 6-month bucket: Round to start of 6-month period
    // Months 0-5 → bucket 0 (Jan-Jun), Months 6-11 → bucket 1 (Jul-Dec)
    const year = gameDate.getFullYear();
    const month = gameDate.getMonth();
    const bucket = Math.floor(month / 6); // 0 or 1

    const bucketStartMonth = bucket === 0 ? 0 : 6;
    const bucketKey = `${year}-${String(bucketStartMonth).padStart(2, '0')}`;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey).push(game);
  });

  // Convert buckets to sorted array of eras
  const eras = Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort chronologically
    .map(([bucketKey, bucketGames]) => {
      const [year, month] = bucketKey.split('-');
      
      // Determine era season
      const monthNum = parseInt(month);
      let season = monthNum === '00' ? 'H1' : 'H2'; // H1 = first half, H2 = second half
      
      // Calculate start and end dates
      const startDate = new Date(year, monthNum, 1);
      const endDate = monthNum === '00' 
        ? new Date(year, 5, 30)  // June 30
        : new Date(year, 11, 31); // Dec 31

      // Extract dominant genres from games in this bucket
      const genreMap = new Map(); // genre -> count
      bucketGames.forEach(game => {
        if (game.genres && Array.isArray(game.genres)) {
          game.genres.forEach(genre => {
            genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
          });
        }
      });

      // Sort genres by frequency and get top 3
      const dominantGenres = Array.from(genreMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      // Calculate total hours
      const totalHours = bucketGames.reduce((sum, game) => sum + game.playtimeHours, 0);

      // Find top games by playtime
      const topGames = bucketGames
        .sort((a, b) => b.playtimeHours - a.playtimeHours)
        .slice(0, 5);

      return {
        eraId: bucketKey,
        startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        endDate: endDate.toISOString().split('T')[0],
        year: parseInt(year),
        season,
        dominantGenres,
        totalHours: Math.round(totalHours * 100) / 100,
        gameCount: bucketGames.length,
        games: bucketGames.map(game => ({
          appId: game.appid,
          name: game.name,
          playtimeHours: game.playtimeHours,
          genres: game.genres || [],
          achievementCompletionRate: game.achievementCompletionRate || 0,
        })),
        topGames: topGames.map(game => ({
          appId: game.appid,
          name: game.name,
          playtimeHours: game.playtimeHours,
        })),
      };
    });

  return eras;
}

/**
 * Generates a descriptive name for an era based on dominant genres and year
 * @param {Object} era - Era object with year, season, dominantGenres
 * @returns {string} Human-readable era name
 */
function generateEraName(era) {
  const { year, season, dominantGenres } = era;
  
  let seasonName = season === 'H1' ? 'Spring' : 'Fall';
  let genreName = dominantGenres[0] || 'Gaming';

  // Special naming for multi-genre eras
  if (dominantGenres.length === 0) {
    return `${year} ${seasonName}: The Calm`;
  }

  if (dominantGenres.length >= 2) {
    genreName = `${dominantGenres.join(' & ')} Era`;
  } else {
    // Add context based on genre
    const genreContext = {
      'Action': 'Action Spree',
      'RPG': 'RPG Journey',
      'Strategy': 'Strategic Era',
      'Simulation': 'Sim Master Era',
      'Indie': 'Indie Renaissance',
      'Puzzle': 'Brain Teasers',
      'Adventure': 'Adventure Quest',
      'FPS': 'FPS Showdown',
      'Horror': 'Spooky Season',
      'Sports': 'Sports Era',
    };
    
    genreName = genreContext[dominantGenres[0]] || `${dominantGenres[0]} Era`;
  }

  return `${year} ${seasonName}: ${genreName}`;
}

/**
 * Merges adjacent eras if they have similar genres (optional optimization)
 * @param {Array} eras - Array of era objects
 * @returns {Array} Merged eras
 */
function mergeAdjacentSimilarEras(eras) {
  if (eras.length <= 1) return eras;

  const merged = [eras[0]];
  let currentEra = { ...eras[0] };

  for (let i = 1; i < eras.length; i++) {
    const nextEra = eras[i];
    
    // Check if genres overlap (at least 1 common genre)
    const currentGenres = new Set(currentEra.dominantGenres);
    const nextGenres = new Set(nextEra.dominantGenres);
    const hasCommonGenres = Array.from(currentGenres).some(g => nextGenres.has(g));

    if (hasCommonGenres) {
      // Merge eras
      currentEra.endDate = nextEra.endDate;
      currentEra.totalHours += nextEra.totalHours;
      currentEra.gameCount += nextEra.gameCount;
      currentEra.games.push(...nextEra.games);
      
      // Recalculate dominant genres
      const genreMap = new Map();
      currentEra.games.forEach(game => {
        if (game.genres && Array.isArray(game.genres)) {
          game.genres.forEach(genre => {
            genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
          });
        }
      });
      currentEra.dominantGenres = Array.from(genreMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);
    } else {
      // Push current era and start new one
      merged.push(currentEra);
      currentEra = { ...nextEra };
    }
  }

  // Don't forget the last era
  merged.push(currentEra);

  return merged;
}

module.exports = {
  groupGamesByEra,
  generateEraName,
  mergeAdjacentSimilarEras,
};
