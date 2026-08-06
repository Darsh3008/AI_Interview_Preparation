import jwt from "jsonwebtoken";

const isAuth = (req, res, next) => {
    try {
        // Debug logs (remove after testing)
        

        // Get token from cookies
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Token not found"
            });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid token"
            });
        }

        // Save user id for next middleware/controller
        req.userId = decoded.userId;

        next();
    } catch (error) {
        console.error("isAuth Error:", error);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token has expired"
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export default isAuth;