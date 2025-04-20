# Guía de Integración con Epayco en PetConnect

Esta guía explica cómo utilizar la integración de Epayco implementada en el backend de PetConnect.

## Configuración Inicial

Las credenciales de Epayco ya están configuradas en el archivo `.env`:

```
EPAYCO_PUBLIC_KEY=88514596a45049fd99a663cdcdcf8d86
EPAYCO_PRIVATE_KEY=df1e64c762ffc2c27a7b7b923f2a59a8
EPAYCO_TEST=true
EPAYCO_CUST_ID_CLIENTE=1548409
EPAYCO_P_KEY=6850a91eeda8228371624771366c7c5fc7f14e0a
```

## Pruebas Básicas

Hemos creado un script de prueba para verificar la integración:

```bash
node src/epaycoTest.js
```

Este script prueba las funcionalidades básicas:
- Obtener listado de bancos PSE
- Crear un token de tarjeta de crédito

## Endpoints Disponibles

La API expone los siguientes endpoints para interactuar con Epayco:

### 1. Crear Token de Tarjeta

```
POST /api/payments/token
```

Ejemplo de solicitud:
```json
{
  "card_number": "4575623182290326",
  "exp_year": "2025",
  "exp_month": "12",
  "cvc": "123"
}
```

### 2. Registrar Cliente

```
POST /api/payments/customers
```

Ejemplo de solicitud:
```json
{
  "token_card": "token_id_generado",
  "name": "Nombre",
  "last_name": "Apellido",
  "email": "correo@ejemplo.com",
  "city": "Ciudad",
  "address": "Dirección",
  "phone": "Teléfono",
  "cell_phone": "Celular"
}
```

### 3. Realizar Pago con Tarjeta

```
POST /api/payments/charges
```

Ejemplo de solicitud:
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
  "phone": "Teléfono",
  "cell_phone": "Celular",
  "bill": "Factura-123",
  "description": "Descripción del pago",
  "value": "100000",
  "tax": "16000",
  "tax_base": "84000",
  "currency": "COP",
  "dues": "1"
}
```

### 4. Listar Bancos PSE

```
GET /api/payments/banks
```

### 5. Realizar Pago PSE

```
POST /api/payments/pse
```

Ejemplo de solicitud:
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
  "cell_phone": "3001234567"
}
```

### 6. Realizar Pago en Efectivo

```
POST /api/payments/cash
```

Ejemplo de solicitud:
```json
{
  "type": "efecty",
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
  "end_date": "2023-12-31"
}
```

El parámetro `type` puede ser: efecty, baloto, gana, redservi, puntored, sured.

### 7. Consultar Estado de Transacción

```
GET /api/payments/transaction/:transaction_id
```

## Recepción de Confirmaciones de Pago

Epayco enviará notificaciones de confirmación de pago a:

```
POST /api/payments/confirmation
```

## Implementación en el Frontend

Ejemplo básico de cómo implementar un pago con tarjeta en el frontend:

```javascript
// 1. Crear token de tarjeta
async function createToken() {
  const cardData = {
    card_number: '4575623182290326',
    exp_year: '2025',
    exp_month: '12',
    cvc: '123'
  };

  const response = await fetch('/api/payments/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cardData)
  });
  
  const result = await response.json();
  return result.data.id; // ID del token
}

// 2. Realizar pago con el token
async function makePayment(tokenId) {
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
    dues: '1'
  };

  const response = await fetch('/api/payments/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(paymentData)
  });
  
  return await response.json();
}

// Ejecutar el proceso completo
async function processPayment() {
  try {
    const tokenId = await createToken();
    const paymentResult = await makePayment(tokenId);
    console.log('Resultado del pago:', paymentResult);
  } catch (error) {
    console.error('Error al procesar el pago:', error);
  }
}
```

## Soporte

Para más información, consultar la documentación oficial de Epayco:
https://docs.epayco.co/ 