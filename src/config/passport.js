const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../models/UserModel');
require('dotenv').config();

// Verificar que las variables de entorno estén definidas
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Error: Google OAuth credentials are not configured');
    process.exit(1);
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Buscar usuario por Google ID usando Mongoose
        let user = await UserModel.findOne({ google_id: profile.id });

        if (!user) {
            // Si el usuario no existe, crear uno nuevo
            user = new UserModel({
                google_id: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                profile_picture: profile.photos[0].value,
                role: 'user'
            });

            await user.save();
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
