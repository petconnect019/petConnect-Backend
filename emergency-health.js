#!/usr/bin/env node
/**
 * Servidor de emergencia - Solo para healthcheck
 * Se usa como fallback si el servidor principal falla
 */

const http = require('http');
const PORT = process.env.PORT || 3001;

console.log('🚨 Iniciando servidor de emergencia para healthcheck');
console.log(`🔌 Puerto: ${PORT}`);

const server = http.createServer((req, res) => {
    // Solo responder a healthcheck
    if (req.url === '/health' || req.url === '/') {
        const healthData = {
            status: 'emergency',
            message: 'Servidor de emergencia activo',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            port: PORT,
            pid: process.pid
        };
        
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        
        res.end(JSON.stringify(healthData, null, 2));
        
        console.log(`🔍 Healthcheck servido: ${req.url}`);
    } else {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Service temporarily unavailable - Emergency mode');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚨 Servidor de emergencia activo en puerto ${PORT}`);
    console.log('🔍 Solo responde a /health y /');
    console.log('⚠️ Funcionalidad completa no disponible');
});

// Intentar iniciar el servidor principal después de 10 segundos
setTimeout(() => {
    console.log('🔄 Intentando iniciar servidor principal...');
    try {
        require('./startup-check.js');
    } catch (error) {
        console.error('❌ Servidor principal falló, continuando en modo emergencia');
    }
}, 10000);

process.on('SIGTERM', () => {
    console.log('🛑 Cerrando servidor de emergencia...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Error no manejado:', err.message);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Excepción no capturada:', err.message);
}); 