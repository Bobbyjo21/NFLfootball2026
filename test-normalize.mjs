import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeNFL} from './normalize.mjs';
import {NFL_TEAMS} from './nfl-teams.mjs';

const teams=NFL_TEAMS.filter(t=>['Kansas City Chiefs','Buffalo Bills'].includes(t.name));
const games=[{id:'1',week:1,startDate:'2026-09-10T00:00:00Z',completed:true,neutralSite:false,venueId:3,homeTeam:'Buffalo Bills',awayTeam:'Kansas City Chiefs',homePoints:24,awayPoints:21}];
const row=(name,yards,third)=>({team:{displayName:name},statistics:[{name:'totalYards',displayValue:String(yards)},{name:'totalOffensivePlays',displayValue:'60'},{name:'rushingYards',displayValue:'120'},{name:'rushingAttempts',displayValue:'25'},{name:'thirdDownEff',displayValue:third},{name:'turnovers',displayValue:'1'}]});
const mock=normalizeNFL({season:2026,teams,games,summaries:[{boxscore:{teams:[row('Buffalo Bills',390,'6-12'),row('Kansas City Chiefs',360,'5-11')]}}]});
assert.equal(Object.keys(mock.teams).length,2);assert.equal(mock.teams['Buffalo Bills'].gamesPlayed,1);assert.equal(mock.teams['Buffalo Bills'].model.ppg,24);assert.equal(mock.teams['Buffalo Bills'].model.yardsGame,390);assert.equal(mock.teams['Buffalo Bills'].model.yardsAllowed,360);assert.equal(mock.teams['Buffalo Bills'].model.thirdDownPct,50);assert.equal(mock.teams['Buffalo Bills'].dataWeight,.2);
const livePath=new URL('../data/live-data.json',import.meta.url);if(fs.existsSync(livePath)){const live=JSON.parse(fs.readFileSync(livePath,'utf8'));assert.ok(live.teams&&live.games&&live.venues)}
console.log('NFL normalizer tests passed.');
