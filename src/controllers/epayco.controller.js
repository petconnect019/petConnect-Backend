const Epayco = require('epayco-sdk-node')({
    apiKey: process.env.EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: process.env.EPAYCO_TEST === 'true',
    p_cust_id_cliente: process.env.EPAYCO_CUST_ID_CLIENTE,
    p_key: process.env.EPAYCO_P_KEY
});

const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const qrData = require('../data/qrData');
const orderController = require('./orderController');
const { generateQRCode, generateQRImage } = require('../utils/qrData');
const { sendEmail } = require('../utils/emailService');
const UserModel = require('../models/UserModel');
const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');

// Configurar el transportador de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const epaycoController = {
    createPayment: async (req, res) => {
        try {
            console.log('Iniciando creación de pago con datos:', req.body);
            
            const { amount, qrCount, userId, shippingData } = req.body;

            // Validar datos de entrada
            if (!amount || !qrCount || !userId) {
                console.error('Faltan datos requeridos:', { amount, qrCount, userId });
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos'
                });
            }

            // Validar que el monto sea un número positivo
            if (isNaN(amount) || amount <= 0) {
                console.error('Monto inválido:', amount);
                return res.status(400).json({
                    success: false,
                    message: 'El monto debe ser un número positivo'
                });
            }

            // Obtener datos del usuario
            const user = await UserModel.findById(userId);
            if (!user) {
                console.error('Usuario no encontrado:', userId);
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Crear la orden
            const order = new OrderModel({
                userId: user._id,
                amount,
                qrCount,
                status: 'pending',
                shippingData: shippingData || {} // Guardar los datos de envío si están disponibles
            });

            await order.save();
            console.log('Orden creada:', order._id);

            // Validar que las URLs estén configuradas
            if (!process.env.BACKEND_URL) {
                console.error('BACKEND_URL no configurada');
                throw new Error('BACKEND_URL no está configurada en las variables de entorno');
            }

            if (!process.env.FRONTEND_URL) {
                console.error('FRONTEND_URL no configurada');
                throw new Error('FRONTEND_URL no está configurada en las variables de entorno');
            }

            // Crear el pago en ePayco
            const paymentData = {
                invoice: `QR-${order._id}`,
                description: `Compra de ${qrCount} códigos QR`,
                value: amount,
                tax: 0,
                tax_base: amount,
                currency: "COP",
                type_person: 0,
                doc_type: user.docType || "CC",
                doc_number: user.docNumber || "123456789",
                name: user.name,
                last_name: user.lastName,
                email: user.email,
                cellphone: shippingData?.phone || user.phone || "3000000000",
                end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                url_response: `${process.env.FRONTEND_URL}/payment-response`,
                url_confirmation: `${process.env.BACKEND_URL}/api/payments/epayco/confirmation`,
                method_confirmation: "POST",
                extra1: order._id.toString()
            };

            console.log('Datos del pago:', {
                ...paymentData,
                url_response: paymentData.url_response,
                url_confirmation: paymentData.url_confirmation
            });

            try {
                const payment = await Epayco.charge.create(paymentData);
                console.log('Pago creado en ePayco:', payment);
                
                res.json({
                    success: true,
                    payment,
                    order
                });
            } catch (epaycoError) {
                console.error('Error de ePayco:', epaycoError);
                // Actualizar el estado de la orden a fallido
                order.status = 'failed';
                await order.save();
                
                res.status(500).json({
                    success: false,
                    message: 'Error al procesar el pago con ePayco',
                    error: epaycoError.message
                });
            }
        } catch (error) {
            console.error('Error al crear pago:', error);
            res.status(500).json({
                success: false,
                message: 'Error al procesar el pago',
                error: error.message
            });
        }
    },

    handleConfirmation: async (req, res) => {
        try {
            console.log('Recibida confirmación de pago:', req.body);
            
            const { x_ref_payco, x_cod_response, x_extra1 } = req.body;
            
            // Validar datos de entrada
            if (!x_ref_payco || !x_cod_response || !x_extra1) {
                console.log('Faltan datos en la confirmación:', req.body);
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos en la confirmación'
                });
            }

            // Verificar el estado del pago con ePayco
            const paymentInfo = await Epayco.charge.get(x_ref_payco);
            console.log('Información del pago:', paymentInfo);

            if (!paymentInfo || paymentInfo.x_cod_response !== 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Pago no aceptado o no encontrado'
                });
            }

            // Buscar la orden
            const order = await OrderModel.findById(x_extra1);
            if (!order) {
                console.log('Orden no encontrada:', x_extra1);
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }

            // Si la orden ya está completada, no hacer nada
            if (order.status === 'completed') {
                return res.json({
                    success: true,
                    message: 'La orden ya fue procesada anteriormente'
                });
            }

            // Actualizar la orden
            order.paymentId = x_ref_payco;
            order.status = 'completed';
            await order.save();

            // Generar códigos QR utilizando la nueva función mejorada
            const qrCodes = [];
            for (let i = 0; i < order.qrCount; i++) {
                try {
                    // Generar un ID único para el QR
                    const qrId = require('uuid').v4();
                    
                    // Generar el QR con opciones mejoradas
                    const qrImage = await generateQRImage(qrId);
                    
                    const qrCode = new QRModel({
                        qrId,
                        qrImage,
                        userId: order.userId,
                        orderId: order._id,
                        isActive: true,
                        isLinked: false,
                        createdAt: new Date()
                    });
                    
                    await qrCode.save();
                    qrCodes.push(qrCode);
                    console.log(`QR #${i+1} generado exitosamente con ID: ${qrId}`);
                } catch (qrError) {
                    console.error(`Error al generar QR #${i+1}:`, qrError);
                }
            }

            // Actualizar la orden con los códigos QR
            order.qrCodes = qrCodes.map(qr => qr._id);
            await order.save();
            console.log(`Orden actualizada con ${qrCodes.length} códigos QR`);

            // Generar el PDF con los códigos QR
            let pdfBuffer;
            try {
                pdfBuffer = await generateQRCode(qrCodes);
                console.log('PDF generado exitosamente');
            } catch (pdfError) {
                console.error('Error al generar PDF:', pdfError);
            }

            // Enviar correo de confirmación
            try {
                const user = await UserModel.findById(order.userId);
                const emailData = {
                    to: user.email,
                    subject: 'Confirmación de compra - PetConnect',
                    text: `¡Gracias por tu compra! Tu pago ha sido procesado exitosamente.\n\nPuedes acceder a tus códigos QR desde tu cuenta en PetConnect.\n\nNúmero de orden: ${order._id}\nCantidad de códigos QR: ${order.qrCount}`,
                    attachments: pdfBuffer ? [
                        {
                            filename: 'codigos-qr.pdf',
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }
                    ] : []
                };
                
                await sendEmail(emailData);
                console.log('Correo enviado a:', user.email);
            } catch (emailError) {
                console.error('Error al enviar email:', emailError);
            }

            res.json({
                success: true,
                message: 'Pago confirmado y códigos QR generados',
                order,
                qrCodes: qrCodes.map(qr => qr._id)
            });
        } catch (error) {
            console.error('Error al confirmar pago:', error);
            res.status(500).json({
                success: false,
                message: 'Error al procesar la confirmación del pago',
                error: error.message
            });
        }
    },

    getCustomerQRCodes: async (req, res) => {
        try {
            const { customerId } = req.params;

            // Buscar todas las órdenes completadas del cliente
            const orders = await OrderModel.find({
                userId: customerId,
                status: 'completed'
            }).populate('qrCodes');

            if (!orders || orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontraron códigos QR para este cliente'
                });
            }

            res.json({
                success: true,
                orders
            });
        } catch (error) {
            console.error('Error al obtener códigos QR:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los códigos QR',
                error: error.message
            });
        }
    }
};

module.exports = epaycoController; 