# Pruebas de Rendimiento - PetConnect Backend

Este directorio contiene las pruebas de rendimiento para el backend de PetConnect utilizando Artillery.

## Estructura de Archivos

- `auth.yml`: Pruebas de autenticación y manejo de usuarios
- `db.yml`: Pruebas de operaciones con la base de datos
- `stress.yml`: Pruebas de estrés general del sistema

## Requisitos

1. Node.js instalado
2. Artillery instalado globalmente: `npm install -g artillery`
3. Servidor backend ejecutándose en `localhost:5000`
4. Base de datos MongoDB ejecutándose

## Ejecución de Pruebas

### Pruebas de Autenticación
```bash
artillery run auth.yml
```

### Pruebas de Base de Datos
```bash
artillery run db.yml
```

### Pruebas de Estrés
```bash
artillery run stress.yml
```

## Generación de Reportes

Para generar un reporte HTML de las pruebas:
```bash
artillery run --output report.json [archivo-prueba].yml
artillery report report.json
```

## Notas Importantes

- Las pruebas están configuradas para incrementar gradualmente la carga
- Cada archivo tiene diferentes niveles de intensidad
- Se recomienda ejecutar primero las pruebas más ligeras (auth.yml, db.yml) antes de las pruebas de estrés
- Los tiempos de espera (think time) están configurados para simular comportamiento real de usuarios 