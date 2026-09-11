import {
  useContext,
} from 'react';

import {
  SocketContext,
} from '../app/providers/socket.provider.jsx';

/*
 * Eski consumer API'si korunur:
 *
 * const { on, off, emit, isConnected } = useSocket();
 *
 * Chat için ayrı namespace açmıyoruz. Mevcut root
 * Socket.IO bağlantısı notification + chat tarafından
 * paylaşılır.
 */
export const useSocket = (
  namespace = '/'
) => {
  const context =
    useContext(
      SocketContext
    );

  if (!context) {
    throw new Error(
      'useSocket, SocketProvider içinde kullanılmalıdır.'
    );
  }

  if (
    namespace !== '/' &&
    import.meta.env.DEV
  ) {
    console.warn(
      `Socket namespace "${namespace}" yok sayıldı. Uygulama ortak root socket bağlantısını kullanıyor.`
    );
  }

  return context;
};

export default useSocket;
