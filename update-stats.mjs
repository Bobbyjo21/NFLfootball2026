import fs from 'node:fs/promises';
import { NFL_TEAMS } from './nfl-teams.mjs';
import { normalizeNFL } from './normalize.mjs';

const ESPN =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

const REGULAR_SEASON_TYPE = 2;
const CURRENT_SEASON = Number(process.env.NFL_SEASON || 2026);
const PRIOR_SEASON = CURRENT_SEASON - 1;
const warnings = [];

async function request(path) {
  const response = await fetch(ESPN + path, {
    headers: {
      'User-Agent': 'Sunday-Lab-NFL-Simulator/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${path}`);
  }

  return response.json();
}

async function optional(label, path) {
  try {
    return await request(path);
  } catch (error) {
    warnings.push(`${label} unavailable: ${error.message}`);
    return null;
  }
}

async function getRegularSeasonScoreboard(season) {
  return optional(
    `${season} regular season`,
    `/scoreboard?dates=${season}&seasontype=${REGULAR_SEASON_TYPE}&limit=400`
  );
}

/*
 * First check the current season.
 *
 * Continue using the previous full regular season until at least one
 * current-season regular-season game has been completed. This prevents
 * preseason or partial live-game statistics from entering the model.
 */
const currentSeasonBoard =
  await getRegularSeasonScoreboard(CURRENT_SEASON);

const currentSeasonEvents =
  currentSeasonBoard?.events ?? [];

const currentSeasonHasCompletedGame =
  currentSeasonEvents.some(
    event =>
      Number(event.season?.type) === REGULAR_SEASON_TYPE &&
      event.status?.type?.completed === true
  );

const season = currentSeasonHasCompletedGame
  ? CURRENT_SEASON
  : PRIOR_SEASON;

console.log(
  currentSeasonHasCompletedGame
    ? `Using ${CURRENT_SEASON} regular-season statistics.`
    : `No completed ${CURRENT_SEASON} regular-season games yet. Using ${PRIOR_SEASON} regular-season statistics.`
);

/*
 * Retrieve only the selected season's regular-season games.
 * No preseason or postseason requests are made.
 */
const selectedBoard =
  season === CURRENT_SEASON
    ? currentSeasonBoard
    : await getRegularSeasonScoreboard(PRIOR_SEASON);

if (!selectedBoard) {
  throw new Error(
    `Unable to retrieve ${season} regular-season data from ESPN.`
  );
}

const eventMap = new Map();

for (const event of selectedBoard.events ?? []) {
  if (Number(event.season?.type) !== REGULAR_SEASON_TYPE) {
    continue;
  }

  eventMap.set(event.id, event);
}

const byAbbr = Object.fromEntries(
  NFL_TEAMS.map(team => [team.abbr, team])
);

const games = [];

for (const event of eventMap.values()) {
  const competition = event.competitions?.[0];

  const home = competition?.competitors?.find(
    competitor => competitor.homeAway === 'home'
  );

  const away = competition?.competitors?.find(
    competitor => competitor.homeAway === 'away'
  );

  if (!home || !away) {
    continue;
  }

  const homeTeam = byAbbr[
    String(home.team?.abbreviation || '').toLowerCase()
  ];

  const awayTeam = byAbbr[
    String(away.team?.abbreviation || '').toLowerCase()
  ];

  if (!homeTeam || !awayTeam) {
    continue;
  }

  games.push({
    id: event.id,
    week: event.week?.number ?? event.week?.text,
    seasonType: REGULAR_SEASON_TYPE,
    startDate: event.date,
    completed: event.status?.type?.completed === true,
    neutralSite: competition.neutralSite === true,
    venueId: homeTeam.id,
    venue: competition.venue?.fullName,
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    homePoints: Number(home.score),
    awayPoints: Number(away.score)
  });
}

/*
 * Only completed regular-season games receive box-score summaries.
 */
const completedGames = games.filter(game => game.completed);
const summaries = [];

for (let index = 0; index < completedGames.length; index += 8) {
  const batch = await Promise.all(
    completedGames
      .slice(index, index + 8)
      .map(game =>
        optional(
          `Game ${game.id} box score`,
          `/summary?event=${game.id}`
        )
      )
  );

  summaries.push(...batch.filter(Boolean));
}

const output = normalizeNFL({
  season,
  teams: NFL_TEAMS,
  games,
  summaries,
  warnings
});

await fs.mkdir('data', { recursive: true });

await fs.writeFile(
  'data/live-data.json',
  JSON.stringify(output, null, 2) + '\n'
);

console.log(
  `Saved ${Object.keys(output.teams).length} teams, ` +
  `${games.length} regular-season games and ` +
  `${summaries.length} completed box scores for ${season}.`
);

if (warnings.length) {
  console.warn(warnings.join('\n'));
}

