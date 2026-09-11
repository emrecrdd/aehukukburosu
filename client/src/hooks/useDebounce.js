import {
  useEffect,
  useState,
} from 'react';

export function useDebounce(
  value,
  delay = 500
) {
  const [
    debouncedValue,
    setDebouncedValue,
  ] = useState(value);

  useEffect(() => {
    const timeout =
      setTimeout(
        () => {
          setDebouncedValue(
            value
          );
        },
        Math.max(0, delay)
      );

    return () => {
      clearTimeout(
        timeout
      );
    };
  }, [
    value,
    delay,
  ]);

  return debouncedValue;
}

export default useDebounce;