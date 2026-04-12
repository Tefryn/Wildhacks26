import { bucketizeTimelineData } from "./client/src/api/timelineApi.js";

const res = await fetch(
  "https://getGames-e4wyzyxcia-uc.a.run.app?steamId=76561198142089940",
);
const data = await res.json();
const bucketizedData = bucketizeTimelineData(data);

const data_for_similarity = bucketizedData.eras
  .map((era) => {
    const eraGames = Array.isArray(era?.games) ? era.games : [];
    if (eraGames.length === 0) return null;

    const topGame = [...eraGames].sort((left, right) => {
      const leftCount = Array.isArray(left?.achievements)
        ? left.achievements.length
        : 0;
      const rightCount = Array.isArray(right?.achievements)
        ? right.achievements.length
        : 0;
      if (rightCount !== leftCount) return rightCount - leftCount;
      return (
        (Number(right?.playtimeHours) || 0) - (Number(left?.playtimeHours) || 0)
      );
    })[0];

    if (!topGame) return null;

    const dateStr = era?.dateRange?.end || era?.dateRange?.start || "";
    const date = new Date(dateStr);
    const label = Number.isNaN(date.getTime())
      ? era?.name || "Unknown Era"
      : date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });

    return {
      [label]: Number(topGame.appId) || null,
    };
  })
  .filter(Boolean);

console.log("data_for_similarity:");
console.log(JSON.stringify(data_for_similarity, null, 2));
