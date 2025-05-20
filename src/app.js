require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimiter = require('./middlewares/rateLimitMiddleware');
require('./config/passport');

const app = express();

// Middlewares básicos y sesión
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

const origins = [
  'http://localhost:3000',
  'http://localhost:5175',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: origins,
    credentials: true
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: 'petconnect',
        collectionName: 'sessions'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(rateLimiter);

app.use('/api', routes);

app.get('/', (_, res) => res.send('🚀 PetConnect Backend funcionando!'));

module.exports = app;