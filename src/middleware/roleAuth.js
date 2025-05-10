const roleAuth = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists and has a role
      if (!req.user || !req.user.role) {
        return res.status(401).json({ error: 'Unauthorized - No user role found' });
      }

      // Check if user's role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error checking role authorization' });
    }
  };
};

module.exports = roleAuth;