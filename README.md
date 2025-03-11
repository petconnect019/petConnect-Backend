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

## 🚀 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/petconnect-api.git
cd petconnect-api
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
```env
# Servidor
PORT=5000
NODE_ENV=development

# Base de datos
MONGODB_URI=tu_uri_de_mongodb

# JWT
JWT_SECRET=tu_jwt_secret

# Sesión
SESSION_SECRET=tu_session_secret

# Frontend
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:5000

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Email
EMAIL_USER=tu_email
EMAIL_PASS=tu_password_de_aplicacion

# Stripe (para pagos)
STRIPE_SECRET_KEY=tu_clave_secreta_de_stripe
```

4. Inicia el servidor:
```bash
npm run dev
```

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
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/google` - Autenticación con Google
- `POST /api/auth/request-password-reset` - Solicitar reset de contraseña

### Usuarios
- `GET /api/users/profile` - Obtener perfil
- `PUT /api/users/profile` - Actualizar perfil
- `PUT /api/users/privacy` - Actualizar configuración de privacidad

### Mascotas
- `POST /api/pets` - Crear mascota
- `GET /api/pets` - Listar mascotas
- `GET /api/pets/:id` - Obtener mascota
- `PUT /api/pets/:id` - Actualizar mascota
- `DELETE /api/pets/:id` - Eliminar mascota

### Códigos QR
- `POST /api/qr/generate` - Generar código QR (admin)
- `POST /api/qr/generate-multiple` - Generar múltiples QRs (admin)
- `GET /api/qr/scan/:qrId` - Escanear código QR (público)
- `POST /api/qr/link` - Vincular QR a mascota
- `GET /api/qr/user` - Obtener QRs del usuario
- `GET /api/qr` - Obtener todos los QRs (admin)
- `DELETE /api/qr/:qrId` - Desactivar un QR

### Órdenes
- `POST /api/orders` - Crear una orden de compra
- `POST /api/orders/:orderId/confirm` - Confirmar pago de orden
- `GET /api/orders/user` - Obtener órdenes del usuario
- `GET /api/orders/:orderId` - Obtener detalles de una orden

### Mensajes
- `POST /api/messages/send` - Enviar mensaje al dueño de una mascota
- `GET /api/messages/user` - Obtener mensajes recibidos
- `PATCH /api/messages/:messageId/read` - Marcar mensaje como leído

### Rutas de Prueba
- `POST /api/test/order` - Crear orden de prueba
- `POST /api/test/pet` - Crear mascota de prueba
- `POST /api/test/qr` - Generar QR de prueba
- `POST /api/test/qr/link` - Vincular QR de prueba
- `GET /api/test/qr/:qrId` - Escanear QR de prueba

## 💾 Límites y Restricciones

- Tamaño máximo de archivo: 5MB
- Límite de almacenamiento por usuario: 50MB
- Máximo 5 fotos por mascota
- Formatos de imagen permitidos: JPEG, PNG, GIF, WEBP

## 🔒 Seguridad

- Autenticación mediante JWT
- Contraseñas hasheadas con bcrypt
- Protección contra CSRF
- Validación de datos de entrada
- Límites de tasa en las solicitudes
- Sanitización de datos

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

## 👥 Cuenta de Administrador por Defecto

Al iniciar la aplicación por primera vez, se crea automáticamente una cuenta de administrador:
- Email: admin@gmail.com
- Contraseña: pectConnect12345

**Importante**: Cambiar la contraseña después del primer inicio de sesión.

## 🧪 Pruebas

Para probar el sistema sin necesidad de configurar pagos reales, se han implementado rutas de prueba en `/api/test/` que permiten simular todo el flujo del sistema.


