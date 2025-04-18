const Epayco = require('epayco-sdk-node')({
    apiKey: process.env.EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: true
});

const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const streamifier = require('streamifier');
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
            
            const { amount, qrCount, userId } = req.body;

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
                status: 'pending'
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
                cellphone: user.phone || "3000000000",
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
            console.log('Recibida confirmación de pago:', req.body); // Para depuración
            
            const { x_ref_payco, x_cod_response, x_extra1 } = req.body;
            
            // Validar datos de entrada
            if (!x_ref_payco || !x_cod_response || !x_extra1) {
                console.log('Faltan datos en la confirmación:', req.body); // Para depuración
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos en la confirmación'
                });
            }

            // Verificar el estado del pago con ePayco
            const paymentInfo = await Epayco.charge.get(x_ref_payco);
            console.log('Información del pago:', paymentInfo); // Para depuración

            if (!paymentInfo || paymentInfo.x_cod_response !== 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Pago no aceptado o no encontrado'
                });
            }

            // Buscar la orden
            const order = await OrderModel.findById(x_extra1);
            if (!order) {
                console.log('Orden no encontrada:', x_extra1); // Para depuración
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }

            // Actualizar la orden
            order.paymentId = x_ref_payco;
            order.status = 'completed';
            await order.save();

            // Generar códigos QR
            const qrCodes = [];
            for (let i = 0; i < order.qrCount; i++) {
                const qrId = require('uuid').v4();
                const qrImage = await generateQRImage(qrId);
                
                const qrCode = new QRModel({
                    qrId,
                    qrImage,
                    userId: order.userId,
                    orderId: order._id
                });
                
                await qrCode.save();
                qrCodes.push(qrCode);
            }

            // Actualizar la orden con los códigos QR
            order.qrCodes = qrCodes.map(qr => qr._id);
            await order.save();

            // Generar PDF con los códigos QR
            const pdfBuffer = await generateQRCode(qrCodes);
            
            // Enviar correo
            const user = await UserModel.findById(order.userId);
            await sendEmail({
                to: user.email,
                subject: 'Tus códigos QR de PetConnect',
                text: 'Gracias por tu compra. Adjunto encontrarás tus códigos QR.',
                attachments: [{
                    filename: 'qr-codes.pdf',
                    content: pdfBuffer
                }]
            });

            res.json({
                success: true,
                message: 'Pago confirmado y códigos QR generados'
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

            // Obtener todos los códigos QR de las órdenes
            const qrCodes = orders.flatMap(order => order.qrCodes);

            // Generar imágenes QR para cada código
            const qrImages = await Promise.all(
                qrCodes.map(async (qr) => {
                    const qrImage = await generateQRImage(qr.qrId);
                    return {
                        ...qr.toObject(),
                        qrImage
                    };
                })
            );

            res.json({
                success: true,
                qrCodes: qrImages
            });
        } catch (error) {
            console.error('Error al obtener códigos QR del cliente:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los códigos QR',
                error: error.message
            });
        }
    }
};

module.exports = epaycoController; 