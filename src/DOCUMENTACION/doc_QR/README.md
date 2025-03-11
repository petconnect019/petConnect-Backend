# PetConnect - Sistema de Códigos QR

Este documento proporciona una guía completa sobre el sistema de códigos QR en la aplicación PetConnect, incluyendo su funcionamiento, APIs disponibles y flujo de uso.

## Índice

1. [Descripción General](#descripción-general)
2. [Componentes del Sistema](#componentes-del-sistema)
3. [APIs Disponibles](#apis-disponibles)
   - [APIs para Usuarios](#apis-para-usuarios)
   - [APIs para Administradores](#apis-para-administradores)
4. [Flujo de Compra y Uso](#flujo-de-compra-y-uso)
5. [Pruebas con Postman](#pruebas-con-postman)
6. [Configuración del Entorno](#configuración-del-entorno)
7. [Solución de Problemas](#solución-de-problemas)

## Descripción General

El sistema de códigos QR de PetConnect permite a los usuarios:
- Comprar códigos QR para sus mascotas
- Vincular los códigos QR a perfiles de mascotas
- Facilitar la identificación y recuperación de mascotas perdidas
- Permitir la comunicación entre quien encuentra una mascota y su dueño

## Componentes del Sistema

El sistema está compuesto por:

1. **Modelo de QR**: Estructura de datos para almacenar información de códigos QR
2. **Controlador de QR**: Lógica para manejar operaciones relacionadas con QR
3. **Servicio de QR**: Generación de imágenes de códigos QR
4. **Modelo de Orden**: Gestión de compras de códigos QR
5. **Sistema de Mensajería**: Comunicación entre usuarios

## APIs Disponibles

### APIs para Usuarios

#### 1. Generar un Código QR
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/qr/generate`
- **Respuesta**: Código QR generado con ID único e imagen

#### 2. Escanear un Código QR
- **Método**: `GET`
- **URL**: `http://localhost:5000/api/qr/scan/{qrId}`
- **Respuesta**: Información del QR y mascota vinculada (si existe)

#### 3. Vincular un Código QR a una Mascota
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/qr/link`
- **Cuerpo**: `{ "qrId": "abc123", "petId": "petId123" }`
- **Respuesta**: Confirmación de vinculación

#### 4. Obtener los Códigos QR del Usuario
- **Método**: `GET`
- **URL**: `http://localhost:5000/api/qr/user`
- **Respuesta**: Lista de códigos QR del usuario

#### 5. Desactivar un Código QR
- **Método**: `DELETE`
- **URL**: `http://localhost:5000/api/qr/{qrId}`
- **Respuesta**: Confirmación de desactivación

### APIs para Administradores

#### 1. Generar Múltiples Códigos QR
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/qr/generate-multiple`
- **Cuerpo**: `{ "count": 5 }`
- **Respuesta**: Confirmación de generación

#### 2. Obtener Todos los Códigos QR
- **Método**: `GET`
- **URL**: `http://localhost:5000/api/qr`
- **Respuesta**: Lista de todos los códigos QR

#### 3. Eliminar un Código QR
- **Método**: `DELETE`
- **URL**: `http://localhost:5000/api/qr/{qrId}`
- **Respuesta**: Confirmación de eliminación

## Flujo de Compra y Uso

### 1. Registro e Inicio de Sesión
- Registro de usuario
- Inicio de sesión para obtener token de autenticación

### 2. Compra de Códigos QR
- Crear orden de compra
- Procesar pago
- Confirmar pago
- Recibir códigos QR generados

### 3. Vinculación con Mascotas
- Registrar mascota
- Vincular código QR a mascota

### 4. Uso del Sistema
- Escaneo de QR por terceros
- Visualización de perfil público de mascota
- Envío de mensajes al dueño
- Recepción y gestión de mensajes

## Pruebas con Postman

### Paso 1: Registro de Usuario
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/auth/register`
- **Cuerpo**:
```json
{
  "name": "Usuario Prueba",
  "email": "usuario@ejemplo.com",
  "password": "Contraseña123"
}
```

### Paso 2: Inicio de Sesión
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/auth/login`
- **Cuerpo**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Contraseña123"
}
```
- **Guardar el token recibido**

### Paso 3: Crear Orden de Compra
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/orders`
- **Headers**: `Authorization: Bearer {token}`
- **Cuerpo**:
```json
{
  "quantity": 1,
  "shippingDetails": {
    "address": "Calle Principal 123",
    "city": "Ciudad Ejemplo",
    "state": "Estado Ejemplo",
    "zipCode": "12345",
    "country": "País Ejemplo"
  }
}
```

### Paso 4: Confirmar Pago
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/orders/{orderId}/confirm`
- **Headers**: `Authorization: Bearer {token}`

### Paso 5: Obtener QRs Generados
- **Método**: `GET`
- **URL**: `http://localhost:5000/api/qr/user`
- **Headers**: `Authorization: Bearer {token}`

### Paso 6: Registrar Mascota
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/pets`
- **Headers**: `Authorization: Bearer {token}`
- **Cuerpo**:
```json
{
  "name": "Firulais",
  "species": "Perro",
  "breed": "Labrador",
  "age": 3,
  "color": "Dorado",
  "weight": 25,
  "description": "Perro muy amigable y juguetón",
  "medicalInfo": "Vacunas al día, castrado"
}
```

### Paso 7: Vincular QR a Mascota
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/qr/link`
- **Headers**: `Authorization: Bearer {token}`
- **Cuerpo**:
```json
{
  "qrId": "{qrId}",
  "petId": "{petId}"
}
```

### Paso 8: Simular Escaneo de QR
- **Método**: `GET`
- **URL**: `http://localhost:5000/api/qr/scan/{qrId}`

### Paso 9: Enviar Mensaje al Dueño
- **Método**: `POST`
- **URL**: `http://localhost:5000/api/messages/send`
- **Cuerpo**:
```json
{
  "petId": "{petId}",
  "subject": "Encontré a tu mascota",
  "content": "Hola, encontré a tu perro Firulais en el parque.",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "contactInfo": "contacto@ejemplo.com"
}
```

### Paso 10: Ver Mensajes Recibidos
- **Método**: `GET`
- **URL**: `http://localhost:5000/api/messages/user`
- **Headers**: `Authorization: Bearer {token}`

### Paso 11: Marcar Mensaje como Leído
- **Método**: `PATCH`
- **URL**: `http://localhost:5000/api/messages/{messageId}/read`
- **Headers**: `Authorization: Bearer {token}`

## Configuración del Entorno

### Requisitos
- Node.js v14 o superior
- MongoDB
- Stripe (para procesamiento de pagos)

### Variables de Entorno
Crear archivo `.env` con: 