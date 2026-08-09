import { google } from "googleapis";
import { OAuth2Client, Credentials } from "google-auth-library";
import { env } from "@config/env";

export const CLASSROOM_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
];

export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

/** Step 1: where we send the user to log in + consent. */
export function getGoogleConsentUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // required to get a refresh_token
    prompt: "consent", // force refresh_token on every login, not just the first
    scope: CLASSROOM_SCOPES,
  });
}

/** Step 2: exchange the ?code= from the OAuth callback for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/** Fetches the logged-in user's basic profile (id, email, name, picture). */
export async function fetchGoogleProfile(accessToken: string) {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data } = await oauth2.userinfo.get();
  return data; // { id, email, name, picture, ... }
}

/** Uses a stored refresh token to mint a new access token. */
export async function refreshAccessToken(refreshToken: string): Promise<Credentials> {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

/** Returns an OAuth2Client pre-loaded with a valid access token, ready to pass to googleapis. */
export function clientWithAccessToken(accessToken: string): OAuth2Client {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });
  return client;
}
