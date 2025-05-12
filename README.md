# 🐾 PetConnect API

Backend para la aplicación PetConnect, una plataforma para gestionar mascotas, perfiles de usuarios y códigos QR para identificación de mascotas.

## 📋 Características

- 🔐 Autenticación y autorización de usuarios
- 👤 Gestión de perfiles de usuario
- 🐕 Gestión de mascotas
- 📸 Subida y gestión de imágenes con Cloudinary
- 🏷️ Sistema de códigos QR para mascotas
- 💳 Sistema de compra y gestión de códigos QR
- 📱 Comunicación entre usuarios a través de mensajes
- 📍 Localización de mascotas perdidas
- 📧 Sistema de recuperación de contraseña
- 🔑 Autenticación con Google OAuth
- 👑 Panel de administración

## 🛠️ Tecnologías Utilizadas

- Node.js
- Express.js
- MongoDB con Mongoose
- JWT para autenticación
- Passport.js para OAuth
- Cloudinary para almacenamiento de imágenes
- Multer para manejo de archivos
- Nodemailer para envío de correos
- QRCode para generación de códigos QR
- Arquitectura en capas (Controllers, Data, Models)


## 📚 Estructura del Proyecto 
```
src/
├── config/         # Configuraciones (DB, Passport, etc.)
├── controllers/    # Controladores de la aplicación
├── data/           # Capa de acceso a datos
├── middlewares/    # Middlewares personalizados
├── models/         # Modelos de Mongoose
├── routes/         # Rutas de la API
├── services/       # Servicios (email, tokens, etc.)
├── utils/          # Utilidades
└── server.js       # Punto de entrada
```

## 🔑 Roles y Permisos

### Usuario Normal
- Gestionar su perfil
- Crear y gestionar mascotas
- Subir fotos
- Comprar y vincular códigos QR
- Recibir y responder mensajes

### Administrador
- Todas las funciones de usuario normal
- Gestionar usuarios
- Generar códigos QR
- Ver estadísticas
- Gestionar órdenes

## 📡 Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registro de usuario ✅
- `POST /api/auth/login` - Inicio de sesión ✅
- `POST /api/auth/logout` - Cerrar sesión ✅
- `GET /api/auth/google` - Autenticación con Google ✅
- `GET /api/auth/google/callback` - Callback para autenticación con Google✅
- `POST /api/auth/refresh-token` - Renovar token de acceso ✅
- `POST /api/auth/request-password-reset` - Solicitar reset de contraseña✅
- `POST /api/auth/reset-password` - Restablecer contraseña✅
- `POST /api/auth/change-password`  -Cambiar contraseña✅

### Usuarios
- `GET /api/users/profile` - Obtener perfil propio ✅
- `PUT /api/users/profile` - Actualizar perfil propio ✅
- `PUT /api/users/privacy` - Actualizar configuración de privacidad ✅
- `PUT /api/users/profile/picture` - Cambiar foto de perfil ✅
- `DELETE /api/users/profile/picture` - Eliminar foto de perfil ✅
- `DELETE /api/users/profile` - Desactivar cuenta propia ✅
- `GET /api/users/:id` - Obtener perfil de otro usuario (público) ✅

### Admin (Usuarios)
-  `POST /api/admin/register`  Crear un usuario - requiere token admin. ✅
- `GET /api/admin/users` - Listar todos los usuarios ✅
- `GET /api/admin/users/:id` - Obtener detalles de un usuario ✅
- `PUT /api/admin/users/:id` - Actualizar usuario  ✅
- `PUT /api/admin/users/:id/status` - Activar/Desactivar usuario ✅
- `PUT /api/admin/users/:id/role` - Cambiar rol de usuario ✅
- `GET /api/admin/status/users` - Estadísticas de usuarios ✅
- `GET /api/admin/pets` - Listar Todas las mascotas  ✅
-  `POST /api/admin/register`  Crear un usuario - requiere token admin. ✅

### Mascotas  Requieren token  
- `POST /api/pets` - Crear mascota ✅
- `GET /api/pets/user/pets ` - Obtener mascotas del usuario autenticado ✅
- `PUT /api/pets/:id` - Actualizar mascota  ✅
- `DELETE /api/pets/:id` - Eliminar mascota ✅
- `PUT /api/pets/:id/location` - Actualizar ubicación ✅

### Rutas para fotos de perfil mascota
- `PUT /api/pets/:id/profile-picture` - Actualizar foto de perfil mascota✅
- `DELETE /api/pets/:id/profile-picture` - Eliminar foto de perfil ✅
- `POST /api/pets/:id/photos` - Añadir fotos a mascota  ✅
- `GET /api/pets/:id/profile-picture/download` - Descargar foto de perfil ✅
- `GET /api/pets/:id/photos/download` - Descargar todas las fotos de una mascota ✅
### Rutas publicas Mascotas
- `GET /api/pets/public/:petId` - Obtener perfil público de una mascota ✅

### Códigos QR
- `POST /api/qr/generate-multiple` - Generar múltiples QRs ✅
- `POST /api/qr/user/:userId` - Generar QR para un usuario específico (admin) ✅
- `GET /api/qr/scan/:qrId` - Escanear código QR (público) ✅
- `POST /api/qr/link` - Vincular QR a mascota ✅
- `GET /api/qr/user` - Obtener QRs del usuario ✅
- `DELETE /api/qr/:qrId` - Eliminar un QR ✅
- `GET /api/qr/:qrId/history` - Ver historial de escaneos de un QR 
- `GET /api/qr/stats` - Estadísticas de QRs (admin)

### Órdenes
- `POST /api/orders` - Crear una orden de compra ✅
- `POST /api/orders/:orderId/confirm` - Confirmar pago de orden ✅
- `GET /api/orders` - Obtener órdenes del usuario ✅
- `GET /api/orders/:orderId` - Obtener detalles de una orden ✅
- `POST /api/payments/confirmation` - Webhook de ePayco para confirmación automática de pagos ✅
- `GET /api/payments/response` - Redirección después del pago en ePayco ✅
- `POST /api/orders/:orderId/cancel` - Cancelar una orden ✅
- `POST /api/admin/orders/:orderId/confirm` - Confirmar orden y generar QRs (admin) ✅
- `GET /api/orders/:orderId/invoice` - Descargar factura de una orden ❌falta
- `GET /api/orders` - Listar todas las órdenes (admin) ❌falta
- `GET /api/orders/stats` - Estadísticas de órdenes (admin) ❌falta

### Chat
- `GET /api/chat/` - Obtener todos los chats del usuario
- `GET /api/chat/:chatId/messages` - Obtener mensajes de un chat específico
- `POST /api/chat/:chatId/messages` - Enviar mensaje en un chat existente
- `POST /api/chat/pet/:petId/start` - Iniciar chat con el dueño de una mascota
- `POST /api/chat/pet/:petId/message` - Enviar mensaje al dueño de una mascota
- `POST /api/chat/finder/:finderId/pet/:petId/message` - Enviar mensaje a un usuario que encontró una mascota
- Conexión WebSocket: `ws://localhost:5000/socket.io/?EIO=4&transport=websocket`

### Notificaciones
- `GET /api/notifications` - Obtener notificaciones del usuario
- `PATCH /api/notifications/:notificationId/read` - Marcar notificación como leída
- `PATCH /api/notifications/read-all` - Marcar todas las notificaciones como leídas
- `DELETE /api/notifications/:notificationId` - Eliminar una notificación
- `GET /api/notifications/settings` - Obtener configuración de notificaciones
- `PUT /api/notifications/settings` - Actualizar configuración de notificaciones

### Reportes
- `POST /api/reports/pet/:petId` - Reportar una mascota
- `POST /api/reports/user/:userId` - Reportar un usuario
- `GET /api/reports` - Listar reportes (admin)
- `PUT /api/reports/:reportId/status` - Actualizar estado de un reporte (admin)
- `DELETE /api/reports/:reportId` - Eliminar un reporte (admin)



### Escaneo de QR y Comunicación
- `GET /api/qr/scan/:qrId` - Escanear código QR (público, mejorado con información de perfil) 
- `POST /api/messages/pet/:petId` - Enviar mensaje al dueño desde el perfil público (con o sin registro)
- `GET /api/qr/:qrId/history` - Ver historial de escaneos de un QR
- `DELETE /api/qr/:qrId`  Eliminar QR como Usuario
- `DELETE /api/qr/admin/:qrId`  Desactivar qr de un usuario con el rol de administrador- token admin 



## 💾 Límites y Restricciones

- Tamaño máximo de archivo: 5MB
- Límite de almacenamiento por usuario: 50MB
- Máximo 5 fotos por mascota
- Formatos de imagen permitidos: JPEG, PNG, GIF, WEBP
- Límite de 10 solicitudes por minuto para endpoints públicos
- Límite de 100 solicitudes por minuto para usuarios autenticados
- Máximo 20 mascotas por usuario

## 🔒 Seguridad

- Autenticación mediante JWT
- Contraseñas hasheadas con bcrypt
- Protección contra CSRF
- Validación de datos de entrada
- Límites de tasa en las solicitudes
- Sanitización de datos
- Encabezados de seguridad HTTP
- Protección contra ataques de fuerza bruta
- Bloqueo de cuentas después de múltiples intentos fallidos
- Logs de seguridad para auditoría

## 🏗️ Arquitectura del Sistema

El sistema sigue una arquitectura de tres capas:

1. **Capa de Presentación (Controllers)**: Maneja las solicitudes HTTP, valida los datos de entrada y formatea las respuestas.
2. **Capa de Lógica de Negocio (Data)**: Contiene toda la lógica de negocio y las operaciones con los datos.
3. **Capa de Datos (Models)**: Define la estructura de los datos y proporciona acceso a la base de datos.

Esta separación de responsabilidades mejora la mantenibilidad, testabilidad y escalabilidad del sistema.

## 🔄 Flujo del Sistema de QR

1. **Compra de QR**:
   - Usuario crea una orden
   - Sistema confirma el pago
   - Se generan los códigos QR

2. **Vinculación de QR**:
   - Usuario vincula QR a una mascota
   - QR queda asociado permanentemente

3. **Uso del QR**:
   - Alguien escanea el QR
   - Ve información de la mascota
   - Puede contactar al dueño





