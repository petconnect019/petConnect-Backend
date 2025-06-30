#!/usr/bin/env node
/**
 * Script de prueba para el endpoint de health
 * Uso: node test-health.js [URL]
 */

const http = require('http');
const https = require('https');

const testUrl = process.argv[2] || 'http://localhost:3001/health';
const isHttps = testUrl.startsWith('https://');
const client = isHttps ? https : http;

console.log(`🔍 Probando healthcheck: ${testUrl}`);
console.log('⏰ Timestamp:', new Date().toISOString());
console.log('---');

const startTime = Date.now();

const request = client.get(testUrl, (res) => {
    const responseTime = Date.now() - startTime;
    
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`⚡ Response Time: ${responseTime}ms`);
    console.log(`📋 Headers:`, res.headers);
    console.log('---');
    
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    
    res.on('end', () => {
        try {
            const jsonBody = JSON.parse(body);
            console.log('✅ Response Body (JSON):');
            console.log(JSON.stringify(jsonBody, null, 2));
        } catch (e) {
            console.log('📄 Response Body (Text):');
            console.log(body);
        }
        
        if (res.statusCode === 200) {
            console.log('🎉 Healthcheck PASSED');
            process.exit(0);
        } else {
            console.log('❌ Healthcheck FAILED');
            process.exit(1);
        }
    });
});

request.on('error', (error) => {
    const responseTime = Date.now() - startTime;
    console.error('💥 Request Error:', error.message);
    console.log(`⚡ Failed after: ${responseTime}ms`);
    console.log('❌ Healthcheck FAILED');
    process.exit(1);
});

request.setTimeout(10000, () => {
    console.log('⏱️ Request timed out after 10 seconds');
    console.log('❌ Healthcheck FAILED');
    request.destroy();
    process.exit(1);
}); 