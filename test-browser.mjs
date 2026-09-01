import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const now = new Date();
const future = new Date(now.getTime() + 3 * 86400000);

const live = {
  season: 2026,
  updatedAt: now.toISOString(),
  teams: {
    'Kansas City Chiefs': { name: 'Kansas City Chiefs', aliases: ['KC'], dataWeight: .2, location: { latitude: 39.05, longitude: -94.48, timezone: 'America/Chicago' }, model: { ppg: 31 } },
    'Buffalo Bills': { name: 'Buffalo Bills', aliases: ['BUF'], dataWeight: .2, location: { latitude: 42.7738, longitude: -78.787, timezone: 'America/New_York' }, model: { ppg: 24 } }
  },
  games: [
    { id: 1, week: 2, startDate: new Date(future - 7 * 86400000).toISOString(), completed: true, homeTeam: 'Kansas City Chiefs', awayTeam: 'Other', homePoints: 20, awayPoints: 10 },
    { id: 2, week: 2, startDate: new Date(future - 9 * 86400000).toISOString(), completed: true, homeTeam: 'Buffalo Bills', awayTeam: 'Other', homePoints: 17, awayPoints: 10 },
    { id: 3, week: 3, startDate: future.toISOString(), completed: false, neutralSite: false, venueId: 20, homeTeam: 'Buffalo Bills', awayTeam: 'Kansas City Chiefs' }
  ],
  venues: { 20: { id: 20, name: 'Highmark Stadium', latitude: 42.7738, longitude: -78.787, timezone: 'America/New_York', elevation: '600', grass: false, dome: false } }
};

const targetHour = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false
}).format(future).replace(' ', 'T').slice(0, 13) + ':00';
const weather = { hourly: { time: [targetHour], temperature_2m: [72], wind_speed_10m: [9], precipitation: [0], weather_code: [0] } };
const values = { spread: '-3.5', total: '49.5', sims: '1000', awayAdj: '0', homeAdj: '0', pace: '0', vol: '10', awayRest: '7', homeRest: '7', awayTravel: '0', homeTravel: '0', awayZones: '0', homeZones: '0', altitude: '0', temp: '70', wind: '5', precip: '0', indoors: '0', awayQb: '0', homeQb: '0', awayInj: '0', homeInj: '0', search: '', editorTeam: '', surface: 'Any', gameDate: '' };
const elements = {};
function element(id) {
  return elements[id] ??= {
    id, value: values[id] ?? '', checked: false, innerHTML: '', textContent: '', style: {}, files: [],
    classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, click() {}
  };
}

let calls = 0;
const context = {
  console, Math, Number, JSON, Array, Object, String, Date, Intl, URL, URLSearchParams,
  Blob: function Blob() {}, alert() {}, confirm() { return false; }, setTimeout, clearTimeout,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  fetch: async () => ({ ok: true, json: async () => calls++ === 0 ? live : weather }),
  document: {
    getElementById: element,
    querySelector() { return { value: 'balanced' }; },
    querySelectorAll() { return []; },
    createElement() { return element('created'); }
  }
};

vm.createContext(context);
vm.runInContext(script, context);
await new Promise(resolve => setTimeout(resolve, 100));

if (!element('contextTitle').textContent.includes('Kansas City Chiefs at Buffalo Bills')) throw new Error('Scheduled matchup was not loaded.');
if (Number(element('awayRest').value) !== 7 || Number(element('homeRest').value) !== 9) throw new Error('Rest calculation failed.');
if (Number(element('awayTravel').value) <= 0 || Number(element('homeTravel').value) !== 0) throw new Error('Travel calculation failed.');
if (Number(element('temp').value) !== 72 || Number(element('wind').value) !== 9) throw new Error('Weather calculation failed.');

console.log('Browser integration tests passed.');
