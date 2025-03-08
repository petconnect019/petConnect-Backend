const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../models/UserModel');
require('dotenv').config();

// Verificar que las variables de entorno estén definidas
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Error: Google OAuth credentials no estan configuradas');
    process.exit(1);
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/google/callback",
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        // Buscar usuario existente
        let user = await UserModel.findOne({ google_id: profile.id });

        if (!user) {
            // Crear nuevo usuario si no existe
            user = await UserModel.create({
                google_id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                profile_picture: profile.photos[0].value
            });
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Serialización del usuario para la sesión
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialización del usuario
passport.deserializeUser(async (id, done) => {
    try {
        const user = await UserModel.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
