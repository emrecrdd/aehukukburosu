const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  API_URL.replace(
    /\/api\/?$/,
    ''
  );

export const env = {
  // ======================================================
  // API
  // ======================================================

  API_URL,

  // ======================================================
  // WEBSOCKET / SOCKET.IO
  // ======================================================

  WS_URL,

  // ======================================================
  // APPLICATION
  // ======================================================

  APP_URL:
    import.meta.env.VITE_APP_URL ||
    'http://localhost:5173',

  // ======================================================
  // ENVIRONMENT
  // Vite built-in değerleri
  // ======================================================

  MODE:
    import.meta.env.MODE,

  IS_DEV:
    import.meta.env.DEV,

  IS_PROD:
    import.meta.env.PROD,
};

export default env;