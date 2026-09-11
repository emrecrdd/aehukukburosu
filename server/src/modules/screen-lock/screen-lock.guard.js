import {
  screenLockService,
} from './screen-lock.service.js';

export const enforceScreenLockForRequest = async (
  req
) => {
  return screenLockService
    .enforceRequest(
      req
    );
};

export default enforceScreenLockForRequest;
