import {
  useQuery,
} from '@tanstack/react-query';

import performanceApi from './performance.api.js';

// ======================================================
// FILTER HELPERS
// ======================================================

const normalizeFilters = (
  filters = {}
) => {
  if (
    !filters ||
    typeof filters !==
      'object' ||
    Array.isArray(
      filters
    )
  ) {
    return {};
  }

  const normalized = {};

  if (
    filters.status
  ) {
    normalized.status =
      filters.status;
  }

  if (
    filters.date_from
  ) {
    normalized.date_from =
      filters.date_from;
  }

  if (
    filters.date_to
  ) {
    normalized.date_to =
      filters.date_to;
  }

  if (
    filters.overdue !==
      undefined &&
    filters.overdue !==
      null &&
    filters.overdue !==
      ''
  ) {
    normalized.overdue =
      filters.overdue;
  }

  return normalized;
};

/*
 * Önceki kullanımımız:
 *
 * useTeamPerformanceOverview({
 *   enabled: canViewTeam,
 * })
 *
 * idi.
 *
 * Şimdi filtre desteği geldiği için ideal kullanım:
 *
 * useTeamPerformanceOverview(
 *   filters,
 *   {
 *     enabled: canViewTeam,
 *   }
 * )
 *
 * Ama mevcut sayfayı hemen kırmamak için
 * eski kullanımı da destekliyoruz.
 */
const resolveHookArguments = (
  filters = {},
  options = {}
) => {
  const possibleOptions =
    filters &&
    typeof filters ===
      'object' &&
    !Array.isArray(
      filters
    )
      ? filters
      : {};

  const hasFilterField =
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'status'
    ) ||
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'date_from'
    ) ||
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'date_to'
    ) ||
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'overdue'
    );

  const hasQueryOption =
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'enabled'
    ) ||
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'staleTime'
    ) ||
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'gcTime'
    ) ||
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'refetchOnWindowFocus'
    ) ||
    Object.prototype.hasOwnProperty.call(
      possibleOptions,
      'retry'
    );

  /*
   * İlk parametre filtre değil ama query option ise,
   * eski kullanım kabul edilir.
   */
  if (
    !hasFilterField &&
    hasQueryOption &&
    (
      !options ||
      Object.keys(
        options
      ).length === 0
    )
  ) {
    return {
      filters: {},
      options:
        possibleOptions,
    };
  }

  return {
    filters:
      normalizeFilters(
        filters
      ),

    options:
      options || {},
  };
};

// ======================================================
// QUERY KEYS
// ======================================================

export const performanceQueryKeys = {
  all: [
    'performance',
  ],

  my: (
    filters = {}
  ) => [
    ...performanceQueryKeys.all,
    'me',
    normalizeFilters(
      filters
    ),
  ],

  overview: (
    filters = {}
  ) => [
    ...performanceQueryKeys.all,
    'overview',
    normalizeFilters(
      filters
    ),
  ],

  users: (
    filters = {}
  ) => [
    ...performanceQueryKeys.all,
    'users',
    normalizeFilters(
      filters
    ),
  ],

  user: (
    userId,
    filters = {}
  ) => [
    ...performanceQueryKeys.all,
    'user',
    userId,
    normalizeFilters(
      filters
    ),
  ],
};

// ======================================================
// MY PERFORMANCE
// ======================================================

export const useMyPerformance = (
  filters = {},
  options = {}
) => {
  const resolved =
    resolveHookArguments(
      filters,
      options
    );

  return useQuery({
    ...resolved.options,

    queryKey:
      performanceQueryKeys.my(
        resolved.filters
      ),

    queryFn: () =>
      performanceApi.getMyPerformance(
        resolved.filters
      ),
  });
};

// ======================================================
// TEAM OVERVIEW
// ======================================================

export const useTeamPerformanceOverview = (
  filters = {},
  options = {}
) => {
  const resolved =
    resolveHookArguments(
      filters,
      options
    );

  return useQuery({
    ...resolved.options,

    queryKey:
      performanceQueryKeys.overview(
        resolved.filters
      ),

    queryFn: () =>
      performanceApi.getTeamOverview(
        resolved.filters
      ),
  });
};

// ======================================================
// ALL USERS PERFORMANCE
// ======================================================

export const useUsersPerformance = (
  filters = {},
  options = {}
) => {
  const resolved =
    resolveHookArguments(
      filters,
      options
    );

  return useQuery({
    ...resolved.options,

    queryKey:
      performanceQueryKeys.users(
        resolved.filters
      ),

    queryFn: () =>
      performanceApi.getUsersPerformance(
        resolved.filters
      ),
  });
};

// ======================================================
// SINGLE USER PERFORMANCE
// ======================================================

export const useUserPerformance = (
  userId,
  filters = {},
  options = {}
) => {
  const resolved =
    resolveHookArguments(
      filters,
      options
    );

  const optionEnabled =
    resolved.options
      ?.enabled;

  const enabled =
    Boolean(
      userId
    ) &&
    (
      optionEnabled ??
      true
    );

  return useQuery({
    ...resolved.options,

    queryKey:
      performanceQueryKeys.user(
        userId,
        resolved.filters
      ),

    queryFn: () =>
      performanceApi.getUserPerformance(
        userId,
        resolved.filters
      ),

    enabled,
  });
};