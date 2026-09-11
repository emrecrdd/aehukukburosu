import {
  calendarIntegrationService,
} from './calendar-integration.service.js';

import {
  successResponse,
  errorResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

// ======================================================
// HELPERS
// ======================================================

const getErrorStatus = (
  error,
  fallback = 400
) => {
  const message =
    String(
      error?.message ||
      ''
    ).toLowerCase();

  if (
    message.includes(
      'bulunamadı'
    ) ||
    message.includes(
      'not found'
    )
  ) {
    return 404;
  }

  if (
    message.includes(
      'yetki'
    ) ||
    message.includes(
      'forbidden'
    )
  ) {
    return 403;
  }

  if (
    message.includes(
      'unauthorized'
    )
  ) {
    return 401;
  }

  return fallback;
};

// ======================================================
// CONTROLLER
// ======================================================

export const calendarIntegrationController = {

  // ====================================================
  // GOOGLE STATUS
  // ====================================================

  async getGoogleStatus(
    req,
    res
  ) {
    try {
      const integration =
        await calendarIntegrationService
          .getGoogleIntegration(
            req.user.id
          );

      return successResponse(
        res,
        integration,
        'Google Calendar bağlantı durumu getirildi'
      );
    } catch (error) {
      logger.error(
        'Get Google Calendar status error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Google Calendar bağlantı durumu alınamadı',
        getErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // GOOGLE AUTH URL
  // ====================================================

  async getGoogleAuthorizationUrl(
    req,
    res
  ) {
    try {
      const url =
        await calendarIntegrationService
          .getGoogleAuthorizationUrl(
            req.user.id
          );

      return successResponse(
        res,
        {
          url,
        },
        'Google Calendar bağlantı adresi oluşturuldu'
      );
    } catch (error) {
      logger.error(
        'Create Google Calendar authorization URL error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Google Calendar bağlantısı başlatılamadı',
        getErrorStatus(
          error
        )
      );
    }
  },

  // ====================================================
  // GOOGLE CALLBACK
  // ====================================================

  async handleGoogleCallback(
    req,
    res
  ) {
    try {
      const {
        code,
        state,
        error:
          googleError,
        error_description:
          googleErrorDescription,
      } =
        req.query;

      /*
       * Kullanıcı Google izin ekranında vazgeçerse
       * callback error ile döner.
       */
      if (
        googleError
      ) {
        logger.warn(
          'Google Calendar authorization rejected:',
          {
            error:
              googleError,

            description:
              googleErrorDescription,
          }
        );

        return res
          .status(400)
          .send(`
            <!doctype html>
            <html lang="tr">
              <head>
                <meta charset="utf-8" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1"
                />

                <title>
                  Google Calendar Bağlantısı
                </title>
              </head>

              <body
                style="
                  margin:0;
                  min-height:100vh;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-family:Arial,sans-serif;
                  background:#f8fafc;
                  color:#0f172a;
                "
              >
                <div
                  style="
                    max-width:520px;
                    padding:32px;
                    text-align:center;
                  "
                >
                  <h2>
                    Google Calendar bağlantısı tamamlanmadı
                  </h2>

                  <p>
                    Google izin ekranı kapatıldı veya erişim reddedildi.
                  </p>

                  <p>
                    Bu pencereyi kapatıp Derkenar üzerinden tekrar deneyebilirsiniz.
                  </p>
                </div>
              </body>
            </html>
          `);
      }

      if (
        !code ||
        !state
      ) {
        return res
          .status(400)
          .send(`
            <!doctype html>
            <html lang="tr">
              <head>
                <meta charset="utf-8" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1"
                />

                <title>
                  Google Calendar Bağlantısı
                </title>
              </head>

              <body
                style="
                  margin:0;
                  min-height:100vh;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-family:Arial,sans-serif;
                  background:#f8fafc;
                  color:#0f172a;
                "
              >
                <div
                  style="
                    max-width:520px;
                    padding:32px;
                    text-align:center;
                  "
                >
                  <h2>
                    Google Calendar bağlantısı başarısız
                  </h2>

                  <p>
                    Google doğrulama bilgileri eksik geldi.
                  </p>
                </div>
              </body>
            </html>
          `);
      }

      await calendarIntegrationService
        .handleGoogleCallback({
          code:
            String(code),

          state:
            String(state),
        });

      /*
       * Callback Google'dan doğrudan tarayıcıya geldiği
       * için JSON yerine küçük bir başarı sayfası
       * döndürüyoruz.
       *
       * Böylece frontend route'una bağımlı değiliz.
       */
      return res
        .status(200)
        .send(`
          <!doctype html>
          <html lang="tr">
            <head>
              <meta charset="utf-8" />

              <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
              />

              <title>
                Google Calendar Bağlandı
              </title>
            </head>

            <body
              style="
                margin:0;
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                font-family:Arial,sans-serif;
                background:#f8fafc;
                color:#0f172a;
              "
            >
              <div
                style="
                  max-width:520px;
                  padding:32px;
                  text-align:center;
                "
              >
                <div
                  style="
                    font-size:48px;
                    margin-bottom:16px;
                  "
                >
                  ✅
                </div>

                <h2>
                  Google Calendar bağlandı
                </h2>

                <p>
                  Google Takvim hesabınız Derkenar ile başarıyla bağlandı.
                </p>

                <p
                  style="
                    color:#64748b;
                  "
                >
                  Bu sekmeyi kapatıp Derkenar'a dönebilirsiniz.
                </p>
              </div>

              <script>
                try {
                  if (
                    window.opener &&
                    !window.opener.closed
                  ) {
                    window.opener.postMessage(
                      {
                        type:
                          'DERKENAR_GOOGLE_CALENDAR_CONNECTED'
                      },
                      window.location.origin
                    );
                  }
                } catch (error) {
                  console.error(error);
                }
              </script>
            </body>
          </html>
        `);
    } catch (error) {
      logger.error(
        'Google Calendar callback error:',
        error
      );

      const safeMessage =
        String(
          error?.message ||
          'Google Calendar bağlantısı tamamlanamadı'
        )
          .replace(
            /</g,
            '&lt;'
          )
          .replace(
            />/g,
            '&gt;'
          );

      return res
        .status(
          getErrorStatus(
            error
          )
        )
        .send(`
          <!doctype html>
          <html lang="tr">
            <head>
              <meta charset="utf-8" />

              <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
              />

              <title>
                Google Calendar Hatası
              </title>
            </head>

            <body
              style="
                margin:0;
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                font-family:Arial,sans-serif;
                background:#f8fafc;
                color:#0f172a;
              "
            >
              <div
                style="
                  max-width:520px;
                  padding:32px;
                  text-align:center;
                "
              >
                <div
                  style="
                    font-size:48px;
                    margin-bottom:16px;
                  "
                >
                  ⚠️
                </div>

                <h2>
                  Google Calendar bağlantısı tamamlanamadı
                </h2>

                <p>
                  ${safeMessage}
                </p>

                <p
                  style="
                    color:#64748b;
                  "
                >
                  Bu sekmeyi kapatıp tekrar deneyebilirsiniz.
                </p>
              </div>
            </body>
          </html>
        `);
    }
  },

  // ====================================================
  // GOOGLE DISCONNECT
  // ====================================================

  async disconnectGoogle(
    req,
    res
  ) {
    try {
      const result =
        await calendarIntegrationService
          .disconnectGoogle(
            req.user.id
          );

      return successResponse(
        res,
        result,
        'Google Calendar bağlantısı kaldırıldı'
      );
    } catch (error) {
      logger.error(
        'Disconnect Google Calendar error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Google Calendar bağlantısı kaldırılamadı',
        getErrorStatus(
          error
        )
      );
    }
  },
};

export default calendarIntegrationController;