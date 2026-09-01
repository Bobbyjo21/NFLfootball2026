import fs from 'node:fs/promises';
import {NFL_TEAMS} from './nfl-teams.mjs';
import {normalizeNFL} from './normalize.mjs';

const ESPN='https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const now=new Date(),defaultSeason=now.getUTCMonth()<2?now.getUTCFullYear()-1:now.getUTCFullYear();
const season=Number(process.env.NFL_SEASON||defaultSeason),warnings=[];
async function request(path){const r=await fetch(ESPN+path,{headers:{'User-Agent':'Sunday-Lab-NFL-Simulator/1.0'}});if(!r.ok)throw Error(`${r.status} ${path}`);return r.json()}
async function optional(label,path){try{return await request(path)}catch(e){warnings.push(`${label} unavailable: ${e.message}`);return null}}

console.log(`Updating ${season} NFL data from ESPN…`);
const scoreboards=await Promise.all([1,2,3].map(type=>optional(`Season type ${type}`,`/scoreboard?dates=${season}&seasontype=${type}&limit=400`)));
const eventMap=new Map();for(const board of scoreboards)for(const event of board?.events??[])eventMap.set(event.id,event);
const byAbbr=Object.fromEntries(NFL_TEAMS.map(t=>[t.abbr,t]));
const games=[];
for(const event of eventMap.values()){
  const comp=event.competitions?.[0],home=comp?.competitors?.find(x=>x.homeAway==='home'),away=comp?.competitors?.find(x=>x.homeAway==='away');if(!home||!away)continue;
  const ht=byAbbr[String(home.team?.abbreviation||'').toLowerCase()],at=byAbbr[String(away.team?.abbreviation||'').toLowerCase()];if(!ht||!at)continue;
  games.push({id:event.id,week:event.week?.number??event.week?.text,seasonType:event.season?.type,startDate:event.date,completed:event.status?.type?.completed===true,neutralSite:comp.neutralSite===true,venueId:ht.id,venue:comp.venue?.fullName,homeTeam:ht.name,awayTeam:at.name,homePoints:Number(home.score),awayPoints:Number(away.score)});
}
const completed=games.filter(g=>g.completed),summaries=[];
for(let i=0;i<completed.length;i+=8){const batch=await Promise.all(completed.slice(i,i+8).map(g=>optional(`Game ${g.id} box score`,`/summary?event=${g.id}`)));summaries.push(...batch.filter(Boolean))}
const output=normalizeNFL({season,teams:NFL_TEAMS,games,summaries,warnings});
await fs.mkdir('data',{recursive:true});await fs.writeFile('data/live-data.json',JSON.stringify(output,null,2)+'\n');
console.log(`Saved ${Object.keys(output.teams).length} teams, ${games.length} games and ${summaries.length} completed box scores.`);if(warnings.length)console.warn(warnings.join('\n'));
