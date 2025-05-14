const mongoose = require('mongoose');
const fs = require('fs');
const os = require('os');

// Monitor de rendimiento para MongoDB y Node.js
class PerformanceMonitor {
  constructor() {
    this.stats = {
      startTime: Date.now(),
      requests: 0,
      mongoQueries: 0,
      errors: 0,
      memoryUsage: [],
      cpuUsage: [],
      responseTimeTotal: 0
    };
    
    this.interval = null;
    this.logFile = `performance-log-${new Date().toISOString()}.json`;
  }

  // Iniciar monitoreo
  start() {
    console.log('⚡ Iniciando monitor de rendimiento...');
    
    // Interceptar queries de Mongoose
    mongoose.set('debug', (collectionName, method, query, doc) => {
      this.stats.mongoQueries++;
    });
    
    // Capturar métricas cada 5 segundos
    this.interval = setInterval(() => {
      this.captureMetrics();
    }, 5000);
    
    return this;
  }
  
  // Middleware para Express que registra tiempos de respuesta
  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      this.stats.requests++;
      
      // Función para capturar al final de la respuesta
      const end = res.end;
      res.end = (...args) => {
        const responseTime = Date.now() - start;
        this.stats.responseTimeTotal += responseTime;
        
        if (res.statusCode >= 400) {
          this.stats.errors++;
        }
        
        // Restaurar la función original y ejecutarla
        res.end = end;
        return res.end(...args);
      };
      
      next();
    };
  }
  
  // Capturar métricas del sistema
  captureMetrics() {
    const memoryUsage = process.memoryUsage();
    
    this.stats.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
    });
    
    // Capturar carga de CPU
    this.stats.cpuUsage.push({
      timestamp: Date.now(),
      load: os.loadavg()[0] // Promedio de carga de 1 minuto
    });
    
    // Si hay muchas entradas, guardar un resumen y limpiar
    if (this.stats.memoryUsage.length > 100) {
      this.saveSnapshot();
      
      // Mantener solo las últimas 10 métricas
      this.stats.memoryUsage = this.stats.memoryUsage.slice(-10);
      this.stats.cpuUsage = this.stats.cpuUsage.slice(-10);
    }
  }
  
  // Guardar snapshot de las métricas
  saveSnapshot() {
    const summary = {
      duration: Math.round((Date.now() - this.stats.startTime) / 1000), // segundos
      requests: this.stats.requests,
      requestsPerSecond: this.stats.requests / (Date.now() - this.stats.startTime) * 1000,
      averageResponseTime: this.stats.responseTimeTotal / this.stats.requests,
      errors: this.stats.errors,
      errorRate: this.stats.errors / this.stats.requests,
      mongoQueries: this.stats.mongoQueries,
      queriesPerRequest: this.stats.mongoQueries / this.stats.requests,
      memoryUsage: this.stats.memoryUsage.slice(-10),
      cpuUsage: this.stats.cpuUsage.slice(-10),
      timestamp: new Date().toISOString()
    };
    
    fs.appendFileSync(this.logFile, JSON.stringify(summary) + ',\n');
    console.log(`💾 Snapshot guardado: ${summary.requests} peticiones, ${summary.averageResponseTime.toFixed(2)}ms tiempo respuesta`);
  }
  
  // Detener monitoreo y generar reporte
  stop() {
    clearInterval(this.interval);
    this.saveSnapshot();
    
    const totalDuration = (Date.now() - this.stats.startTime) / 1000; // segundos
    const averageResponseTime = this.stats.responseTimeTotal / this.stats.requests;
    
    const finalReport = {
      totalRequests: this.stats.requests,
      totalDuration: totalDuration,
      requestsPerSecond: this.stats.requests / totalDuration,
      averageResponseTime: averageResponseTime,
      totalErrors: this.stats.errors,
      errorRate: this.stats.errors / this.stats.requests,
      totalMongoQueries: this.stats.mongoQueries,
      queriesPerRequest: this.stats.mongoQueries / this.stats.requests
    };
    
    console.log('📊 Reporte de rendimiento:', finalReport);
    return finalReport;
  }
}

module.exports = new PerformanceMonitor(); 