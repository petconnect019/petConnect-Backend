const express = require('express');
const router = express.Router();
// Evitamos importar el controlador para evitar problemas de undefined
const epaycoService = require('../services/epaycoService');
const { verifyToken: authenticateJWT } = require('../middlewares/authMiddleware');

// Rutas relacionadas con tokens para tarjetas
router.post('/token', (req, res) => {
  try {
    const cardInfo = {
      "card[number]": req.body.card_number,
      "card[exp_year]": req.body.exp_year,
      "card[exp_month]": req.body.exp_month,
      "card[cvc]": req.body.cvc,
      "hasCvv": true
    };

    epaycoService.createToken(cardInfo)
      .then(response => {
        if (response.status) {
          return res.status(200).json({
            success: true,
            message: 'Token creado exitosamente',
            data: response
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Error al crear token',
            error: response
          });
        }
      })
      .catch(error => {
        return res.status(500).json({
          success: false,
          message: 'Error al procesar la solicitud',
          error: error.message
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});

// Rutas relacionadas con clientes de Epayco
router.post('/customers', authenticateJWT, (req, res) => {
  try {
    const { token_card, name, last_name, email, city, address, phone, cell_phone } = req.body;
    
    const customerInfo = {
      token_card,
      name,
      last_name,
      email,
      default: true,
      city,
      address,
      phone,
      cell_phone
    };

    epaycoService.createCustomer(customerInfo)
      .then(response => {
        if (response.status) {
          return res.status(200).json({
            success: true,
            message: 'Cliente creado exitosamente',
            data: response
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Error al crear cliente',
            error: response
          });
        }
      })
      .catch(error => {
        return res.status(500).json({
          success: false,
          message: 'Error al procesar la solicitud',
          error: error.message
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});

// Rutas relacionadas con pagos con tarjeta
router.post('/charges', authenticateJWT, (req, res) => {
  try {
    const {
      token_card,
      customer_id,
      doc_type,
      doc_number,
      name,
      last_name,
      email,
      city,
      address,
      phone,
      cell_phone,
      bill,
      description,
      value,
      tax,
      tax_base,
      currency,
      dues,
      ip,
      url_response,
      url_confirmation,
      use_default_card_customer,
    } = req.body;

    const extras = req.body.extras || {};

    const paymentInfo = {
      token_card,
      customer_id,
      doc_type,
      doc_number,
      name,
      last_name,
      email,
      city,
      address,
      phone,
      cell_phone,
      bill,
      description,
      value,
      tax,
      tax_base,
      currency,
      dues,
      ip: ip || req.ip,
      url_response,
      url_confirmation,
      method_confirmation: 'POST',
      use_default_card_customer,
      extras
    };

    epaycoService.createCharge(paymentInfo)
      .then(response => {
        if (response.status) {
          return res.status(200).json({
            success: true,
            message: 'Pago procesado exitosamente',
            data: response
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Error al procesar el pago',
            error: response
          });
        }
      })
      .catch(error => {
        return res.status(500).json({
          success: false,
          message: 'Error al procesar la solicitud',
          error: error.message
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});

// Rutas relacionadas con PSE
router.get('/banks', (req, res) => {
  try {
    epaycoService.getBanks()
      .then(response => {
        if (response.status) {
          return res.status(200).json({
            success: true,
            message: 'Bancos obtenidos exitosamente',
            data: response.data
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Error al obtener bancos',
            error: response
          });
        }
      })
      .catch(error => {
        return res.status(500).json({
          success: false,
          message: 'Error al procesar la solicitud',
          error: error.message
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});

// PSE transaction
router.post('/pse', authenticateJWT, (req, res) => {
  try {
    const {
      bank,
      invoice,
      description,
      value,
      tax,
      tax_base,
      currency,
      type_person,
      doc_type,
      doc_number,
      name,
      last_name,
      email,
      country,
      cell_phone,
      ip,
      url_response,
      url_confirmation
    } = req.body;

    const extraParams = {};

    // Añadir extras si existen
    for (let i = 1; i <= 6; i++) {
      const extraKey = `extra${i}`;
      if (req.body[extraKey]) {
        extraParams[extraKey] = req.body[extraKey];
      }
    }

    const pseInfo = {
      bank,
      invoice,
      description,
      value,
      tax,
      tax_base,
      currency,
      type_person,
      doc_type,
      doc_number,
      name,
      last_name,
      email,
      country,
      cell_phone,
      ip: ip || req.ip,
      url_response,
      url_confirmation,
      metodoconfirmacion: 'POST',
      ...extraParams
    };

    epaycoService.createPseTransaction(pseInfo)
      .then(response => {
        if (response.status) {
          return res.status(200).json({
            success: true,
            message: 'Transacción PSE creada exitosamente',
            data: response
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Error al crear transacción PSE',
            error: response
          });
        }
      })
      .catch(error => {
        return res.status(500).json({
          success: false,
          message: 'Error al procesar la solicitud',
          error: error.message
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});

// Rutas relacionadas con pagos en efectivo
router.post('/cash', authenticateJWT, (req, res) => {
  try {
    const {
      type, // tipo de medio de pago (efecty, baloto, gana, etc)
      invoice,
      description,
      value,
      tax,
      tax_base,
      currency,
      type_person,
      doc_type,
      doc_number,
      name,
      last_name,
      email,
      cell_phone,
      end_date,
      ip,
      url_response,
      url_confirmation
    } = req.body;

    const extraParams = {};

    // Añadir extras si existen
    for (let i = 1; i <= 6; i++) {
      const extraKey = `extra${i}`;
      if (req.body[extraKey]) {
        extraParams[extraKey] = req.body[extraKey];
      }
    }

    const cashInfo = {
      invoice,
      description,
      value,
      tax,
      tax_base,
      currency,
      type_person,
      doc_type,
      doc_number,
      name,
      last_name,
      email,
      cell_phone,
      end_date,
      ip: ip || req.ip,
      url_response,
      url_confirmation,
      metodoconfirmacion: 'POST',
      ...extraParams
    };

    epaycoService.createCashTransaction(type, cashInfo)
      .then(response => {
        if (response.status) {
          return res.status(200).json({
            success: true,
            message: `Transacción en ${type} creada exitosamente`,
            data: response
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `Error al crear transacción en ${type}`,
            error: response
          });
        }
      })
      .catch(error => {
        return res.status(500).json({
          success: false,
          message: 'Error al procesar la solicitud',
          error: error.message
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});

// Consultar información de una transacción
router.get('/transaction/:transaction_id', authenticateJWT, (req, res) => {
  try {
    const { transaction_id } = req.params;
    
    // Intentar obtener información como transacción de tarjeta
    epaycoService.epayco.charge.get(transaction_id)
      .then(response => {
        if (response.success) {
          return res.status(200).json({
            success: true,
            message: 'Información de transacción obtenida exitosamente',
            data: response.data
          });
        } else {
          // Si no es transacción de tarjeta, intentar como transacción en efectivo
          return epaycoService.epayco.cash.get(transaction_id);
        }
      })
      .then(response => {
        if (response && response.success) {
          return res.status(200).json({
            success: true,
            message: 'Información de transacción obtenida exitosamente',
            data: response.data
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Error al obtener información de la transacción',
            error: response
          });
        }
      })
      .catch(error => {
        return res.status(500).json({
          success: false,
          message: 'Error al procesar la solicitud',
          error: error.message
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});

// Confirmación de pagos (webhook de Epayco)
router.post('/confirmation', async (req, res) => {
  try {
    // Datos recibidos de Epayco
    const paymentData = req.body;
    console.log('Confirmación de pago recibida:', JSON.stringify(paymentData));

    // Extraer los datos relevantes enviados por Epayco
    const { x_response, x_transaction_id, x_type_payment, x_id_invoice } = paymentData;

    // Importar el modelo de Orden y el paquete para generar códigos QR
    const Order = require('../models/OrderModel');
    const QRCode = require('qrcode');

    // Buscar la orden usando el identificador recibido
    const order = await Order.findById(x_id_invoice);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    if (x_response === 'Aceptada') {
      // Actualizar la orden como aceptada y pago completado
      order.status = 'ACCEPTED';
      order.paymentStatus = 'COMPLETED';
      order.transactionId = x_transaction_id;

      // Generar códigos QR según la cantidad de códigos comprados
      let qrCodesDataUrls = [];
      for (let i = 0; i < order.quantity; i++) {
        // Generar contenido para el QR, se puede ajustar según sea necesario
        const qrContent = `OrderId: ${order._id} - QR number: ${i + 1}`;
        const qrDataUrl = await QRCode.toDataURL(qrContent);
        qrCodesDataUrls.push(qrDataUrl);
      }
      order.qrCodes = qrCodesDataUrls;
      await order.save();

      return res.status(200).json({
        success: true,
        message: 'Confirmación recibida. Orden actualizada y QR generados.',
        data: {
          orderId: order._id,
          transactionId: x_transaction_id,
          qrCodes: qrCodesDataUrls
        }
      });
    } else {
      // Si el pago fue rechazado, actualizar la orden como rechazada
      order.status = 'REJECTED';
      order.paymentStatus = 'FAILED';
      order.transactionId = x_transaction_id;
      await order.save();

      return res.status(200).json({
        success: false,
        message: 'Pago rechazado. Orden actualizada.',
        data: {
          orderId: order._id,
          transactionId: x_transaction_id
        }
      });
    }
  } catch (error) {
    console.error('Error al procesar confirmación de pago:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la confirmación de pago',
      error: error.message
    });
  }
});

module.exports = router; 