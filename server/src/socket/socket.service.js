let ioInstance = null;

// ======================================================
// SOCKET INSTANCE
// ======================================================

export const setIo = (
  io
) => {
  ioInstance = io;
};

export const getIo = () => {
  if (!ioInstance) {
    throw new Error(
      'Socket.IO henüz başlatılmadı.'
    );
  }

  return ioInstance;
};

// ======================================================
// EMIT HELPERS
// ======================================================

export const emitToUser = (
  userId,
  event,
  payload
) => {
  if (
    !ioInstance ||
    !userId ||
    !event
  ) {
    return false;
  }

  ioInstance
    .to(
      `user-${userId}`
    )
    .emit(
      event,
      payload
    );

  return true;
};

export const emitToUsers = (
  userIds,
  event,
  payload
) => {
  if (
    !ioInstance ||
    !Array.isArray(userIds) ||
    userIds.length === 0 ||
    !event
  ) {
    return false;
  }

  const uniqueUserIds = [
    ...new Set(
      userIds.filter(Boolean)
    ),
  ];

  if (
    uniqueUserIds.length === 0
  ) {
    return false;
  }

  let target =
    ioInstance;

  for (
    const userId
    of uniqueUserIds
  ) {
    target =
      target.to(
        `user-${userId}`
      );
  }

  target.emit(
    event,
    payload
  );

  return true;
};

export const disconnectUser = async (
  userId
) => {
  if (
    !ioInstance ||
    !userId
  ) {
    return false;
  }

  const sockets =
    await ioInstance
      .in(
        `user-${userId}`
      )
      .fetchSockets();

  for (
    const socket
    of sockets
  ) {
    socket.disconnect(
      true
    );
  }

  return true;
};

export default {
  setIo,
  getIo,
  emitToUser,
  emitToUsers,
  disconnectUser,
};
