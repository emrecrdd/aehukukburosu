import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  io,
} from 'socket.io-client';

import {
  useAuth,
} from './auth.provider.jsx';

import env from '../config/env.js';

export const SocketContext =
  createContext(null);

const attachListeners = (
  socket,
  listeners
) => {
  listeners.forEach(
    (
      callbacks,
      event
    ) => {
      callbacks.forEach(
        (
          callback
        ) => {
          socket.on(
            event,
            callback
          );
        }
      );
    }
  );
};

export const SocketProvider = ({
  children,
}) => {
  const {
    tokens,
  } =
    useAuth();

  const [
    isConnected,
    setIsConnected,
  ] =
    useState(false);

  const [
    connectionError,
    setConnectionError,
  ] =
    useState(null);

  const [
    socketInstance,
    setSocketInstance,
  ] =
    useState(null);

  const socketRef =
    useRef(null);

  /*
   * Listener registry provider ömrü boyunca korunur.
   *
   * Token refresh / reconnect sırasında yeni socket
   * oluşturulursa mevcut consumer listener'ları yeniden
   * bağlanır.
   */
  const listenersRef =
    useRef(
      new Map()
    );

  const accessToken =
    tokens?.accessToken;

  // ====================================================
  // CONNECTION
  // ====================================================

  useEffect(() => {
    if (!accessToken) {
      if (
        socketRef.current
      ) {
        socketRef.current.disconnect();
        socketRef.current =
          null;
      }

      setSocketInstance(
        null
      );

      setIsConnected(
        false
      );

      setConnectionError(
        null
      );

      return undefined;
    }

    const socket =
      io(
        env.WS_URL,
        {
          auth: {
            token:
              accessToken,
          },

          transports: [
            'websocket',
            'polling',
          ],

          reconnection:
            true,

          reconnectionAttempts:
            10,

          reconnectionDelay:
            1000,

          reconnectionDelayMax:
            5000,

          timeout:
            10000,
        }
      );

    socketRef.current =
      socket;

    setSocketInstance(
      socket
    );

    const handleConnect =
      () => {
        setIsConnected(
          true
        );

        setConnectionError(
          null
        );

        if (
          import.meta.env.DEV
        ) {
          console.log(
            'Socket connected:',
            socket.id
          );
        }
      };

    const handleDisconnect =
      (
        reason
      ) => {
        setIsConnected(
          false
        );

        if (
          import.meta.env.DEV
        ) {
          console.log(
            'Socket disconnected:',
            reason
          );
        }
      };

    const handleConnectError =
      (
        error
      ) => {
        setIsConnected(
          false
        );

        setConnectionError(
          error
        );

        if (
          import.meta.env.DEV
        ) {
          console.error(
            'Socket connection error:',
            error
          );
        }
      };

    socket.on(
      'connect',
      handleConnect
    );

    socket.on(
      'disconnect',
      handleDisconnect
    );

    socket.on(
      'connect_error',
      handleConnectError
    );

    /*
     * Consumer'lar provider socket effect'inden önce
     * listener kaydetmiş olabilir.
     */
    attachListeners(
      socket,
      listenersRef.current
    );

    return () => {
      /*
       * Custom listener'ları yeni socket'e tekrar
       * bağlayacağımız için registry temizlenmez.
       */
      listenersRef.current.forEach(
        (
          callbacks,
          event
        ) => {
          callbacks.forEach(
            (
              callback
            ) => {
              socket.off(
                event,
                callback
              );
            }
          );
        }
      );

      socket.off(
        'connect',
        handleConnect
      );

      socket.off(
        'disconnect',
        handleDisconnect
      );

      socket.off(
        'connect_error',
        handleConnectError
      );

      socket.disconnect();

      if (
        socketRef.current ===
        socket
      ) {
        socketRef.current =
          null;

        setSocketInstance(
          null
        );
      }

      setIsConnected(
        false
      );
    };
  }, [
    accessToken,
  ]);

  // ====================================================
  // EMIT
  // ====================================================

  const emit =
    useCallback(
      (
        event,
        data,
        acknowledgement
      ) => {
        const socket =
          socketRef.current;

        if (
          !socket ||
          !socket.connected
        ) {
          if (
            import.meta.env.DEV
          ) {
            console.warn(
              `Socket emit skipped, not connected: ${event}`
            );
          }

          return false;
        }

        if (
          typeof acknowledgement ===
          'function'
        ) {
          socket.emit(
            event,
            data,
            acknowledgement
          );
        } else {
          socket.emit(
            event,
            data
          );
        }

        return true;
      },
      []
    );

  // ====================================================
  // ON
  // ====================================================

  const on =
    useCallback(
      (
        event,
        callback
      ) => {
        if (
          !event ||
          typeof callback !==
            'function'
        ) {
          return () => {};
        }

        const callbacks =
          listenersRef.current.get(
            event
          ) ||
          new Set();

        /*
         * Aynı callback aynı event için registry'ye
         * yalnızca bir kez girer.
         */
        if (
          !callbacks.has(
            callback
          )
        ) {
          callbacks.add(
            callback
          );

          listenersRef.current.set(
            event,
            callbacks
          );

          socketRef.current?.on(
            event,
            callback
          );
        }

        return () => {
          socketRef.current?.off(
            event,
            callback
          );

          const currentCallbacks =
            listenersRef.current.get(
              event
            );

          if (
            !currentCallbacks
          ) {
            return;
          }

          currentCallbacks.delete(
            callback
          );

          if (
            currentCallbacks.size ===
            0
          ) {
            listenersRef.current.delete(
              event
            );
          }
        };
      },
      []
    );

  // ====================================================
  // OFF
  // ====================================================

  const off =
    useCallback(
      (
        event,
        callback
      ) => {
        if (!event) {
          return;
        }

        if (
          callback
        ) {
          socketRef.current?.off(
            event,
            callback
          );

          const callbacks =
            listenersRef.current.get(
              event
            );

          callbacks?.delete(
            callback
          );

          if (
            callbacks?.size ===
            0
          ) {
            listenersRef.current.delete(
              event
            );
          }

          return;
        }

        const callbacks =
          listenersRef.current.get(
            event
          );

        callbacks?.forEach(
          (
            registeredCallback
          ) => {
            socketRef.current?.off(
              event,
              registeredCallback
            );
          }
        );

        listenersRef.current.delete(
          event
        );
      },
      []
    );

  const value =
    useMemo(
      () => ({
        socket:
          socketInstance,

        isConnected,

        connectionError,

        emit,
        on,
        off,
      }),
      [
        socketInstance,
        isConnected,
        connectionError,
        emit,
        on,
        off,
      ]
    );

  return (
    <SocketContext.Provider
      value={
        value
      }
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
