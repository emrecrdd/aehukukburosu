import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import userApi from './user.api.js';
import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
// ======================================================

export const USER_QUERY_KEYS = {
  all: ['users'],
  list: (params = {}) => ['users', params],
  detail: (id) => ['user', id],
  lawyers: () => ['users', { role: 'lawyer' }],
};

// ======================================================
// CACHE
// ======================================================

const CACHE = {
  NORMAL: 5 * 60 * 1000,
  LONG: 10 * 60 * 1000,
  GC: 10 * 60 * 1000,
};

// ======================================================
// QUERIES
// ======================================================

export const useUsers = (params = {}) => {
  return useQuery({
    queryKey: USER_QUERY_KEYS.list(params),
    queryFn: () => userApi.getAll(params),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
    placeholderData: (previousData) => previousData,
  });
};

export const useUser = (id) => {
  return useQuery({
    queryKey: USER_QUERY_KEYS.detail(id),
    queryFn: () => userApi.getOne(id),
    enabled: !!id,
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
  });
};

export const useLawyers = () => {
  return useQuery({
    queryKey: USER_QUERY_KEYS.lawyers(),
    queryFn: () => userApi.getLawyers(),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
  });
};

// ======================================================
// MUTATIONS
// ======================================================

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => userApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(variables.id) });
      toast.success('Kullanıcı başarıyla güncellendi');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Kullanıcı güncellenemedi');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      toast.success('Kullanıcı başarıyla silindi');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Kullanıcı silinemedi');
    },
  });
};

export const useToggleUserActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }) => userApi.toggleActive(id, is_active),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(variables.id) });
      toast.success('Kullanıcı durumu güncellendi');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Durum güncellenemedi');
    },
  });
};

export const useChangeUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }) => userApi.changeRole(id, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(variables.id) });
      toast.success('Kullanıcı rolü güncellendi');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Rol güncellenemedi');
    },
  });
};