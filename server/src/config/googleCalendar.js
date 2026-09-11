import {
  google,
} from 'googleapis';

// ======================================================
// GOOGLE CALENDAR CONFIG
// ======================================================

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

// ======================================================
// ENV
// ======================================================

const getGoogleCalendarConfig =
  () => {
    const clientId =
      process.env
        .GOOGLE_CALENDAR_CLIENT_ID;

    const clientSecret =
      process.env
        .GOOGLE_CALENDAR_CLIENT_SECRET;

    const redirectUri =
      process.env
        .GOOGLE_CALENDAR_REDIRECT_URI;

    if (!clientId) {
      throw new Error(
        'GOOGLE_CALENDAR_CLIENT_ID tanımlı değil'
      );
    }

    if (!clientSecret) {
      throw new Error(
        'GOOGLE_CALENDAR_CLIENT_SECRET tanımlı değil'
      );
    }

    if (!redirectUri) {
      throw new Error(
        'GOOGLE_CALENDAR_REDIRECT_URI tanımlı değil'
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
    };
  };

// ======================================================
// OAUTH CLIENT
// ======================================================

export const createGoogleCalendarOAuthClient =
  () => {
    const {
      clientId,
      clientSecret,
      redirectUri,
    } =
      getGoogleCalendarConfig();

    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  };

// ======================================================
// AUTHORIZED CALENDAR CLIENT
// ======================================================

export const createGoogleCalendarClient =
  (
    credentials
  ) => {
    if (!credentials) {
      throw new Error(
        'Google Calendar credentials gereklidir'
      );
    }

    const auth =
      createGoogleCalendarOAuthClient();

    auth.setCredentials(
      credentials
    );

    return google.calendar({
      version:
        'v3',

      auth,
    });
  };

export default {
  GOOGLE_CALENDAR_SCOPES,
  createGoogleCalendarOAuthClient,
  createGoogleCalendarClient,
};