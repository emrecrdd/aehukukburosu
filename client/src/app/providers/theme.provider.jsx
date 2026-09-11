import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import {
  useLocalStorage,
} from '../../hooks/useLocalStorage.js';

const ThemeContext =
  createContext(null);

const VALID_THEMES = new Set([
  'light',
  'dark',
]);

export const ThemeProvider = ({
  children,
}) => {
  const [
    theme,
    setTheme,
  ] = useLocalStorage(
    'theme',
    'light'
  );

  // ====================================================
  // NORMALIZE THEME
  // ====================================================

  const normalizedTheme =
    VALID_THEMES.has(theme)
      ? theme
      : 'light';

  // ====================================================
  // APPLY THEME
  // ====================================================

  useEffect(() => {
    if (
      typeof document ===
      'undefined'
    ) {
      return;
    }

    const root =
      document.documentElement;

    root.classList.toggle(
      'dark',
      normalizedTheme === 'dark'
    );

    root.style.colorScheme =
      normalizedTheme;
  }, [
    normalizedTheme,
  ]);

  // ====================================================
  // SET THEME
  // ====================================================

  const changeTheme =
    useCallback(
      (nextTheme) => {
        if (
          !VALID_THEMES.has(
            nextTheme
          )
        ) {
          return;
        }

        setTheme(
          nextTheme
        );
      },
      [
        setTheme,
      ]
    );

  // ====================================================
  // TOGGLE
  // ====================================================

  const toggleTheme =
    useCallback(() => {
      setTheme(
        (current) =>
          current === 'dark'
            ? 'light'
            : 'dark'
      );
    }, [
      setTheme,
    ]);

  // ====================================================
  // DERIVED
  // ====================================================

  const isDark =
    normalizedTheme ===
    'dark';

  // ====================================================
  // CONTEXT
  // ====================================================

  const value =
    useMemo(
      () => ({
        theme:
          normalizedTheme,

        isDark,

        setTheme:
          changeTheme,

        toggleTheme,
      }),
      [
        normalizedTheme,
        isDark,
        changeTheme,
        toggleTheme,
      ]
    );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context =
    useContext(
      ThemeContext
    );

  if (!context) {
    throw new Error(
      'useTheme must be used within ThemeProvider'
    );
  }

  return context;
};

export default ThemeContext;