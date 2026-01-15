const roleMiddleware = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user.roles.includes(requiredRole)) {
            return res
                .status(403)
                .json({ message: `${requiredRole} role required` });
        }
        next();
    };
};

export default roleMiddleware;
