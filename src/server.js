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
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment && cluster.isMaster) {
    console.log('\n=== INICIANDO SERVIDOR EN MODO CLUSTER (DESARROLLO) ===');
    console.log(`📌 Proceso Maestro (PID: ${process.pid})`);
    console.log(`📌 Creando ${numCPUs} workers...\n`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`❌ Worker ${worker.process.pid} se ha detenido. Iniciando nuevo worker...`);
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
            const processType = isDevelopment && !cluster.isMaster ? `Worker ${process.pid}` : 'Servidor';
            console.log(`🔌 ${processType}: Conectado a MongoDB`);
            
            const adminSetup = await setupAdminAccount();
            if (adminSetup.created) {
                console.log(`👤 ${processType}: Nueva cuenta admin creada`);
                console.log(`📧 Email: ${adminSetup.email}`);
                console.log(`🔑 Contraseña: ${adminSetup.password}`);
            } else {
                console.log(`👤 ${processType}: Cuenta admin verificada`);
            }

            server.listen(PORT, () => {
                console.log(`🚀 ${processType}: Servidor activo en puerto ${PORT}\n`);
            });

            // Cierre limpio
            process.on('SIGTERM', () => gracefulShutdown(server));
            process.on('SIGINT', () => gracefulShutdown(server));

        } catch (error) {
            const processType = isDevelopment && !cluster.isMaster ? `Worker ${process.pid}` : 'Servidor';
            console.error(`❌ ${processType}: Error al iniciar:`, error);
            process.exit(1);
        }
    };

    startServer();
}

// Función para cerrar el servidor y MongoDB
const gracefulShutdown = async (server) => {
    const processType = isDevelopment && !cluster.isMaster ? `Worker ${process.pid}` : 'Servidor';
    console.log(`\n🛑 ${processType}: Iniciando cierre controlado...`);
    try {
        await mongoose.connection.close();
        console.log(`✔️ ${processType}: Conexión a MongoDB cerrada`);

        server.close(() => {
            console.log(`✔️ ${processType}: Servidor HTTP cerrado`);
            process.exit(0);
        });
    } catch (error) {
        console.error(`❌ ${processType}: Error durante el cierre:`, error);
        process.exit(1);
    }
};
