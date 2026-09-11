import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import {
  ReactQueryDevtools,
} from '@tanstack/react-query-devtools';

const queryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus:
          false,

        retry: 1,

        staleTime:
          5 * 60 * 1000,

        gcTime:
          10 * 60 * 1000,

        refetchOnReconnect:
          true,
      },

      mutations: {
        retry: 0,
      },
    },
  });

export const QueryProvider = ({
  children,
}) => {
  return (
    <QueryClientProvider
      client={queryClient}
    >
      {children}

      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  );
};

export {
  queryClient,
};