const Admin = require('./Admin');
const {ApiError} = require('../../../errors/errorHandler');

exports.makeAdmin = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const admin = await Admin.findById(userId);
        if (!admin) throw new ApiError('Admin not found', 404);
        admin.role = 'ADMIN';
        await admin.save();
        return res.status(200).json({ message: 'Admin made successfully' });
    } catch (error) {
        return next(error);
    }
};



exports.makeSuperAdmin = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const admin = await Admin.findById(userId);
        if (!admin) throw new ApiError('Admin not found', 404);
        admin.role = 'SUPER_ADMIN';
        await admin.save();
        return res.status(200).json({ message: 'Super Admin made successfully' });
    } catch (error) {
        return next(error);
    }
};

exports.removeAdmin = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const admin = await Admin.findById(userId);
        if (!admin) throw new ApiError('Admin not found', 404);
        admin.role = 'USER';
        await admin.save();
        return res.status(200).json({ message: 'Admin removed successfully' });
    } catch (error) {
        return next(error);
    }
};

exports.removeSuperAdmin = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const admin = await Admin.findById(userId);
        if (!admin) throw new ApiError('Admin not found', 404);
        admin.role = 'USER';
        await admin.save();
        return res.status(200).json({ message: 'Super Admin removed successfully' });
    } catch (error) {
        return next(error);
    }
};
