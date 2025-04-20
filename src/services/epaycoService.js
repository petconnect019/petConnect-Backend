const epaycoSdk = require('epayco-sdk-node');

/**
 * Servicio para interactuar con la API de Epayco
 */
class EpaycoService {
  constructor() {
    this.epayco = epaycoSdk({
      apiKey: process.env.EPAYCO_PUBLIC_KEY,
      privateKey: process.env.EPAYCO_PRIVATE_KEY,
      lang: 'ES',
      test: process.env.EPAYCO_TEST === 'true'
    });
  }

  /**
   * Crear un token de tarjeta de crédito
   * @param {Object} cardInfo - Información de la tarjeta
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async createToken(cardInfo) {
    try {
      return await this.epayco.token.create(cardInfo);
    } catch (error) {
      throw new Error(`Error al crear token: ${error.message}`);
    }
  }

  /**
   * Crear cliente en Epayco
   * @param {Object} customerInfo - Información del cliente
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async createCustomer(customerInfo) {
    try {
      return await this.epayco.customers.create(customerInfo);
    } catch (error) {
      throw new Error(`Error al crear cliente: ${error.message}`);
    }
  }

  /**
   * Obtener un cliente por su ID
   * @param {String} customerId - ID del cliente en Epayco
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async getCustomer(customerId) {
    try {
      return await this.epayco.customers.get(customerId);
    } catch (error) {
      throw new Error(`Error al obtener cliente: ${error.message}`);
    }
  }

  /**
   * Crear un plan de suscripción
   * @param {Object} planInfo - Información del plan
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async createPlan(planInfo) {
    try {
      return await this.epayco.plans.create(planInfo);
    } catch (error) {
      throw new Error(`Error al crear plan: ${error.message}`);
    }
  }

  /**
   * Obtener un plan por su ID
   * @param {String} planId - ID del plan en Epayco
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async getPlan(planId) {
    try {
      return await this.epayco.plans.get(planId);
    } catch (error) {
      throw new Error(`Error al obtener plan: ${error.message}`);
    }
  }

  /**
   * Crear una suscripción
   * @param {Object} subscriptionInfo - Información de la suscripción
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async createSubscription(subscriptionInfo) {
    try {
      return await this.epayco.subscriptions.create(subscriptionInfo);
    } catch (error) {
      throw new Error(`Error al crear suscripción: ${error.message}`);
    }
  }

  /**
   * Realizar un pago con tarjeta
   * @param {Object} paymentInfo - Información del pago
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async createCharge(paymentInfo) {
    try {
      return await this.epayco.charge.create(paymentInfo);
    } catch (error) {
      throw new Error(`Error al crear cargo: ${error.message}`);
    }
  }

  /**
   * Obtener bancos para PSE
   * @returns {Promise} Promesa con la lista de bancos
   */
  async getBanks() {
    try {
      return await this.epayco.bank.getBanks();
    } catch (error) {
      throw new Error(`Error al obtener bancos: ${error.message}`);
    }
  }

  /**
   * Crear transacción PSE
   * @param {Object} pseInfo - Información para pago PSE
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async createPseTransaction(pseInfo) {
    try {
      return await this.epayco.bank.create(pseInfo);
    } catch (error) {
      throw new Error(`Error al crear transacción PSE: ${error.message}`);
    }
  }

  /**
   * Crear transacción en efectivo
   * @param {String} type - Tipo de transacción (efecty, baloto, etc)
   * @param {Object} cashInfo - Información para pago en efectivo
   * @returns {Promise} Promesa con la respuesta de Epayco
   */
  async createCashTransaction(type, cashInfo) {
    try {
      return await this.epayco.cash.create(type, cashInfo);
    } catch (error) {
      throw new Error(`Error al crear transacción en efectivo: ${error.message}`);
    }
  }
}

module.exports = new EpaycoService(); 