const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { setupAdminAccount } = require('./services/setupService');
const socketIo = require('socket.io');
const socketService = require('./services/socketService');

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

console.log(`🚀 Iniciando PetConnect Backend...`);
console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Puerto configurado: ${PORT}`);

const startServer = async () => {
    try {
        console.log('📦 Cargando aplicación Express...');
        const app = require('./app'); 
        
        console.log('🌐 Creando servidor HTTP...');
        const server = http.createServer(app);
        
        console.log('🔌 Configurando Socket.IO...');
        
        // Configuración automática de CORS para Railway
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'https://pet-connect-front.vercel.app',
            // Agregar otras URLs de tu frontend en producción aquí
            process.env.FRONTEND_URL
        ].filter(Boolean); // Eliminar valores undefined/null
        
        console.log('🔗 URLs permitidas para CORS:', allowedOrigins);
        
        const io = socketIo(server, {
            cors: {
                origin: (origin, callback) => {
                    // Permitir requests sin origin (aplicaciones móviles, Postman, etc.)
                    if (!origin) return callback(null, true);
                    
                    // Verificar si el origin está en la lista permitida
                    if (allowedOrigins.includes(origin)) {
                        return callback(null, true);
                    }
                    
                    console.log(`⚠️ Origin no permitido: ${origin}`);
                    return callback(new Error('No permitido por CORS'), false);
                },
                methods: ["GET", "POST", "PUT", "DELETE"],
                credentials: true,
                allowedHeaders: ["Authorization", "Content-Type"]
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000,
            connectTimeout: 60000,
            allowEIO3: true
        });

        socketService.initialize(io);

        console.log('🔗 Conectando a MongoDB...');
        await connectDB();
        console.log('✅ Conectado a MongoDB exitosamente');
        
        console.log('👤 Configurando cuenta administrador...');
        try {
            const adminSetup = await setupAdminAccount();
            if (adminSetup.created) {
                console.log('👤 Nueva cuenta admin creada');
                console.log(`📧 Email: ${adminSetup.email}`);
                console.log(`🔑 Contraseña: ${adminSetup.password}`);
            } else {
                console.log('👤 Cuenta admin verificada');
            }
        } catch (adminError) {
            console.warn('⚠️ Error al configurar admin (continuando):', adminError.message);
        }

        console.log('🚀 Iniciando servidor HTTP...');
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Servidor PetConnect activo en puerto ${PORT}`);
            console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📡 Health check disponible en: http://0.0.0.0:${PORT}/health`);
            console.log('='.repeat(50));
        });

        // Cierre limpio
        process.on('SIGTERM', () => gracefulShutdown(server));
        process.on('SIGINT', () => gracefulShutdown(server));

        // Capturar errores no manejados
        process.on('unhandledRejection', (err) => {
            console.error('❌ Unhandled Promise Rejection:', err);
        });

        process.on('uncaughtException', (err) => {
            console.error('❌ Uncaught Exception:', err);
            gracefulShutdown(server);
        });

    } catch (error) {
        console.error('❌ Error crítico al iniciar servidor:', error);
        console.error('Stack trace:', error.stack);
        
        // En lugar de salir inmediatamente, intentar proporcionar diagnóstico
        if (error.message.includes('MONGODB_URI')) {
            console.error('💡 Sugerencia: Verificar variable MONGODB_URI en Railway');
        }
        
        setTimeout(() => {
            console.error('💀 Terminando proceso debido a error crítico');
            process.exit(1);
        }, 5000);
    }
};

startServer();

// Función para cerrar el servidor y MongoDB
const gracefulShutdown = async (server) => {
    console.log('\n🛑 Iniciando cierre controlado del servidor...');
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('✔️ Conexión a MongoDB cerrada');
        }

        if (server) {
            server.close(() => {
                console.log('✔️ Servidor HTTP cerrado');
                console.log('👋 PetConnect Backend terminado correctamente');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    } catch (error) {
        console.error('❌ Error durante el cierre:', error);
        process.exit(1);
    }
};
