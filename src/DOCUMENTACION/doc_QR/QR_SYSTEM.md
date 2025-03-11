# Sistema de Códigos QR - Documentación Técnica

Esta documentación técnica detalla la implementación del sistema de códigos QR en PetConnect.

## Estructura de Archivos 

src/
├── controllers/
│ ├── qrController.js # Controlador para operaciones de QR
│ └── orderController.js # Controlador para órdenes de compra
├── models/
│ ├── QRModel.js # Modelo de datos para QR
│ ├── OrderModel.js # Modelo para órdenes
│ └── MessageModel.js # Modelo para mensajes
├── routes/
│ ├── qrRoutes.js # Rutas para API de QR
│ ├── orderRoutes.js # Rutas para órdenes
│ └── messageRoutes.js # Rutas para mensajes
├── services/
│ ├── qrcodeService.js # Servicio de generación de QR
│ └── paymentService.js # Servicio de procesamiento de pagos
└── middlewares/
└── authMiddleware.js # Middleware de autenticación

## Flujo de Datos

1. **Generación de QR**:
   - El usuario solicita la compra de QR
   - Se crea una orden en la base de datos
   - Se procesa el pago
   - Se generan los códigos QR
   - Se asocian los QR al usuario

2. **Vinculación de QR**:
   - El usuario registra una mascota
   - El usuario vincula un QR a la mascota
   - Se actualiza el estado del QR en la base de datos

3. **Escaneo de QR**:
   - Un tercero escanea el QR
   - El sistema verifica si el QR está vinculado
   - Si está vinculado, muestra el perfil de la mascota
   - Si no está vinculado, muestra un mensaje informativo

4. **Comunicación**:
   - El tercero puede enviar un mensaje al dueño
   - El sistema almacena el mensaje
   - El dueño recibe una notificación
   - El dueño puede ver y responder al mensaje

## Implementación Técnica

### Generación de QR

```javascript
// Ejemplo de generación de QR
const QRCode = require('qrcode');
const crypto = require('crypto');

const generateQRCode = async () => {
  const qrId = crypto.randomBytes(16).toString('hex');
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const qrUrl = `${baseUrl}/qr/scan/${qrId}`;
  const qrImage = await QRCode.toDataURL(qrUrl);
  
  return { qrId, qrUrl, qrImage };
};
```

### Procesamiento de Pagos

```javascript
// Ejemplo de procesamiento de pago con Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (amount) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Stripe usa centavos
    currency: 'usd',
  });
  
  return paymentIntent;
};
```

## Consideraciones de Seguridad

1. **Autenticación**: Todas las rutas sensibles están protegidas con JWT.
2. **Validación**: Se validan todos los datos de entrada para prevenir inyecciones.
3. **Autorización**: Solo el dueño puede vincular o desactivar sus QR.
4. **Datos Sensibles**: La información de pago se procesa directamente con Stripe.

## Mejoras Futuras

1. **QR Dinámicos**: Implementar códigos QR que actualicen su contenido sin cambiar la imagen.
2. **Estadísticas**: Añadir seguimiento de escaneos para análisis.
3. **Notificaciones Push**: Alertar al dueño inmediatamente cuando su QR es escaneado.
4. **Integración con Mapas**: Mostrar la ubicación exacta donde se escaneó el QR.

---

