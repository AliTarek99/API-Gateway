const prisma = require('@prisma/client');


exports.db;
exports.init = async () => {
    exports.db = exports.db? db : await prisma.connect(process.env.DATABASE_URL);
    return db;
}

exports.verifyToken = async (req, res, next) => {
    // get token from header
    const token = req.get('Authorization');
    if (!token) {
        return next();
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
};