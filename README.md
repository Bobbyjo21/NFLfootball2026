# Sunday Lab NFL Simulator

A static, phone-friendly NFL simulator for all 32 teams. It combines editable power ratings with measured offense, defense, efficiency, game-control, special-teams and situational data, then runs possession-by-possession Monte Carlo simulations.

## GitHub setup

1. Create a new GitHub repository and upload every file in this folder, including `.github`.
2. Open **Settings → Secrets and variables → Actions → Variables**.
3. Create `NFL_SEASON` and set it to the season year, for example `2026`.
4. No API secret is required: the updater uses ESPN's public NFL scoreboard and box-score feeds.
5. Open **Actions → Update NFL data → Run workflow**.
6. Confirm `data/live-data.json` is committed by `NFL Data Bot`.
7. Open **Settings → Pages**, choose **Deploy from a branch**, then select `main` and `/ (root)`.

The workflow runs daily at 10:15 UTC. It updates the schedule, results, team box-score statistics, rest, venue context and the measured fields supported by the public feed. Missing advanced fields remain rating-based priors or can be imported through the CSV tool; they are never silently treated as zero.

## Model behavior

- **Balanced:** 50% power ratings and 50% measured matchup statistics.
- **Stats-heavy:** 20% ratings and 80% measured matchup statistics.
- **Ratings-only:** 100% power ratings, plus situational adjustments.

Current-season measurements are shrunk toward priors using `games / (games + 4)`. Automatic matchup context fills schedule, neutral site, rest, travel, time zones, altitude, surface, dome status and weather when available.

## Local commands

```bash
npm run update
npm test
npm run serve
```
