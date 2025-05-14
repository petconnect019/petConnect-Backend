require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

// Conectar a la base de datos
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {});
    console.log('✅ Conectado a MongoDB para pruebas de rendimiento');
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error);
    process.exit(1);
  }
}

// Analizar rendimiento de consultas
async function analyzeQueries(collection, queries, iterations = 5) {
  const results = {};
  
  for (const [name, query] of Object.entries(queries)) {
    console.log(`🔍 Analizando consulta: ${name}`);
    results[name] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const result = await query();
      const duration = Date.now() - start;
      
      results[name].push({
        duration,
        resultCount: Array.isArray(result) ? result.length : 1,
        iteration: i + 1
      });
      
      console.log(`   Iteración ${i + 1}: ${duration}ms (${Array.isArray(result) ? result.length : 1} resultados)`);
    }
    
    // Calcular estadísticas
    const durations = results[name].map(r => r.duration);
    results[name].stats = {
      avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]
    };
    
    console.log(`✅ ${name}: Promedio: ${results[name].stats.avg.toFixed(2)}ms, Min: ${results[name].stats.min}ms, Max: ${results[name].stats.max}ms`);
  }
  
  // Guardar resultados
  fs.writeFileSync(`db-performance-${collection}-${Date.now()}.json`, JSON.stringify(results, null, 2));
  return results;
}

// Función principal
async function runTests() {
  try {
    await connectDB();
    
    // Obtiene todos los modelos disponibles
    const models = mongoose.models;
    console.log('📊 Modelos disponibles:', Object.keys(models));
    
    // Ejemplo para análisis de consultas de mascotas (ajusta según tus modelos)
    if (models.Pet) {
      const petQueries = {
        'findAll': () => models.Pet.find({}).lean(),
        'findWithPopulate': () => models.Pet.find({}).populate('owner').lean(),
        'findById': async () => {
          const pet = await models.Pet.findOne().lean();
          return pet ? models.Pet.findById(pet._id).lean() : null;
        },
        'findWithFilter': () => models.Pet.find({ status: 'active' }).lean(),
      };
      
      await analyzeQueries('pets', petQueries);
    }
    
    // Ejemplo para consultas de usuarios (ajusta según tus modelos)
    if (models.User) {
      const userQueries = {
        'findAll': () => models.User.find({}).lean(),
        'findWithProjection': () => models.User.find({}, { name: 1, email: 1 }).lean(),
        'findWithSort': () => models.User.find({}).sort({ createdAt: -1 }).lean(),
        'findById': async () => {
          const user = await models.User.findOne().lean();
          return user ? models.User.findById(user._id).lean() : null;
        },
      };
      
      await analyzeQueries('users', userQueries);
    }
    
    console.log('✅ Pruebas de rendimiento de la base de datos completadas');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
runTests(); 