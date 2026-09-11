import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationApi from './notification.api.js';
import toast from 'react-hot-toast';

// ✅ Okunmamış bildirim sayısı - GÜNCELLENDİ
export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: async () => {
      console.log('📡 useUnreadCount queryFn çağrıldı');
      const result = await notificationApi.getUnreadCount();
      console.log('📡 useUnreadCount result:', result?.data);
       return result?.data?.data?.count || 0;  // ✅ Sadece count döndür
    },
    staleTime: 5 * 1000, // ✅ 5 saniye
    refetchInterval: 10 * 1000, // ✅ 10 saniyede bir yenile
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });
};

// ✅ Bildirim listesi
export const useNotifications = (params = {}) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.getMyNotifications(params),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

// ✅ Okundu işaretle
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
      queryClient.refetchQueries({ queryKey: ['notification-unread-count'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bildirim güncellenemedi');
    },
  });
};

// ✅ Tümünü okundu işaretle
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
      queryClient.refetchQueries({ queryKey: ['notification-unread-count'] });
      toast.success('Tüm bildirimler okundu');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'İşlem başarısız');
    },
  });
};

// ✅ Sil
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
      queryClient.refetchQueries({ queryKey: ['notification-unread-count'] });
      toast.success('Bildirim silindi');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bildirim silinemedi');
    },
  });
};

// ✅ Tümünü sil
export const useDeleteAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
      queryClient.refetchQueries({ queryKey: ['notification-unread-count'] });
      toast.success('Tüm bildirimler silindi');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'İşlem başarısız');
    },
  });
};