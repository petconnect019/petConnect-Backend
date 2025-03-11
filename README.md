# 🐾 PetConnect API

Backend para la aplicación PetConnect, una plataforma para gestionar mascotas, perfiles de usuarios y códigos QR para identificación de mascotas.

## 📋 Características

- 🔐 Autenticación y autorización de usuarios
- 👤 Gestión de perfiles de usuario
- 🐕 Gestión de mascotas
- 📸 Subida y gestión de imágenes con Cloudinary
- 🏷️ Sistema de códigos QR para mascotas
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
├── data/          # Capa de acceso a datos
├── middlewares/   # Middlewares personalizados
├── models/        # Modelos de Mongoose
├── routes/        # Rutas de la API
├── services/      # Servicios (email, tokens, etc.)
├── utils/         # Utilidades
└── server.js      # Punto de entrada
```

## 🔑 Roles y Permisos

### Usuario Normal
- Gestionar su perfil
- Crear y gestionar mascotas
- Subir fotos
- Vincular códigos QR

### Administrador
- Todas las funciones de usuario normal
- Gestionar usuarios
- Generar códigos QR
- Ver estadísticas

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
- `POST /api/qr/generate` - Generar código QR
- `GET /api/qr/scan/:qrId` - Escanear código QR
- `POST /api/qr/link` - Vincular QR a mascota

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

## 👥 Cuenta de Administrador por Defecto

Al iniciar la aplicación por primera vez, se crea automáticamente una cuenta de administrador:
- Email: admin@gmail.com
- Contraseña: pectConnect12345

**Importante**: Cambiar la contraseña después del primer inicio de sesión.

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles.
