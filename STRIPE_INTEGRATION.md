# Integración con Stripe en PetConnect

Este documento describe la integración de Stripe para procesar pagos en PetConnect.

## Arquitectura

La integración con Stripe sigue una arquitectura de tres capas:

1. **Controlador (`orderController.js`)**: Maneja las peticiones HTTP, valida los datos de entrada y devuelve respuestas.
2. **Capa de datos (`orderData.js`)**: Implementa la lógica de negocio y maneja la persistencia de datos.
3. **Servicio de Stripe (`stripeService.js`)**: Encapsula toda la interacción con la API de Stripe.

## Flujo de pago

### 1. Creación de orden y Payment Intent

1. El cliente envía información de la orden (cantidad, datos de envío, información del cliente)
2. El controlador valida los datos
3. La capa de datos:
   - Calcula el monto total
   - Crea un Payment Intent en Stripe
   - Crea la orden en la base de datos
   - Actualiza los metadatos del Payment Intent con el ID de la orden
4. Se devuelve el `clientSecret` al frontend para inicializar Stripe Elements

### 2. Procesamiento del pago en el frontend

1. El frontend inicializa Stripe Elements con el `clientSecret`
2. El usuario introduce los datos de la tarjeta
3. Se confirma el pago con Stripe
4. Se notifica al backend que el pago se ha completado

### 3. Confirmación del pago

1. El backend verifica el estado del pago en Stripe
2. Si el pago es exitoso:
   - Se actualiza el estado de la orden a "completed"
   - Se generan los códigos QR asociados a la orden
3. Se devuelve la información de la orden y los códigos QR al frontend

## Manejo de errores

La integración incluye un manejo robusto de errores:

- **Errores de validación**: Se verifican los datos de entrada antes de procesarlos
- **Errores de Stripe**: Se capturan y clasifican los errores de la API de Stripe
- **Errores de base de datos**: Se utilizan transacciones para garantizar la integridad de los datos

## Seguridad

- El parametro `forceConfirm` está restringido a entornos de desarrollo
- Se valida que el usuario tenga permisos para acceder a las or-denes
- Se utilizan tokens JWT para autenticar las peticiones

## Webhooks de Stripe

Los webhooks de Stripe permiten recibir notificaciones sobre eventos como pagos exitosos o fallidos:

1. Stripe envía un evento al endpoint configurado
2. El servicio de Stripe procesa el evento según su tipo
3. Se actualiza el estado de la orden en la base de datos

## Pruebas

Para probar la integración, se pueden utilizar las tarjetas de prueba de Stripe:

| Número de tarjeta | Descripción |
| 4242 4242 4242 4242 | Pago exitoso |
| 4000 0000 0000 0002 | Pago rechazado |
| 4000 0000 0000 9995 | Fondos insuficientes |

## Frontend

El frontend debe implementar:

1. Un formulario para recoger la información del cliente
2. Stripe Elements para capturar los datos de la tarjeta de forma segura
3. Lógica para confirmar el pago y mostrar el resultado

## Configuración

Variables de entorno necesarias:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Mejores prácticas

1. **Transacciones**: Utilizar transacciones para operaciones que afectan a múltiples documentos
2. **Manejo de errores**: Proporcionar mensajes de error claros y específicos
3. **Validación**: Validar todos los datos de entrada antes de procesarlos
4. **Seguridad**: No exponer claves secretas en el frontend
5. **Logging**: Registrar información relevante para depuración

## Recursos

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Elements](https://stripe.com/docs/payments/elements)
- [Webhooks de Stripe](https://stripe.com/docs/webhooks) 