import {
  body,
} from 'express-validator';

// ======================================================
// PASSWORD VALIDATION
// ======================================================

const passwordValidation = (
  field,
  label = 'Åifre'
) =>
  body(field)
    .isString()
    .withMessage(
      `${label} geÃ§erli olmalÄ±dÄ±r`
    )
    .isLength({
      min: 12,
      max: 128,
    })
    .withMessage(
      `${label} en az 12 karakter olmalÄ±dÄ±r`
    )
    .custom(
      (
        value
      ) => {
        if (
          String(
            value
          ).trim().length ===
          0
        ) {
          throw new Error(
            `${label} yalnÄ±zca boÅŸluk karakterlerinden oluÅŸamaz`
          );
        }

        return true;
      }
    );

// ======================================================
// VALIDATIONS
// ======================================================

export const authValidation = {
  
  // ====================================================
  // LOGIN
  // ====================================================

  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'GeÃ§erli bir e-posta adresi giriniz'
      )
      .normalizeEmail({ gmail_remove_dots: false }),

    body('password')
      .isString()
      .notEmpty()
      .withMessage(
        'Åifre gereklidir'
      ),
  ],

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  changePassword: [
    body('currentPassword')
      .isString()
      .notEmpty()
      .withMessage(
        'Mevcut ÅŸifre gereklidir'
      ),

    passwordValidation(
      'newPassword',
      'Yeni ÅŸifre'
    ),

    body('newPassword')
      .custom(
        (
          value,
          {
            req,
          }
        ) => {
          if (
            value ===
            req.body.currentPassword
          ) {
            throw new Error(
              'Yeni ÅŸifre mevcut ÅŸifrenizle aynÄ± olamaz'
            );
          }

          return true;
        }
      ),
  ],

  // ====================================================
  // FORGOT PASSWORD
  // ====================================================

  forgotPassword: [
    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'GeÃ§erli bir e-posta adresi giriniz'
      )
      .normalizeEmail({ gmail_remove_dots: false }),
  ],

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  resetPassword: [
    body('token')
      .isString()
      .notEmpty()
      .withMessage(
        'Åifre sÄ±fÄ±rlama anahtarÄ± gereklidir'
      ),

    passwordValidation(
      'password',
      'Yeni ÅŸifre'
    ),
  ],
};
