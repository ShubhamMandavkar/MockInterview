const adminMiddleware = (req, res, next) => {
    if (!req.user || !req.user.roles.includes("ADMIN")) {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};

export default adminMiddleware;
