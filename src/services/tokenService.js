const jwt = require('jsonwebtoken');
const RefreshTokenModel = require('../models/RefreshTokenModel');
const crypto = require('crypto');

const tokenService = {
    generateTokens: async (user) => {
        // Generar access token con 15 minutos de expiración
        const accessToken = jwt.sign(
            { 
                id: user._id,
                email: user.email,
                name: user.name,
                profile_picture: user.profile_picture,
                role: user.role,
                is_profile_public: user.is_profile_public,
                show_contact: user.show_contact,
                city: user.city,
                phone: user.phone
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' } 
        );

        // Generar refresh token
        const refreshToken = crypto.randomBytes(40).toString('hex');
        const expiresIn = new Date();
        expiresIn.setDate(expiresIn.getDate() + 20); // 20 días

        // Guardar refresh token en la base de datos
        await RefreshTokenModel.create({
            user: user._id,
            token: refreshToken,
            expires: expiresIn
        });

        return {
            accessToken,
            refreshToken,
            expiresIn
        };
    },

    verifyAccessToken: (token) => {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    },

    verifyRefreshToken: async (token) => {
        try {
            const refreshToken = await RefreshTokenModel.findOne({
                token,
                isRevoked: false,
                expires: { $gt: new Date() }
            }).populate('user');

            if (!refreshToken) {
                return null;
            }

            return refreshToken.user;
        } catch (error) {
            return null;
        }
    },

    revokeRefreshToken: async (token) => {
        await RefreshTokenModel.findOneAndUpdate(
            { token },
            { isRevoked: true }
        );
    }
};

module.exports = tokenService; 