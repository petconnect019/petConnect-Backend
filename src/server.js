const cluster = require('cluster');
const os = require('os');
const numCPUs = os.cpus().length;
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { setupAdminAccount } = require('./services/setupService');
const socketIo = require('socket.io');
const socketService = require('./services/socketService');

const PORT = process.env.PORT || 5000;

if (cluster.isMaster) {
    console.log(`Proceso maestro ${process.pid} está corriendo`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} murió`);
        cluster.fork();
    });
} else {
    const startServer = async () => {
        try {
            const app = require('./app'); 
            const server = http.createServer(app);
            const io = socketIo(server, {
                cors: {
                    origin: process.env.FRONTEND_URL,
                    methods: ["GET", "POST"],
                    credentials: true
                }
            });

            socketService.initialize(io);

            await connectDB();
            await setupAdminAccount();

            server.listen(PORT, () => {
                console.log(`Worker ${process.pid} iniciado en puerto ${PORT}`);
            });

            // Cierre limpio
            process.on('SIGTERM', () => gracefulShutdown(server));
            process.on('SIGINT', () => gracefulShutdown(server));

        } catch (error) {
            console.error('❌ Error al iniciar el servidor:', error);
            process.exit(1);
        }
    };

    startServer();
}

// Función para cerrar el servidor y MongoDB
const gracefulShutdown = async (server) => {
    console.log('🛑 Cerrando conexiones...');
    try {
        await mongoose.connection.close();
        console.log('✔️ Conexión a MongoDB cerrada');

        server.close(() => {
            console.log('✔️ Servidor HTTP cerrado');
            process.exit(0);
        });
    } catch (error) {
        console.error('❌ Error durante el cierre:', error);
        process.exit(1);
    }
};
