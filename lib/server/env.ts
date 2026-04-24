export function getServerEnv() {
  return {
    STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
    STRAVA_REFRESH_TOKEN: process.env.STRAVA_REFRESH_TOKEN,
  };
}
