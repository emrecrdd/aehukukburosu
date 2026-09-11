import {
  useCallback,
  useEffect,
  useState,
} from 'react';

const LOCAL_STORAGE_SYNC_EVENT =
  'derkenar:local-storage-sync';

const emitLocalStorageSync = (
  key
) => {
  if (
    typeof window ===
      'undefined'
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      LOCAL_STORAGE_SYNC_EVENT,
      {
        detail: {
          key,
        },
      }
    )
  );
};

export const useLocalStorage = (
  key,
  initialValue
) => {
  // ====================================================
  // INITIAL VALUE
  // ====================================================

  const getInitialValue =
    useCallback(() => {
      return typeof initialValue ===
        'function'
        ? initialValue()
        : initialValue;
    }, [initialValue]);

  // ====================================================
  // READ
  // ====================================================

  const readValue =
    useCallback(() => {
      if (
        typeof window ===
          'undefined'
      ) {
        return getInitialValue();
      }

      try {
        const item =
          window.localStorage.getItem(
            key
          );

        return item !== null
          ? JSON.parse(item)
          : getInitialValue();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            `localStorage read error (${key}):`,
            error
          );
        }

        return getInitialValue();
      }
    }, [
      key,
      getInitialValue,
    ]);

  const [
    storedValue,
    setStoredValue,
  ] = useState(readValue);

  // ====================================================
  // KEY DEĞİŞİRSE YENİDEN OKU
  // ====================================================

  useEffect(() => {
    setStoredValue(
      readValue()
    );
  }, [
    key,
    readValue,
  ]);

  // ====================================================
  // WRITE
  // ====================================================

  const setValue =
    useCallback(
      (value) => {
        try {
          const newValue =
            typeof value ===
            'function'
              ? value(
                  readValue()
                )
              : value;

          setStoredValue(
            newValue
          );

          if (
            typeof window !==
              'undefined'
          ) {
            window.localStorage.setItem(
              key,
              JSON.stringify(
                newValue
              )
            );

            /*
             * Browser'ın native `storage` eventi aynı
             * sekmede tetiklenmez. Axios interceptor gibi
             * hook dışından storage yazan kodlarla aynı
             * sekmede React state'ini senkron tutmak için
             * uygulama-içi event yayımlıyoruz.
             */
            emitLocalStorageSync(
              key
            );
          }
        } catch (error) {
          if (
            import.meta.env.DEV
          ) {
            console.error(
              `localStorage write error (${key}):`,
              error
            );
          }
        }
      },
      [
        key,
        readValue,
      ]
    );

  // ====================================================
  // REMOVE
  // ====================================================

  const removeValue =
    useCallback(() => {
      try {
        if (
          typeof window !==
            'undefined'
        ) {
          window.localStorage.removeItem(
            key
          );

          emitLocalStorageSync(
            key
          );
        }

        setStoredValue(
          getInitialValue()
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            `localStorage remove error (${key}):`,
            error
          );
        }
      }
    }, [
      key,
      getInitialValue,
    ]);

  // ====================================================
  // CROSS-TAB + SAME-TAB SYNC
  // ====================================================

  useEffect(() => {
    if (
      typeof window ===
        'undefined'
    ) {
      return undefined;
    }

    const syncValue = () => {
      setStoredValue(
        readValue()
      );
    };

    const handleStorage = (
      event
    ) => {
      if (
        event.key !== key
      ) {
        return;
      }

      syncValue();
    };

    const handleLocalStorageSync = (
      event
    ) => {
      if (
        event?.detail?.key !==
        key
      ) {
        return;
      }

      syncValue();
    };

    window.addEventListener(
      'storage',
      handleStorage
    );

    window.addEventListener(
      LOCAL_STORAGE_SYNC_EVENT,
      handleLocalStorageSync
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorage
      );

      window.removeEventListener(
        LOCAL_STORAGE_SYNC_EVENT,
        handleLocalStorageSync
      );
    };
  }, [
    key,
    readValue,
  ]);

  return [
    storedValue,
    setValue,
    removeValue,
  ];
};

export default useLocalStorage;
