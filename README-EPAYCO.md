# Integración con Epayco en PetConnect

Este documento describe la integración de la pasarela de pagos Epayco en el backend de PetConnect.

## Configuración

Para utilizar la integración con Epayco, es necesario configurar las siguientes variables de entorno en el archivo `.env`:

```
EPAYCO_PUBLIC_KEY=tu_llave_publica
EPAYCO_PRIVATE_KEY=tu_llave_privada  
EPAYCO_TEST=true  # Cambiar a false en producción
EPAYCO_CUST_ID_CLIENTE=tu_id_cliente
EPAYCO_P_KEY=tu_p_key
```

## Endpoints disponibles

### Tokens para tarjetas

Permite crear un token para una tarjeta de crédito que puede ser utilizado en pagos posteriores.

- **URL**: `/api/payments/token`
- **Método**: `POST`
- **Autenticación**: No requerida
- **Cuerpo de la solicitud**:
  ```json
  {
    "card_number": "4575623182290326",
    "exp_year": "2025",
    "exp_month": "12",
    "cvc": "123"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Token creado exitosamente",
    "data": {
      "id": "token_id",
      "status": true,
      ...
    }
  }
  ```

### Clientes

Permite registrar un cliente en Epayco para pagos recurrentes.

- **URL**: `/api/payments/customers`
- **Método**: `POST`
- **Autenticación**: JWT requerido
- **Cuerpo de la solicitud**:
  ```json
  {
    "token_card": "token_id",
    "name": "Nombre",
    "last_name": "Apellido",
    "email": "correo@ejemplo.com",
    "city": "Ciudad",
    "address": "Dirección",
    "phone": "Teléfono fijo",
    "cell_phone": "Teléfono celular"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Cliente creado exitosamente",
    "data": {
      "status": true,
      "message": "Cliente creado con éxito",
      "data": {
        "customerId": "id_cliente",
        ...
      }
    }
  }
  ```

### Pagos con tarjeta

Permite realizar un pago único con tarjeta de crédito.

- **URL**: `/api/payments/charges`
- **Método**: `POST`
- **Autenticación**: JWT requerido
- **Cuerpo de la solicitud**:
  ```json
  {
    "token_card": "token_id",
    "customer_id": "id_cliente",
    "doc_type": "CC",
    "doc_number": "1234567890",
    "name": "Nombre",
    "last_name": "Apellido",
    "email": "correo@ejemplo.com",
    "city": "Ciudad",
    "address": "Dirección",
    "phone": "Teléfono fijo",
    "cell_phone": "Teléfono celular",
    "bill": "Factura-123",
    "description": "Descripción del pago",
    "value": "100000",
    "tax": "16000",
    "tax_base": "84000",
    "currency": "COP",
    "dues": "1",
    "url_response": "https://ejemplo.com/respuesta",
    "url_confirmation": "https://ejemplo.com/confirmacion"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Pago procesado exitosamente",
    "data": {
      "status": true,
      "message": "Transaccion aceptada",
      ...
    }
  }
  ```

### Pagos PSE

#### Obtener bancos disponibles

- **URL**: `/api/payments/banks`
- **Método**: `GET`
- **Autenticación**: No requerida
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Bancos obtenidos exitosamente",
    "data": [
      {
        "bankCode": "1022",
        "bankName": "Banco Union Colombiano"
      },
      ...
    ]
  }
  ```

#### Crear transacción PSE

- **URL**: `/api/payments/pse`
- **Método**: `POST`
- **Autenticación**: JWT requerido
- **Cuerpo de la solicitud**:
  ```json
  {
    "bank": "1022",
    "invoice": "Factura-123",
    "description": "Descripción del pago",
    "value": "100000",
    "tax": "16000",
    "tax_base": "84000",
    "currency": "COP",
    "type_person": "0",
    "doc_type": "CC",
    "doc_number": "1234567890",
    "name": "Nombre",
    "last_name": "Apellido",
    "email": "correo@ejemplo.com",
    "country": "CO",
    "cell_phone": "3001234567",
    "url_response": "https://ejemplo.com/respuesta",
    "url_confirmation": "https://ejemplo.com/confirmacion"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Transacción PSE creada exitosamente",
    "data": {
      "status": true,
      "success": true,
      "url": "https://secure.epayco.co/validation/v1/reference/ticketId"
    }
  }
  ```

### Pagos en efectivo

- **URL**: `/api/payments/cash`
- **Método**: `POST`
- **Autenticación**: JWT requerido
- **Cuerpo de la solicitud**:
  ```json
  {
    "type": "efecty", // efecty, baloto, gana, redservi, puntored, sured
    "invoice": "Factura-123",
    "description": "Descripción del pago",
    "value": "100000",
    "tax": "16000",
    "tax_base": "84000",
    "currency": "COP",
    "type_person": "0",
    "doc_type": "CC",
    "doc_number": "1234567890",
    "name": "Nombre",
    "last_name": "Apellido",
    "email": "correo@ejemplo.com",
    "cell_phone": "3001234567",
    "end_date": "2023-12-31",
    "url_response": "https://ejemplo.com/respuesta",
    "url_confirmation": "https://ejemplo.com/confirmacion"
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Transacción en efecty creada exitosamente",
    "data": {
      "status": true,
      "success": true,
      "data": {
        "pin": "12345678",
        ...
      }
    }
  }
  ```

### Consultar transacción

- **URL**: `/api/payments/transaction/:transaction_id`
- **Método**: `GET`
- **Autenticación**: JWT requerido
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Información de transacción obtenida exitosamente",
    "data": {
      "status": true,
      "success": true,
      "data": {
        "x_response": "Aceptada",
        "x_response_reason": "Aprobada",
        ...
      }
    }
  }
  ```

### Confirmación de pagos (Webhook)

Este endpoint recibe las notificaciones de Epayco sobre el estado de los pagos.

- **URL**: `/api/payments/confirmation`
- **Método**: `POST`
- **Autenticación**: No requerida (es llamado por Epayco)
- **Cuerpo de la solicitud**: Datos enviados por Epayco
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Confirmación recibida y procesada correctamente"
  }
  ```

## Ejemplos de integración en el frontend

### Crear un token de tarjeta y realizar un pago

```javascript
// 1. Crear token de tarjeta
const cardData = {
  card_number: '4575623182290326',
  exp_year: '2025',
  exp_month: '12',
  cvc: '123'
};

const tokenResponse = await axios.post('/api/payments/token', cardData);
const tokenId = tokenResponse.data.data.id;

// 2. Realizar pago con el token
const paymentData = {
  token_card: tokenId,
  name: 'Usuario',
  last_name: 'Ejemplo',
  email: 'usuario@ejemplo.com',
  doc_type: 'CC',
  doc_number: '1234567890',
  bill: 'FC-001',
  description: 'Compra en PetConnect',
  value: '100000',
  tax: '16000',
  tax_base: '84000',
  currency: 'COP',
  dues: '1',
  url_response: 'https://miapp.com/respuesta-pago',
  url_confirmation: 'https://api.miapp.com/api/payments/confirmation'
};

const paymentResponse = await axios.post('/api/payments/charges', paymentData, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

## Archivo de pruebas

Se ha incluido un archivo de pruebas en `src/tests/epaycoService.test.js` que puede ser utilizado para verificar la funcionalidad del servicio de Epayco. Para ejecutarlo, descomente la línea final del archivo y ejecútelo con Node.js. 