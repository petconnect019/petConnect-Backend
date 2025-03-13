# Sistema de Chat en Tiempo Real con WebSocket para PetConnect

Este documento describe la implementación del sistema de chat en tiempo real utilizando WebSocket para la aplicación PetConnect. Este sistema permite la comunicación entre usuarios que encuentran mascotas y sus dueños.

## Requisitos

- El usuario que encuentra una mascota debe registrarse para poder comunicarse con el dueño.
- La comunicación debe ser en tiempo real.
- El sistema debe permitir el envío de mensajes, ubicación y notificaciones.

## Tecnologías Utilizadas

- Socket.io: Para la comunicación en tiempo real.
- JWT: Para la autenticación de usuarios en WebSocket.
- Express: Para las rutas HTTP.

## Instalación

Asegúrate de tener instaladas las dependencias necesarias:

```powerShell
npm install socket.io jsonwebtoken
```

## Arquitectura del Sistema

El sistema de chat se compone de los siguientes elementos:

1. **Servicio de Socket.io (`src/services/socketService.js`)**: Maneja la conexión WebSocket, autenticación y eventos de mensajería.
2. **Capa de Datos (`src/data/chatData.js`)**: Proporciona funciones para iniciar chats y enviar mensajes.
3. **Controlador (`src/controllers/chatController.js`)**: Maneja las solicitudes HTTP relacionadas con el chat.
4. **Rutas (`src/routes/chatRoutes.js`)**: Define los endpoints de la API para el chat.

## Flujo de Comunicación

### 1. Conexión al WebSocket

El cliente debe conectarse al WebSocket proporcionando un token JWT válido:

```javascript
// Cliente (ejemplo con Socket.io-client)
const socket = io('http://localhost:5000', {
  auth: {
    token: 'token-del-usuario'
  }
});

// Manejar errores de conexión
socket.on('connect_error', (error) => {
  console.error('Error de conexión:', error.message);
});
```

### 2. Iniciar Chat con el Dueño de una Mascota

Para iniciar un chat con el dueño de una mascota, el usuario debe hacer una solicitud HTTP:

```http
POST /api/chat/pet/:petId/start
Authorization: Bearer token-del-usuario
```

Respuesta:

```json
{
  "success": true,
  "chat": {
    "petId": "id-de-la-mascota",
    "petName": "Nombre de la mascota",
    "petOwner": {
      "id": "id-del-dueño",
      "name": "Nombre del dueño",
      "email": "email@ejemplo.com",
      "profilePicture": "url-de-la-foto"
    },
    "initiator": {
      "id": "id-del-usuario",
      "name": "Nombre del usuario",
      "email": "usuario@ejemplo.com",
      "profilePicture": "url-de-la-foto"
    },
    "startedAt": "2023-06-15T12:00:00.000Z"
  }
}
```

El dueño de la mascota recibirá una notificación a través de WebSocket:

```javascript
// En el cliente del dueño
socket.on('chat_request', (data) => {
  console.log('Nueva solicitud de chat:', data);
  // data contiene información sobre la mascota y el usuario que inició el chat
});
```

### 3. Enviar Mensaje al Dueño de una Mascota

Para enviar un mensaje al dueño de una mascota:

```http
POST /api/chat/pet/:petId/message
Authorization: Bearer jwt-token-del-usuario
Content-Type: application/json

{
  "content": "Hola, encontré a tu mascota",
  "location": {
    "latitude": 4.710989,
    "longitude": -74.072092,
    "address": "Bogotá, Colombia"
  }
}
```

Respuesta:

```json
{
  "success": true,
  "message": {
    "petId": "id-de-la-mascota",
    "senderId": "id-del-usuario",
    "senderName": "Nombre del usuario",
    "senderEmail": "usuario@ejemplo.com",
    "senderProfilePicture": "url-de-la-foto",
    "receiverId": "id-del-dueño",
    "content": "Hola, encontré a tu mascota",
    "location": {
      "latitude": 4.710989,
      "longitude": -74.072092,
      "address": "Bogotá, Colombia"
    },
    "timestamp": "2023-06-15T12:05:00.000Z"
  }
}
```

El dueño de la mascota recibirá el mensaje a través de WebSocket:

```javascript
// En el cliente del dueño
socket.on('pet_message', (data) => {
  console.log('Nuevo mensaje sobre mascota:', data);
  // data contiene el mensaje y la información del remitente
});
```

### 4. Enviar Mensaje al Usuario que Encontró una Mascota

Para que el dueño envíe un mensaje al usuario que encontró su mascota:

```http
POST /api/chat/finder/:finderId/pet/:petId/message
Authorization: Bearer jwt-token-del-dueño
Content-Type: application/json

{
  "content": "Gracias por encontrar a mi mascota. ¿Dónde puedo recogerla?"
}
```

Respuesta:

```json
{
  "success": true,
  "message": {
    "petId": "id-de-la-mascota",
    "senderId": "id-del-dueño",
    "senderName": "Nombre del dueño",
    "senderEmail": "email@ejemplo.com",
    "senderProfilePicture": "url-de-la-foto",
    "receiverId": "id-del-usuario",
    "content": "Gracias por encontrar a mi mascota. ¿Dónde puedo recogerla?",
    "timestamp": "2023-06-15T12:10:00.000Z"
  }
}
```

El usuario que encontró la mascota recibirá el mensaje a través de WebSocket:

```javascript
// En el cliente del usuario
socket.on('owner_message', (data) => {
  console.log('Mensaje del dueño:', data);
  // data contiene el mensaje y la información del dueño
});
```

### 5. Comunicación Directa a través de WebSocket

Los usuarios también pueden comunicarse directamente a través de WebSocket una vez que se ha establecido el chat:

```javascript
// Enviar mensaje directo
socket.emit('send_direct_message', {
  receiverId: 'id-del-receptor',
  content: 'Hola, ¿cómo estás?'
});

// Recibir mensaje directo
socket.on('direct_message', (data) => {
  console.log('Mensaje recibido:', data);
});

// Confirmación de envío
socket.on('message_sent', (data) => {
  console.log('Mensaje enviado:', data);
});

// Notificación de usuario offline
socket.on('user_offline', (data) => {
  console.log('Usuario no conectado:', data);
});
```

## Seguridad

- Todos los mensajes requieren autenticación mediante JWT.
- El usuario que encuentra una mascota debe registrarse para poder comunicarse con el dueño.
- Las rutas HTTP están protegidas mediante middleware de autenticación.
- La conexión WebSocket también requiere autenticación mediante token JWT.

## Limitaciones y Consideraciones

- Los mensajes no se almacenan en la base de datos, por lo que se perderán si el usuario se desconecta.
- No hay sistema de notificaciones push para usuarios que no están conectados.
- La ubicación es opcional y debe ser proporcionada por el cliente.

## Ejemplos de Uso con Postman

### Iniciar Chat con el Dueño de una Mascota

```
POST http://localhost:5000/api/chat/pet/60d21b4667d0d8992e610c85/start
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Enviar Mensaje al Dueño de una Mascota

```
POST http://localhost:5000/api/chat/pet/60d21b4667d0d8992e610c85/message
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body:
  {
    "content": "Hola, encontré a tu mascota en el parque",
    "location": {
      "latitude": 4.710989,
      "longitude": -74.072092,
      "address": "Parque Central, Bogotá"
    }
  }
```

### Enviar Mensaje al Usuario que Encontró una Mascota

```
POST http://localhost:5000/api/chat/finder/60d21b4667d0d8992e610c86/pet/60d21b4667d0d8992e610c85/message
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Body:
  {
    "content": "Gracias por encontrar a mi mascota. Voy en camino."
  }
```

## Pruebas

Para probar el sistema de chat, puedes utilizar la herramienta de línea de comandos `wscat`:

```bash
# Instalar wscat
npm install -g wscat

# Conectar al WebSocket (reemplaza el token)
wscat -c "ws://localhost:5000/socket.io/?EIO=4&transport=websocket" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

También puedes utilizar herramientas como Socket.io Client Tool o crear una aplicación de prueba simple con HTML y JavaScript. 