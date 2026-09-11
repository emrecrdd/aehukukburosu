import {
  licenseService,
} from './license.service.js';

export const licenseController = {
  async current(
    req,
    res,
    next
  ) {
    try {
      const license =
        await licenseService
          .getCurrent();

      res.set(
        'Cache-Control',
        'private, no-store'
      );

      return res
        .status(200)
        .json({
          success: true,
          data: {
            ...license,
            enforcementEnabled:
              String(
                process.env
                  .LICENSE_ENFORCEMENT_ENABLED ||
                  ''
              ).toLowerCase() ===
              'true',
          },
        });
    } catch (error) {
      return next(error);
    }
  },
};

export default licenseController;
