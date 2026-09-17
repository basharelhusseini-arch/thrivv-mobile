const segments = new Set(['api','member','admin','gym','gyms','workouts','workout-plans','log','progress','habits','entries','rewards','redeem','points','health','profile','dashboard','wearables','whoop','sync','status','operations','attention','internal','account','join-gym','scan-workout','support','nutrition','recipes','login','signup','mobile','classes','bookings','auth','logout','score','today','leaderboard','workout-verification']);
/** Never send URL queries, record IDs, arbitrary path text, error messages or user data. */
export function safeErrorRoute(path: string) {
  return path.split(/[?#]/)[0].split('/').slice(0,9).map(part=>part===''?'':segments.has(part)?part:':id').join('/').slice(0,160)||'/';
}
export function safeErrorType(value: unknown) {
  return typeof value==='string'&&['Error','TypeError','RangeError','ReferenceError','SyntaxError','URIError','UnhandledRejection'].includes(value)?value:'Error';
}
