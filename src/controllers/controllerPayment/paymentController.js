const epaycoService = require('../../services/epaycoService');

/**
 * Controlador para gestionar pagos a través de Epayco
 */
class PaymentController {
  /**
   * Crear un token para tarjeta de crédito
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async createToken(req, res) {
    try {
      const cardInfo = {
        "card[number]": req.body.card_number,
        "card[exp_year]": req.body.exp_year,
        "card[exp_month]": req.body.exp_month,
        "card[cvc]": req.body.cvc,
        "hasCvv": true
      };

      const response = await epaycoService.createToken(cardInfo);
      
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message
      });
    }
  }

  /**
   * Registrar un cliente en Epayco
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async createCustomer(req, res) {
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

      const response = await epaycoService.createCustomer(customerInfo);
      
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message
      });
    }
  }

  /**
   * Realizar un pago único con tarjeta
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async createCharge(req, res) {
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

      const response = await epaycoService.createCharge(paymentInfo);
      
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message
      });
    }
  }

  /**
   * Obtener listado de bancos para PSE
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getBanks(req, res) {
    try {
      const response = await epaycoService.getBanks();
      
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message
      });
    }
  }

  /**
   * Crear transacción PSE
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async createPseTransaction(req, res) {
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

      const response = await epaycoService.createPseTransaction(pseInfo);
      
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message
      });
    }
  }

  /**
   * Crear transacción en efectivo (Efecty, Baloto, etc)
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async createCashTransaction(req, res) {
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

      const response = await epaycoService.createCashTransaction(type, cashInfo);
      
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message
      });
    }
  }

  /**
   * Consultar estado de una transacción
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getTransactionInfo(req, res) {
    try {
      const { transaction_id } = req.params;
      
      // Intentar obtener información como transacción de tarjeta
      let response = await epaycoService.epayco.charge.get(transaction_id);
      
      if (!response.success) {
        // Si no es transacción de tarjeta, intentar como transacción en efectivo
        response = await epaycoService.epayco.cash.get(transaction_id);
      }
      
      if (response.success) {
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentController(); 