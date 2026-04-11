We want to create a data story telling project that let's users get a retrospective view of their Steam library.
Using the Steam API, a user should be able to log into their Steam account and then the app should provide the following features:

Features:
1. A timeline of game eras. Group similar games played in similar times by generes (e.g. FPS, simulation, strategy, friend slop, etc...). Provide a list of those games, the time frame, and some ad-lib.

2. Recommendations: Based on the game eras from the previous part create recommendations of games. Recommended games should include games that users have played repeatedly, unfinished games (quantified using achievements), unplayed games in library, games on sale, and games coming out soon. Use player count, rating, and genre tags to choose games

3. Profile the player: Based on the types of games someone has played, create a profile and description for the user

4. Fun Metrics: Calculate additional fun metrics such as "Waste of Money" which is the amount of hours played divided by the cost of the game, "Library sentiment" how much a player has played a game compared to the rating on steam, as well as others. 