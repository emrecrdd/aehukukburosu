import { PERMISSIONS } from '../constants/roles.js';

export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const userPermissions = PERMISSIONS[req.user.role] || [];
    
    if (userPermissions.includes('all') || userPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action',
    });
  };
};