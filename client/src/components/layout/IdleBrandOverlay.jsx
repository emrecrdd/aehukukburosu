import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import useAuth from '../../hooks/useAuth.js';

import {
  screenLockApi,
  ScreenLockApiError,
} from '../../services/screenLockApi.js';

const DEFAULT_IDLE_TIME =
  600 * 1000;

const TOUCH_THROTTLE_MS =
  10 * 1000;

const MODE = {
  UNLOCK:
    'unlock',
  SETUP:
    'setup',
  PASSWORD_RECOVERY:
    'password-recovery',
  CODE_RECOVERY:
    'code-recovery',
  RECOVERY_CODES:
    'recovery-codes',
};

const onlyDigits = (
  value,
  maxLength = 4
) => {
  return String(
    value || ''
  )
    .replace(/\D/g, '')
    .slice(
      0,
      maxLength
    );
};

const formatRecoveryCode = (
  value
) => {
  return String(
    value || ''
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9-]/g,
      ''
    )
    .slice(
      0,
      24
    );
};

const IdleBrandOverlay = ({ children = null }) => {
  const auth =
    useAuth();

  const user =
    auth?.user;

  const explicitToken =
    auth?.accessToken ||
    auth?.access_token ||
    auth?.token ||
    null;

  const [
    initialized,
    setInitialized,
  ] = useState(false);

  const [
    isLocked,
    setIsLocked,
  ] = useState(false);

  const [
    hasPin,
    setHasPin,
  ] = useState(false);

  const [
    pinBlocked,
    setPinBlocked,
  ] = useState(false);

  const [
    remainingPinAttempts,
    setRemainingPinAttempts,
  ] = useState(5);

  const [
    idleTime,
    setIdleTime,
  ] = useState(
    DEFAULT_IDLE_TIME
  );

  const [
    mode,
    setMode,
  ] = useState(
    MODE.UNLOCK
  );

  const [
    pin,
    setPin,
  ] = useState('');

  const [
    confirmPin,
    setConfirmPin,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    recoveryCode,
    setRecoveryCode,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const [
    info,
    setInfo,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    retryAfterSeconds,
    setRetryAfterSeconds,
  ] = useState(0);

  const [
    recoveryCodes,
    setRecoveryCodes,
  ] = useState([]);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    clock,
    setClock,
  ] = useState(
    () => new Date()
  );

  const timerRef =
    useRef(null);

  const lockedRef =
    useRef(false);

  const inputRef =
    useRef(null);

  const lastTouchSentAtRef =
    useRef(0);

  const mountedRef =
    useRef(true);

  const clearTimer =
    useCallback(() => {
      if (
        timerRef.current
      ) {
        clearTimeout(
          timerRef.current
        );
        timerRef.current =
          null;
      }
    }, []);

  const applyStatus =
    useCallback(
      (
        status,
        {
          forceLocked =
            false,
        } = {}
      ) => {
        if (!status) {
          return;
        }

        const nextHasPin =
          status.hasPin === true;

        const nextLocked =
          forceLocked ||
          status.isLocked === true ||
          !nextHasPin;

        setHasPin(
          nextHasPin
        );
        setPinBlocked(
          status.pinBlocked ===
            true
        );
        setRemainingPinAttempts(
          Number.isFinite(
            Number(
              status.remainingPinAttempts
            )
          )
            ? Number(
                status.remainingPinAttempts
              )
            : 5
        );
        setIdleTime(
          Number(
            status.idleTimeoutMs
          ) > 0
            ? Number(
                status.idleTimeoutMs
              )
            : DEFAULT_IDLE_TIME
        );
        setRetryAfterSeconds(
          Math.max(
            0,
            Number(
              status.retryAfterSeconds ||
                0
            )
          )
        );

        lockedRef.current =
          nextLocked;
        setIsLocked(
          nextLocked
        );

        if (!nextHasPin) {
          setMode(
            MODE.SETUP
          );
        } else if (
          status.pinBlocked ===
          true
        ) {
          setMode(
            MODE.PASSWORD_RECOVERY
          );
        } else {
          setMode(
            MODE.UNLOCK
          );
        }
      },
      []
    );

  const cleanupLegacyLocalPin =
    useCallback(() => {
      if (
        !user?.id ||
        typeof window ===
          'undefined'
      ) {
        return;
      }

      [
        `derkenar_screen_lock_pin_${user.id}`,
        `derkenar_screen_lock_state_${user.id}`,
        `derkenar_screen_lock_activity_${user.id}`,
      ].forEach(
        (key) => {
          try {
            localStorage.removeItem(
              key
            );
          } catch {
            // Storage temizliği kritik akışı durdurmasın.
          }
        }
      );
    }, [
      user?.id,
    ]);

  const lockScreen =
    useCallback(
      async (
        reason =
          'idle_timeout'
      ) => {
        clearTimer();

        lockedRef.current =
          true;
        setIsLocked(true);
        setError('');
        setInfo('');
        setPin('');
        setConfirmPin('');

        if (!hasPin) {
          setMode(
            MODE.SETUP
          );
          return;
        }

        setMode(
          pinBlocked
            ? MODE.PASSWORD_RECOVERY
            : MODE.UNLOCK
        );

        try {
          const status =
            await screenLockApi
              .lock(
                reason,
                explicitToken
              );

          if (
            mountedRef.current
          ) {
            applyStatus(
              status,
              {
                forceLocked:
                  true,
              }
            );
          }
        } catch (apiError) {
          if (
            mountedRef.current
          ) {
            setError(
              apiError?.message ||
                'Kilit durumu sunucuya kaydedilemedi.'
            );
          }
        }
      },
      [
        applyStatus,
        clearTimer,
        explicitToken,
        hasPin,
        pinBlocked,
      ]
    );

  const startTimer =
    useCallback(
      (
        delay =
          idleTime
      ) => {
        clearTimer();

        if (
          lockedRef.current
        ) {
          return;
        }

        timerRef.current =
          setTimeout(
            () => {
              void lockScreen(
                'idle_timeout'
              );
            },
            Math.max(
              0,
              delay
            )
          );
      },
      [
        clearTimer,
        idleTime,
        lockScreen,
      ]
    );

  const unlockLocal =
    useCallback(() => {
      lockedRef.current =
        false;
      setIsLocked(false);
      setPin('');
      setConfirmPin('');
      setPassword('');
      setRecoveryCode('');
      setError('');
      setInfo('');
      setMode(
        MODE.UNLOCK
      );
      setRetryAfterSeconds(0);
      setPinBlocked(false);
      setRemainingPinAttempts(5);
      startTimer(
        idleTime
      );
    }, [
      idleTime,
      startTimer,
    ]);

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;
      clearTimer();
    };
  }, [
    clearTimer,
  ]);

  useEffect(() => {
    if (!user?.id) {
      setInitialized(false);
      setIsLocked(false);
      lockedRef.current =
        false;
      clearTimer();
      return undefined;
    }

    cleanupLegacyLocalPin();

    const controller =
      new AbortController();

    const initialize =
      async () => {
        try {
          const status =
            await screenLockApi
              .status(
                explicitToken,
                {
                  signal:
                    controller.signal,
                }
              );

          if (
            !mountedRef.current
          ) {
            return;
          }

          applyStatus(
            status
          );

          if (
            status?.hasPin &&
            !status?.isLocked
          ) {
            const lastActivity =
              status.lastActivityAt
                ? new Date(
                    status.lastActivityAt
                  ).getTime()
                : Date.now();

            const timeout =
              Number(
                status.idleTimeoutMs
              ) ||
              DEFAULT_IDLE_TIME;

            const remaining =
              Math.max(
                0,
                timeout -
                  (Date.now() -
                    lastActivity)
              );

            lockedRef.current =
              false;
            setIsLocked(false);
            startTimer(
              remaining
            );
          }
        } catch (apiError) {
          if (
            apiError?.name ===
            'AbortError'
          ) {
            return;
          }

          // Backend güvenlik modülü hazır değilse ekranı sessizce bypass etmiyoruz.
          lockedRef.current =
            true;
          setIsLocked(true);
          setMode(
            MODE.UNLOCK
          );
          setError(
            apiError?.message ||
              'Ekran kilidi güvenlik servisine ulaşılamadı.'
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setInitialized(true);
          }
        }
      };

    void initialize();

    return () => {
      controller.abort();
    };
  }, [
    applyStatus,
    cleanupLegacyLocalPin,
    clearTimer,
    explicitToken,
    startTimer,
    user?.id,
  ]);

  useEffect(() => {
    if (
      !initialized ||
      !user?.id
    ) {
      return undefined;
    }

    const handleActivity =
      () => {
        if (
          lockedRef.current
        ) {
          return;
        }

        startTimer(
          idleTime
        );

        if (!hasPin) {
          return;
        }

        const now =
          Date.now();

        if (
          now -
            lastTouchSentAtRef.current <
          TOUCH_THROTTLE_MS
        ) {
          return;
        }

        lastTouchSentAtRef.current =
          now;

        void screenLockApi
          .touch(
            explicitToken
          )
          .catch(
            (
              apiError
            ) => {
              if (
                apiError instanceof
                  ScreenLockApiError &&
                apiError.code ===
                  'SCREEN_LOCKED'
              ) {
                lockedRef.current =
                  true;
                setIsLocked(true);
                setMode(
                  MODE.UNLOCK
                );
              }
            }
          );
      };

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'pointerdown',
    ];

    events.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleActivity,
          {
            passive:
              true,
          }
        );
      }
    );

    return () => {
      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleActivity
          );
        }
      );
    };
  }, [
    explicitToken,
    hasPin,
    idleTime,
    initialized,
    startTimer,
    user?.id,
  ]);

  useEffect(() => {
    if (
      retryAfterSeconds <=
      0
    ) {
      return undefined;
    }

    const interval =
      setInterval(() => {
        setRetryAfterSeconds(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );
      }, 1000);

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    retryAfterSeconds,
  ]);

  useEffect(() => {
    if (
      isLocked
    ) {
      const timeout =
        setTimeout(() => {
          inputRef.current
            ?.focus();
        }, 120);

      return () =>
        clearTimeout(
          timeout
        );
    }

    return undefined;
  }, [
    isLocked,
    mode,
  ]);

  useEffect(() => {
    const interval =
      setInterval(() => {
        setClock(
          new Date()
        );
      }, 30 * 1000);

    return () => {
      clearInterval(
        interval
      );
    };
  }, []);

  const handleSetup =
    async (
      event
    ) => {
      event.preventDefault();
      setError('');
      setInfo('');

      if (
        pin.length !== 4 ||
        confirmPin.length !== 4
      ) {
        setError(
          'PIN 4 haneli olmalıdır.'
        );
        return;
      }

      if (
        pin !== confirmPin
      ) {
        setError(
          'PIN kodları eşleşmiyor.'
        );
        return;
      }

      try {
        setLoading(true);

        const result =
          await screenLockApi
            .setup(
              {
                pin,
                confirmPin,
              },
              explicitToken
            );

        setHasPin(true);
        setPinBlocked(false);
        setRemainingPinAttempts(5);
        setRecoveryCodes(
          result?.recoveryCodes ||
            []
        );
        setPin('');
        setConfirmPin('');
        setMode(
          MODE.RECOVERY_CODES
        );
      } catch (apiError) {
        setError(
          apiError?.message ||
            'PIN oluşturulamadı.'
        );
      } finally {
        setLoading(false);
      }
    };

  const handleUnlock =
    async (
      event
    ) => {
      event.preventDefault();
      setError('');
      setInfo('');

      if (
        retryAfterSeconds > 0
      ) {
        setError(
          `${retryAfterSeconds} saniye sonra tekrar deneyin.`
        );
        return;
      }

      if (
        pin.length !== 4
      ) {
        setError(
          '4 haneli PIN kodunu girin.'
        );
        return;
      }

      try {
        setLoading(true);

        const status =
          await screenLockApi
            .unlock(
              pin,
              explicitToken
            );

        applyStatus(
          status
        );
        unlockLocal();
      } catch (apiError) {
        setPin('');

        const data =
          apiError?.data ||
          {};

        if (
          Number(
            data.remainingPinAttempts
          ) >= 0
        ) {
          setRemainingPinAttempts(
            Number(
              data.remainingPinAttempts
            )
          );
        }

        if (
          apiError?.code ===
          'SCREEN_PIN_COOLDOWN'
        ) {
          setRetryAfterSeconds(
            Math.max(
              1,
              Number(
                data.retryAfterSeconds ||
                  1
              )
            )
          );
        }

        if (
          apiError?.code ===
          'SCREEN_PIN_BLOCKED'
        ) {
          setPinBlocked(true);
          setMode(
            MODE.PASSWORD_RECOVERY
          );
        }

        if (
          apiError?.code ===
          'SCREEN_SESSION_REVOKED'
        ) {
          setInfo(
            'Oturumunuz güvenlik nedeniyle kapatıldı. Yeniden giriş yapmanız gerekiyor.'
          );
        }

        setError(
          apiError?.message ||
            'PIN doğrulanamadı.'
        );
      } finally {
        setLoading(false);
        setTimeout(() => {
          inputRef.current
            ?.focus();
        }, 80);
      }
    };

  const handlePasswordRecovery =
    async (
      event
    ) => {
      event.preventDefault();
      setError('');
      setInfo('');

      if (!password) {
        setError(
          'Hesap şifrenizi girin.'
        );
        return;
      }

      if (
        pin.length !== 4 ||
        confirmPin.length !== 4
      ) {
        setError(
          'Yeni PIN 4 haneli olmalıdır.'
        );
        return;
      }

      if (
        pin !== confirmPin
      ) {
        setError(
          'Yeni PIN kodları eşleşmiyor.'
        );
        return;
      }

      try {
        setLoading(true);

        const result =
          await screenLockApi
            .recoverWithPassword(
              {
                password,
                newPin:
                  pin,
                confirmPin,
              },
              explicitToken
            );

        setRecoveryCodes(
          result?.recoveryCodes ||
            []
        );
        setHasPin(true);
        setPinBlocked(false);
        setRemainingPinAttempts(5);
        setRetryAfterSeconds(0);
        setPassword('');
        setPin('');
        setConfirmPin('');
        setMode(
          MODE.RECOVERY_CODES
        );
      } catch (apiError) {
        setError(
          apiError?.message ||
            'PIN sıfırlanamadı.'
        );
      } finally {
        setLoading(false);
      }
    };

  const handleCodeRecovery =
    async (
      event
    ) => {
      event.preventDefault();
      setError('');
      setInfo('');

      if (!recoveryCode) {
        setError(
          'Kurtarma kodunu girin.'
        );
        return;
      }

      if (
        pin.length !== 4 ||
        confirmPin.length !== 4
      ) {
        setError(
          'Yeni PIN 4 haneli olmalıdır.'
        );
        return;
      }

      if (
        pin !== confirmPin
      ) {
        setError(
          'Yeni PIN kodları eşleşmiyor.'
        );
        return;
      }

      try {
        setLoading(true);

        const result =
          await screenLockApi
            .recoverWithCode(
              {
                recoveryCode,
                newPin:
                  pin,
                confirmPin,
              },
              explicitToken
            );

        setRecoveryCodes(
          result?.recoveryCodes ||
            []
        );
        setHasPin(true);
        setPinBlocked(false);
        setRemainingPinAttempts(5);
        setRetryAfterSeconds(0);
        setRecoveryCode('');
        setPin('');
        setConfirmPin('');
        setMode(
          MODE.RECOVERY_CODES
        );
      } catch (apiError) {
        setError(
          apiError?.message ||
            'Kurtarma kodu doğrulanamadı.'
        );
      } finally {
        setLoading(false);
      }
    };

  const copyRecoveryCodes =
    async () => {
      try {
        await navigator.clipboard
          .writeText(
            recoveryCodes.join(
              '\n'
            )
          );
        setCopied(true);
        setTimeout(
          () =>
            setCopied(false),
          1800
        );
      } catch {
        setError(
          'Kodlar panoya kopyalanamadı. Lütfen manuel olarak kaydedin.'
        );
      }
    };

  const finishRecoveryCodes =
    () => {
      setRecoveryCodes([]);
      setCopied(false);
      unlockLocal();
    };

  const formattedTime =
    useMemo(
      () =>
        new Intl.DateTimeFormat(
          'tr-TR',
          {
            hour:
              '2-digit',
            minute:
              '2-digit',
            hour12:
              false,
          }
        ).format(
          clock
        ),
      [
        clock,
      ]
    );

  const formattedDate =
    useMemo(
      () =>
        new Intl.DateTimeFormat(
          'tr-TR',
          {
            weekday:
              'long',
            day:
              '2-digit',
            month:
              'long',
          }
        ).format(
          clock
        ),
      [
        clock,
      ]
    );

  if (!user) {
    return null;
  }

  if (!initialized) {
    return null;
  }

  if (!isLocked) {
    return children;
  }

  const inputClassName = `
    h-14 w-full rounded-2xl border bg-[#0a1a30]/95 px-4
    text-center text-xl font-semibold tracking-[0.35em] text-white
    outline-none transition-all duration-300
    placeholder:text-sm placeholder:font-medium placeholder:tracking-normal
    placeholder:text-slate-500 focus:-translate-y-0.5
    focus:border-amber-300/60 focus:bg-[#0d223d]
    focus:shadow-[0_0_0_4px_rgba(251,191,36,0.08),0_12px_35px_rgba(0,0,0,0.28)]
    ${
      error
        ? 'border-red-400/50'
        : 'border-white/10'
    }
  `;

  const normalInputClassName = `
    h-12 w-full rounded-xl border border-white/10 bg-[#0a1a30]/95 px-4
    text-sm font-medium text-slate-100 caret-amber-300 outline-none
    transition-all duration-300 placeholder:text-slate-500
    hover:border-white/15 hover:bg-[#0c1f39]
    focus:-translate-y-0.5 focus:border-amber-300/55 focus:bg-[#0d223d]
    focus:text-white focus:shadow-[0_0_0_3px_rgba(251,191,36,0.08),0_14px_36px_rgba(0,0,0,0.22)]
  `;

  const renderAlert = () => {
    if (
      !error &&
      !info
    ) {
      return null;
    }

    return (
      <div
        className={`mt-3 rounded-xl border px-3 py-2.5 text-xs font-medium ${
          error
            ? 'border-red-400/15 bg-red-400/[0.055] text-red-300'
            : 'border-emerald-400/15 bg-emerald-400/[0.055] text-emerald-200'
        }`}
        role="alert"
      >
        {error || info}
      </div>
    );
  };

  const renderContent = () => {
    if (
      mode ===
      MODE.RECOVERY_CODES
    ) {
      return (
        <>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Kurtarma Kodlarınızı Kaydedin
          </h2>
          <p className="mx-auto mt-2 max-w-[340px] text-xs leading-5 text-slate-400">
            Bu kodlar yalnızca bir kez görüntülenir. Hesabınıza erişimi geri kazanmanız gereken durumlar için güvenli bir yerde saklayın.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recoveryCodes.map(
              (code) => (
                <div
                  key={code}
                  className="rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5 font-mono text-xs tracking-wide text-amber-100"
                >
                  {code}
                </div>
              )
            )}
          </div>

          {renderAlert()}

          <button
            type="button"
            onClick={copyRecoveryCodes}
            className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-slate-200 transition hover:bg-white/[0.07]"
          >
            {copied
              ? 'Kopyalandı ✓'
              : 'Tüm Kodları Kopyala'}
          </button>

          <button
            type="button"
            onClick={finishRecoveryCodes}
            className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-sm font-extrabold text-[#06152e] shadow-[0_14px_35px_rgba(245,158,11,0.16)] transition hover:-translate-y-0.5"
          >
            Kodları Kaydettim, Devam Et
          </button>
        </>
      );
    }

    if (
      mode ===
      MODE.SETUP
    ) {
      return (
        <>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Ekran Kilidi PIN’i Oluştur
          </h2>
          <p className="mx-auto mt-2 max-w-[300px] text-xs leading-5 text-slate-400">
            Çalışma alanınızı korumak için 4 haneli kişisel erişim PIN’inizi belirleyin.
          </p>

          <form
            onSubmit={handleSetup}
            className="mt-6"
          >
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={pin}
              onChange={(
                event
              ) => {
                setPin(
                  onlyDigits(
                    event.target.value
                  )
                );
                setError('');
              }}
              placeholder="Yeni PIN"
              maxLength={4}
              className={`derkenar-secure-input ${inputClassName}`}
              aria-label="Yeni PIN"
            />

            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(
                event
              ) => {
                setConfirmPin(
                  onlyDigits(
                    event.target.value
                  )
                );
                setError('');
              }}
              placeholder="PIN Tekrar"
              maxLength={4}
              className={`derkenar-secure-input mt-3 ${inputClassName}`}
              aria-label="PIN tekrar"
            />

            {renderAlert()}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-sm font-extrabold text-[#06152e] shadow-[0_14px_35px_rgba(245,158,11,0.16)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Güvenli PIN Oluşturuluyor...'
                : 'PIN Oluştur'}
            </button>
          </form>
        </>
      );
    }

    if (
      mode ===
      MODE.PASSWORD_RECOVERY
    ) {
      return (
        <>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            PIN’i Güvenle Sıfırla
          </h2>
          <p className="mx-auto mt-2 max-w-[330px] text-xs leading-5 text-slate-400">
            Kimliğinizi hesap şifrenizle doğrulayın ve yeni kişisel erişim PIN’inizi belirleyin.
          </p>

          {pinBlocked && (
            <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-3 py-2.5 text-xs text-amber-100">
              PIN 5 başarısız deneme sonrası güvenlik nedeniyle bloke edildi.
            </div>
          )}

          <form
            onSubmit={handlePasswordRecovery}
            className="mt-5"
          >
            <input
              ref={inputRef}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(
                event
              ) => {
                setPassword(
                  event.target.value
                );
                setError('');
              }}
              placeholder="Hesap şifreniz"
              className={`derkenar-secure-input ${normalInputClassName}`}
            />

            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={pin}
              onChange={(
                event
              ) =>
                setPin(
                  onlyDigits(
                    event.target.value
                  )
                )
              }
              placeholder="Yeni 4 haneli PIN"
              maxLength={4}
              className={`derkenar-secure-input mt-3 ${normalInputClassName}`}
            />

            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(
                event
              ) =>
                setConfirmPin(
                  onlyDigits(
                    event.target.value
                  )
                )
              }
              placeholder="Yeni PIN tekrar"
              maxLength={4}
              className={`derkenar-secure-input mt-3 ${normalInputClassName}`}
            />

            {renderAlert()}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-sm font-extrabold text-[#06152e] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading
                ? 'Kimlik Doğrulanıyor...'
                : 'Şifreyle PIN’i Sıfırla'}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setError('');
                setMode(
                  MODE.CODE_RECOVERY
                );
              }}
              className="font-semibold text-amber-200/90 hover:text-amber-100"
            >
              Kurtarma kodu kullan
            </button>

            <a
              href="/forgot-password"
              className="text-slate-400 transition hover:text-slate-200"
            >
              Hesap şifremi de unuttum
            </a>
          </div>
        </>
      );
    }

    if (
      mode ===
      MODE.CODE_RECOVERY
    ) {
      return (
        <>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Acil Kurtarma Kodu
          </h2>
          <p className="mx-auto mt-2 max-w-[330px] text-xs leading-5 text-slate-400">
            Daha önce güvenli biçimde sakladığınız tek kullanımlık kurtarma kodunuzu girin.
          </p>

          <form
            onSubmit={handleCodeRecovery}
            className="mt-5"
          >
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              value={recoveryCode}
              onChange={(
                event
              ) => {
                setRecoveryCode(
                  formatRecoveryCode(
                    event.target.value
                  )
                );
                setError('');
              }}
              placeholder="DRK-XXXX-XXXX-XXXX-XXXX"
              className={`derkenar-secure-input ${normalInputClassName} text-center font-mono tracking-wider`}
            />

            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={pin}
              onChange={(
                event
              ) =>
                setPin(
                  onlyDigits(
                    event.target.value
                  )
                )
              }
              placeholder="Yeni 4 haneli PIN"
              maxLength={4}
              className={`derkenar-secure-input mt-3 ${normalInputClassName}`}
            />

            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(
                event
              ) =>
                setConfirmPin(
                  onlyDigits(
                    event.target.value
                  )
                )
              }
              placeholder="Yeni PIN tekrar"
              maxLength={4}
              className={`derkenar-secure-input mt-3 ${normalInputClassName}`}
            />

            {renderAlert()}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-sm font-extrabold text-[#06152e] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading
                ? 'Kod Doğrulanıyor...'
                : 'Kurtarma Koduyla Devam Et'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setError('');
              setMode(
                MODE.PASSWORD_RECOVERY
              );
            }}
            className="mt-4 text-[11px] font-semibold text-slate-400 transition hover:text-white"
          >
            ← Hesap şifresiyle doğrulamaya dön
          </button>
        </>
      );
    }

    return (
      <>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Ekran Kilitli
        </h2>
        <p className="mx-auto mt-2 max-w-[300px] text-xs leading-5 text-slate-400">
          Güvenli çalışma alanınıza devam etmek için kişisel PIN’inizi girin.
        </p>

        <form
          onSubmit={handleUnlock}
          className="mt-6"
        >
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(
              event
            ) => {
              setPin(
                onlyDigits(
                  event.target.value
                )
              );
              setError('');
            }}
            placeholder="••••"
            maxLength={4}
            className={`derkenar-secure-input ${inputClassName}`}
            aria-label="Ekran kilidi PIN"
          />

          <div className="mt-3 flex items-center justify-center gap-1.5">
            {[0, 1, 2, 3].map(
              (index) => (
                <span
                  key={index}
                  className={`h-1.5 w-7 rounded-full transition-all ${
                    index <
                    pin.length
                      ? 'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,.25)]'
                      : 'bg-white/10'
                  }`}
                />
              )
            )}
          </div>

          {retryAfterSeconds > 0 && (
            <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] px-3 py-2.5 text-xs font-semibold text-amber-100">
              Güvenlik beklemesi: {retryAfterSeconds} sn
            </div>
          )}

          {remainingPinAttempts < 5 &&
            remainingPinAttempts > 0 &&
            retryAfterSeconds === 0 && (
              <div className="mt-3 text-[11px] text-slate-500">
                PIN bloke olmadan önce {remainingPinAttempts} deneme hakkınız kaldı.
              </div>
            )}

          {renderAlert()}

          <button
            type="submit"
            disabled={
              loading ||
              retryAfterSeconds >
                0
            }
            className="group relative mt-4 h-12 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-sm font-extrabold text-[#06152e] shadow-[0_14px_35px_rgba(245,158,11,0.16)] transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="derkenar-button-shine pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <span className="relative flex items-center justify-center gap-2">
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#06152e]/25 border-t-[#06152e]" />
              )}
              {retryAfterSeconds > 0
                ? `${retryAfterSeconds} sn bekleyin`
                : loading
                  ? 'Doğrulanıyor...'
                  : 'Kilidi Aç'}
            </span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError('');
            setPin('');
            setMode(
              MODE.PASSWORD_RECOVERY
            );
          }}
          className="mt-4 text-[11px] font-semibold text-slate-400 transition hover:text-amber-200"
        >
          PIN’imi Unuttum
        </button>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#041020] px-4 py-8">
      <style>{`
        @keyframes derkenarFloatOne {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(26px, -22px, 0) scale(1.05); }
        }
        @keyframes derkenarFloatTwo {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-30px, 24px, 0) scale(1.07); }
        }
        @keyframes derkenarLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes derkenarShine {
          0% { transform: translateX(-150%) skewX(-18deg); }
          58%, 100% { transform: translateX(260%) skewX(-18deg); }
        }
        @keyframes derkenarEnter {
          0% { opacity: 0; transform: translateY(8px) scale(.988); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes derkenarStatusPulse {
          0%, 100% { opacity: .6; box-shadow: 0 0 0 0 rgba(52,211,153,.10); }
          50% { opacity: 1; box-shadow: 0 0 0 5px rgba(52,211,153,0); }
        }
        .derkenar-float-one { animation: derkenarFloatOne 17s ease-in-out infinite; }
        .derkenar-float-two { animation: derkenarFloatTwo 20s ease-in-out infinite; }
        .derkenar-logo-float { animation: derkenarLogoFloat 6s ease-in-out infinite; }
        .derkenar-button-shine { animation: derkenarShine 5.2s ease-in-out infinite; }
        .derkenar-enter { animation: derkenarEnter .5s cubic-bezier(.16,1,.3,1) both; }
        @keyframes derkenarGridDrift {
          0% { transform: translate3d(0, 0, 0); opacity: .18; }
          50% { transform: translate3d(18px, 10px, 0); opacity: .28; }
          100% { transform: translate3d(0, 0, 0); opacity: .18; }
        }
        @keyframes derkenarHalo {
          0%, 100% { transform: scale(.96); opacity: .32; }
          50% { transform: scale(1.08); opacity: .62; }
        }
        @keyframes derkenarSweep {
          0% { transform: translateX(-140%); opacity: 0; }
          16% { opacity: .55; }
          42%, 100% { transform: translateX(240%); opacity: 0; }
        }
        .derkenar-status-dot { animation: derkenarStatusPulse 3s ease-in-out infinite; }
        .derkenar-grid-drift { animation: derkenarGridDrift 22s ease-in-out infinite; }
        .derkenar-logo-halo { animation: derkenarHalo 5.5s ease-in-out infinite; }
        .derkenar-card-sweep { animation: derkenarSweep 8s ease-in-out infinite; }
        .derkenar-secure-input:-webkit-autofill,
        .derkenar-secure-input:-webkit-autofill:hover,
        .derkenar-secure-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #f8fafc !important;
          caret-color: #fcd34d !important;
          box-shadow: 0 0 0 1000px #0a1a30 inset !important;
          transition: background-color 9999s ease-out 0s;
        }
        @media (prefers-reduced-motion: reduce) {
          .derkenar-float-one,
          .derkenar-float-two,
          .derkenar-logo-float,
          .derkenar-button-shine,
          .derkenar-enter,
          .derkenar-status-dot,
          .derkenar-grid-drift,
          .derkenar-logo-halo,
          .derkenar-card-sweep {
            animation: none !important;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(30,64,175,0.18),transparent_34%),radial-gradient(circle_at_50%_86%,rgba(245,158,11,0.07),transparent_28%),linear-gradient(145deg,#020817_0%,#06152e_50%,#020b18_100%)]" />
      <div className="derkenar-grid-drift pointer-events-none absolute inset-[-40px] bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      <div className="derkenar-float-one pointer-events-none absolute -left-24 top-[8%] h-72 w-72 rounded-full bg-blue-500/[0.08] blur-3xl" />
      <div className="derkenar-float-two pointer-events-none absolute -right-24 bottom-[5%] h-80 w-80 rounded-full bg-amber-400/[0.065] blur-3xl" />

      <div className="pointer-events-none absolute left-5 top-5 hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-left backdrop-blur-md sm:block">
        <div className="text-xl font-semibold tabular-nums tracking-tight text-white/90">
          {formattedTime}
        </div>
        <div className="mt-0.5 text-[10px] font-medium capitalize tracking-wide text-slate-500">
          {formattedDate}
        </div>
      </div>

      <div className="absolute right-5 top-5 hidden items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400 backdrop-blur-md sm:flex">
        <span className="derkenar-status-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
        KURUMSAL OTURUM GÜVENLİĞİ
      </div>

      <main className="derkenar-enter relative z-10 w-full max-w-[430px] text-center">
        <div className="relative mx-auto mb-5 h-20 w-20">
          <div className="derkenar-logo-halo pointer-events-none absolute inset-[-14px] rounded-[30px] bg-amber-300/[0.08] blur-2xl" />
          <div className="derkenar-logo-float relative flex h-20 w-20 items-center justify-center rounded-[24px] border border-amber-300/15 bg-white/[0.035] shadow-[0_20px_60px_rgba(0,0,0,.28)] backdrop-blur-xl">
          <img
            src="/favicon.svg"
            alt="Derkenar"
            className="h-12 w-12 object-contain"
          />
          </div>
        </div>

        <h1 className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-3xl font-bold tracking-[0.18em] text-transparent sm:text-4xl">
          DERKENAR
        </h1>

        <div className="mx-auto mt-3 flex max-w-[330px] items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-300/30" />
          <span className="text-[9px] font-bold tracking-[0.24em] text-amber-200/70">
            HUKUK BÜRO YÖNETİM SİSTEMİ
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-300/30" />
        </div>

        <section className="relative mt-7 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#071426]/75 p-px shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl">
          <div className="derkenar-card-sweep pointer-events-none absolute -inset-y-20 left-0 w-28 rotate-12 bg-gradient-to-r from-transparent via-white/[0.035] to-transparent blur-sm" />
          <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
          <div className="relative rounded-[25px] bg-gradient-to-b from-white/[0.045] to-white/[0.018] px-6 py-6 sm:px-7">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200 shadow-[0_12px_35px_rgba(245,158,11,0.07)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10M6.5 10h11A1.5 1.5 0 0 1 19 11.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 14v2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {renderContent()}
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-medium tracking-wide text-slate-600">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-3.5 w-3.5 text-emerald-400/65"
            aria-hidden="true"
          >
            <path
              d="M12 3 5.5 5.5v5.3c0 4.3 2.6 8.2 6.5 10.2 3.9-2 6.5-5.9 6.5-10.2V5.5L12 3Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Oturumunuz Derkenar güvenlik politikalarıyla korunur
        </div>
      </main>
    </div>
  );
};

export default IdleBrandOverlay;
