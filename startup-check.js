#!/usr/bin/env node
/**
 * Script de verificación de startup para Railway
 * Verifica que todas las dependencias estén disponibles antes de iniciar el servidor
 */

console.log('🔍 PetConnect Backend - Verificación de Startup');
console.log('='.repeat(50));

// Verificar Node.js version
const nodeVersion = process.version;
console.log(`📋 Node.js: ${nodeVersion}`);

// Verificar variables de entorno críticas
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingVars = [];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        missingVars.push(varName);
        console.log(`❌ ${varName}: NO CONFIGURADA`);
    } else {
        console.log(`✅ ${varName}: Configurada`);
    }
});

// Verificar puerto
const port = process.env.PORT || 3001;
console.log(`🔌 Puerto: ${port}`);

// Verificar entorno
console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);

// Resultado de la verificación
if (missingVars.length > 0) {
    console.log('\n❌ VERIFICACIÓN FALLIDA');
    console.log(`Variables faltantes: ${missingVars.join(', ')}`);
    console.log('💡 Configurar estas variables en Railway antes de continuar');
    process.exit(1);
} else {
    console.log('\n✅ VERIFICACIÓN EXITOSA');
    console.log('🚀 Todas las dependencias están configuradas');
    console.log('▶️ Iniciando servidor principal...');
    console.log('='.repeat(50));
    
    // Iniciar el servidor principal
    require('./src/server.js');
} 