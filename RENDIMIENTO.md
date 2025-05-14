# Guía de Pruebas de Rendimiento de PetConnect

Este documento describe cómo realizar pruebas de rendimiento en la aplicación PetConnect backend.

## Herramientas disponibles

Hemos configurado varias herramientas para el análisis de rendimiento:

1. **Pruebas de carga con Artillery**: Simula tráfico de usuarios concurrentes
2. **Monitor de rendimiento interno**: Analiza el rendimiento de la aplicación en tiempo real
3. **Pruebas específicas de base de datos**: Analiza el rendimiento de las consultas MongoDB

## Requisitos previos

Instalar Artillery:

```bash
npm install -g artillery
```

## Ejecutando pruebas de carga

1. Inicia el servidor con monitoreo de rendimiento:

```bash
node src/server-performance.js
```

2. En otra terminal, ejecuta Artillery con el archivo de configuración:

```bash
artillery run prueba.yml
```

3. Puedes ver las estadísticas de rendimiento en tiempo real visitando:

```
http://localhost:5000/api/performance
```

## Pruebas de rendimiento de la base de datos

Para probar específicamente el rendimiento de las consultas a la base de datos:

```bash
node scripts/db-performance.js
```

Este script:
- Ejecuta varias consultas comunes contra tus colecciones de MongoDB
- Mide el tiempo de respuesta promedio, mínimo y máximo
- Guarda los resultados en archivos JSON para análisis posterior

## Áreas para optimización

Al analizar los resultados, busca:

1. **Tiempos de respuesta altos**: Identifica las rutas o consultas más lentas
2. **Uso excesivo de memoria**: Revisa si hay fugas de memoria
3. **Problemas de escalabilidad**: Verifica si el rendimiento se degrada bajo carga
4. **Consultas lentas de MongoDB**: Optimiza índices o estructura de datos

## Consejos para optimización

- **Índices MongoDB**: Asegura que todas las consultas frecuentes usen índices
- **Paginación**: Implementa límites en las consultas que devuelven muchos resultados
- **Caché**: Considera implementar caché para datos que no cambian frecuentemente
- **Optimización de consultas**: Usa proyecciones para limitar campos devueltos

## Ejemplo de interpretación

Después de ejecutar las pruebas, obtendrás resultados similares a:

```
✅ findAll: Promedio: 150.45ms, Min: 120ms, Max: 200ms
```

Si el tiempo promedio es alto (más de 100ms), considera:
- Agregar índices a los campos de búsqueda
- Reducir la cantidad de datos devueltos
- Implementar caché para consultas frecuentes

## Métricas importantes a observar

1. **Tiempo de respuesta promedio**: Debe ser <100ms para una buena experiencia de usuario
2. **Tasas de error**: Deben ser <1% bajo carga
3. **Uso de memoria**: Debe estabilizarse y no crecer continuamente
4. **Consultas por segundo**: Determina cuántas peticiones puede manejar tu servidor

## Notas adicionales

- Ejecuta las pruebas en un entorno similar a producción para obtener resultados realistas
- Considera probar casos específicos de tu aplicación, como la carga de perfiles o búsqueda de mascotas
- Optimiza primero las rutas más utilizadas por los usuarios 