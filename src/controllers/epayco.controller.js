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
const PDFDocument = require('pdfkit');
const qrData = require('../data/qrData');
const orderController = require('./controllerOrder/orderController');
const { sendEmail } = require('../utils/emailService');
const UserModel = require('../models/UserModel');
const OrderModel = require('../models/OrderModel');
const QRModel = require('../models/QRModel');

// Función para generar el PDF con los códigos QR
const generateQRCode = async (qrCodes) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            
            // Agregar título
            doc.fontSize(20).text('Códigos QR PetConnect', { align: 'center' });
            doc.moveDown();
            
            // Agregar información de la compra
            doc.fontSize(12).text(`Cantidad de códigos QR: ${qrCodes.length}`);
            doc.moveDown();
            
            // Agregar cada código QR al PDF
            qrCodes.forEach((qr, index) => {
                if (index > 0) doc.addPage();
                
                // Agregar el código QR
                doc.image(qr.qrImage, {
                    fit: [200, 200],
                    align: 'center'
                });
                
                // Agregar información del código QR
                doc.moveDown();
                doc.fontSize(12).text(`Código QR #${index + 1}`, { align: 'center' });
                doc.fontSize(10).text(`ID: ${qr.qrId}`, { align: 'center' });
                doc.fontSize(10).text(`Fecha: ${new Date().toLocaleDateString()}`, { align: 'center' });
                doc.moveDown();
                doc.fontSize(9).text(`Para asociar el QR a tu mascota, escanéalo o ingresa este código en tu app PetConnect`, { align: 'center' });
            });
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

// Configurar el transportador de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Función auxiliar para obtener la URL correcta según el entorno
const getCorrectUrl = (localUrl, type) => {
    // Si estamos usando ngrok, usamos la URL de ngrok
    if (process.env.NGROK_DOMAIN) {
        if (type === 'frontend') {
            return process.env.NGROK_FRONTEND_URL || `https://${process.env.NGROK_DOMAIN}`;
        } else if (type === 'backend') {
            return process.env.NGROK_BACKEND_URL || `https://${process.env.NGROK_DOMAIN}`;
        }
    }
    
    // Si no hay ngrok, usamos la URL local
    return localUrl;
};

// Función para crear automáticamente una orden completada para pruebas
const createCompletedOrderWithQRs = async (userId, qrCount, paymentId) => {
    try {
        console.log(`Creando orden completada para usuario ${userId} con ${qrCount} QRs y pago ${paymentId}`);
        
        // Crear la orden
        const order = new OrderModel({
            userId,
            amount: qrCount * 10000, // Costo unitario de 10,000 COP por QR
            qrCount,
            status: 'completed',
            paymentId
        });
        
        await order.save();
        console.log(`Orden creada con ID: ${order._id}`);
        
        // Generar códigos QR
        const qrCodes = [];
        for (let i = 0; i < qrCount; i++) {
            try {
                // Generar un ID único para el QR
                const qrId = require('uuid').v4();
                
                // Usamos la función de qrData
                const tempQR = await qrData.generateQR(userId);
                
                // Crear el modelo QR
                const qrCode = new QRModel({
                    qrId,
                    qrImage: tempQR.qrImage,
                    userId,
                    orderId: order._id,
                    status: 'active',
                    createdAt: new Date()
                });
                
                await qrCode.save();
                qrCodes.push(qrCode);
                console.log(`QR #${i+1} generado con ID: ${qrId}`);
            } catch (error) {
                console.error(`Error al generar QR #${i+1}:`, error);
            }
        }
        
        // Actualizar la orden con los códigos QR
        order.qrCodes = qrCodes.map(qr => qr._id);
        await order.save();
        console.log(`Orden actualizada con ${qrCodes.length} códigos QR`);
        
        return { order, qrCodes };
    } catch (error) {
        console.error('Error al crear orden completada:', error);
        throw error;
    }
};

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

            // Obtener las URLs correctas (con o sin ngrok)
            const frontendUrl = getCorrectUrl(process.env.FRONTEND_URL, 'frontend');
            const backendUrl = getCorrectUrl(process.env.BACKEND_URL, 'backend');

            console.log('URLs para integración de pagos:');
            console.log('- Frontend URL:', frontendUrl);
            console.log('- Backend URL:', backendUrl);

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
                url_response: `${frontendUrl}/payment-success`,
                url_confirmation: `${backendUrl}/api/payments/epayco/confirmation`,
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
            console.log('Recibida confirmación de pago con datos:', req.body);
            
            // Extraer parámetros de la solicitud
            const { 
                x_ref_payco, 
                x_cod_response, 
                x_extra1, 
                x_amount,
                x_id_invoice
            } = req.body;
            
            // Log completo de todos los parámetros recibidos
            console.log('Parámetros completos recibidos:', req.body);
            
            // Validar datos de entrada
            if (!x_ref_payco) {
                console.log('Falta referencia de pago en la confirmación');
                return res.status(400).json({
                    success: false,
                    message: 'Falta referencia de pago en la confirmación'
                });
            }
            
            // Verificar si es una solicitud de prueba directa
            const isTestRequest = req.query.test === 'true';
            
            // En caso de prueba, podemos generar una orden de prueba directamente
            if (isTestRequest) {
                const testUserId = req.query.userId || '658c9cff74ef91baa8f90a30'; // ID de usuario por defecto para pruebas
                const testQrCount = parseInt(req.query.qrCount || '1');
                
                try {
                    const { order, qrCodes } = await createCompletedOrderWithQRs(
                        testUserId,
                        testQrCount,
                        x_ref_payco || `test-${Date.now()}`
                    );
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Orden de prueba creada exitosamente',
                        order: order._id,
                        qrCount: qrCodes.length
                    });
                } catch (testError) {
                    console.error('Error al crear orden de prueba:', testError);
                    return res.status(500).json({
                        success: false,
                        message: 'Error al crear orden de prueba',
                        error: testError.message
                    });
                }
            }
            
            // Para solicitudes reales, procesamos normalmente
            let order;
            let paymentInfo;
            
            try {
                // Intentar obtener información del pago desde ePayco
                paymentInfo = await Epayco.charge.get(x_ref_payco);
                console.log('Información del pago desde ePayco:', paymentInfo);
            } catch (epaycoError) {
                console.error('Error al obtener información del pago desde ePayco:', epaycoError);
                // Continuamos aunque haya error, puede ser un problema temporal con ePayco
            }
            
            // Buscar la orden por ID si tenemos x_extra1
            if (x_extra1) {
                try {
                    order = await OrderModel.findById(x_extra1);
                    console.log('Orden encontrada por ID:', order?._id);
                } catch (findError) {
                    console.error('Error al buscar orden por ID:', findError);
                }
            }
            
            // Si no encontramos la orden, buscamos por referencia de pago
            if (!order && x_ref_payco) {
                order = await OrderModel.findOne({ paymentId: x_ref_payco });
                console.log('Orden encontrada por paymentId:', order?._id);
            }
            
            // Si aún no encontramos la orden, buscamos por número de factura
            if (!order && x_id_invoice) {
                const invoiceNumber = x_id_invoice.replace('QR-', '');
                try {
                    order = await OrderModel.findById(invoiceNumber);
                    console.log('Orden encontrada por número de factura:', order?._id);
                } catch (findError) {
                    console.error('Error al buscar orden por número de factura:', findError);
                }
            }
            
            // Si no encontramos ninguna orden, es un error
            if (!order) {
                console.log('Orden no encontrada en la base de datos');
                
                // Si estamos en modo desarrollo o prueba, creamos una orden de prueba
                if (process.env.NODE_ENV === 'development' || req.query.createTest === 'true') {
                    const testUserId = req.query.userId || '658c9cff74ef91baa8f90a30'; // ID de usuario de prueba
                    const testQrCount = parseInt(req.query.qrCount || '1');
                    
                    try {
                        const { order: newOrder, qrCodes } = await createCompletedOrderWithQRs(
                            testUserId,
                            testQrCount,
                            x_ref_payco || `manual-${Date.now()}`
                        );
                        
                        return res.status(200).json({
                            success: true,
                            message: 'Orden creada manualmente debido a que no se encontró una existente',
                            order: newOrder._id,
                            qrCount: qrCodes.length
                        });
                    } catch (testError) {
                        console.error('Error al crear orden manual:', testError);
                    }
                }
                
                return res.status(404).json({
                    success: false,
                    message: 'Orden no encontrada'
                });
            }
            
            // Si la orden ya está completada, no hacer nada
            if (order.status === 'completed') {
                console.log('La orden ya está completada:', order._id);
                return res.json({
                    success: true,
                    message: 'La orden ya fue procesada anteriormente'
                });
            }
            
            // Verificar el estado del pago
            const isApproved = paymentInfo?.success && 
                             (paymentInfo.status === 'Aceptada' || 
                              paymentInfo.data?.x_response === 'Aceptada' || 
                              x_cod_response === 1 || 
                              x_cod_response === '1');
            
            if (!isApproved && !req.query.forceApprove) {
                console.log('Pago no aprobado:', paymentInfo?.status || x_cod_response);
                
                // Actualizar estado de la orden a fallido
                order.status = 'failed';
                await order.save();
                
                return res.status(400).json({
                    success: false,
                    message: 'Pago no aceptado o no encontrado'
                });
            }
            
            // Actualizar la orden con la información de pago
            order.paymentId = x_ref_payco;
            order.status = 'completed';
            await order.save();
            console.log('Orden actualizada a completada:', order._id);
            
            // Generar códigos QR
            const qrCodes = [];
            for (let i = 0; i < order.qrCount; i++) {
                try {
                    // Generar un ID único para el QR
                    const qrId = require('uuid').v4();
                    
                    // Usamos la función de qrData
                    const tempQR = await qrData.generateQR(order.userId);
                    
                    // Crear el modelo QR
                    const qrCode = new QRModel({
                        qrId,
                        qrImage: tempQR.qrImage,
                        userId: order.userId,
                        orderId: order._id,
                        status: 'active',
                        createdAt: new Date()
                    });
                    
                    await qrCode.save();
                    qrCodes.push(qrCode);
                    console.log(`QR #${i+1} generado con ID: ${qrId}`);
                } catch (qrError) {
                    console.error(`Error al generar QR #${i+1}:`, qrError);
                }
            }
            
            // Actualizar la orden con los códigos QR generados
            order.qrCodes = qrCodes.map(qr => qr._id);
            await order.save();
            console.log(`Orden actualizada con ${qrCodes.length} códigos QR`);
            
            // Generar PDF con los códigos QR
            let pdfBuffer;
            try {
                pdfBuffer = await generateQRCode(qrCodes);
                console.log('PDF de códigos QR generado exitosamente');
            } catch (pdfError) {
                console.error('Error al generar PDF de códigos QR:', pdfError);
            }
            
            // Enviar correo de confirmación al usuario
            try {
                const user = await UserModel.findById(order.userId);
                if (user && user.email) {
                    const emailData = {
                        to: user.email,
                        subject: 'Compra exitosa de Códigos QR - PetConnect',
                        text: `¡Gracias por tu compra en PetConnect!\n\nTu pago ha sido procesado exitosamente.\n\nDetalles de la compra:\n- Referencia de pago: ${x_ref_payco}\n- Cantidad de códigos QR: ${order.qrCount}\n- Total: $${order.amount.toLocaleString()} COP\n\nPuedes acceder a tus códigos QR desde tu cuenta en PetConnect.\n\nSi tienes alguna pregunta, no dudes en contactarnos.`,
                        attachments: pdfBuffer ? [
                            {
                                filename: 'codigos-qr-petconnect.pdf',
                                content: pdfBuffer,
                                contentType: 'application/pdf'
                            }
                        ] : []
                    };
                    
                    const emailResult = await sendEmail(emailData);
                    console.log('Correo de confirmación enviado a:', user.email);
                } else {
                    console.log('No se pudo enviar correo: usuario no encontrado o sin email');
                }
            } catch (emailError) {
                console.error('Error al enviar correo de confirmación:', emailError);
            }
            
            // Responder con éxito
            return res.status(200).json({
                success: true,
                message: 'Pago confirmado y códigos QR generados exitosamente',
                orderInfo: {
                    id: order._id,
                    qrCount: qrCodes.length
                }
            });
        } catch (error) {
            console.error('Error al procesar confirmación de pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al procesar la confirmación de pago',
                error: error.message
            });
        }
    },

    handleClientConfirmation: async (req, res) => {
        try {
            console.log('Recibida confirmación de pago del cliente con datos:', req.body);
            
            const { 
                x_ref_payco, 
                x_response, 
                x_extra1, 
                x_amount,
                x_transaction_id
            } = req.body;
            
            // Validar datos de entrada
            if (!x_ref_payco) {
                console.log('Falta referencia de pago en la confirmación del cliente');
                return res.status(400).json({
                    success: false,
                    message: 'Falta referencia de pago en la confirmación del cliente'
                });
            }
            
            // Intentar obtener información del pago desde ePayco
            let paymentInfo;
            try {
                paymentInfo = await Epayco.charge.get(x_ref_payco);
                console.log('Información del pago desde ePayco (cliente):', paymentInfo);
            } catch (epaycoError) {
                console.error('Error al obtener información del pago desde ePayco (cliente):', epaycoError);
                // Continuamos aunque haya error, puede ser un problema temporal con ePayco
            }
            
            // Buscar la orden por referencia de pago
            let order = await OrderModel.findOne({ paymentId: x_ref_payco });
            
            // Si no encontramos la orden, verificamos si los datos provienen de la URL de respuesta
            if (!order && req.query.ref_payco) {
                order = await OrderModel.findOne({ paymentId: req.query.ref_payco });
            }
            
            if (!order) {
                console.log('Orden no encontrada en la confirmación del cliente');
                
                // Verificar si existe una orden pendiente reciente (últimas 24 horas)
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const pendingOrders = await OrderModel.find({
                    status: 'pending',
                    createdAt: { $gte: yesterday }
                }).sort({ createdAt: -1 }).limit(1);
                
                if (pendingOrders.length > 0) {
                    order = pendingOrders[0];
                    console.log('Encontrada orden pendiente reciente:', order._id);
                    
                    // Actualizar la orden con la referencia de pago
                    order.paymentId = x_ref_payco;
                    await order.save();
                } else {
                    return res.status(404).json({
                        success: false,
                        message: 'No se encontró ninguna orden relacionada con este pago'
                    });
                }
            }
            
            // Si la orden ya está completada, informar al cliente
            if (order.status === 'completed') {
                return res.json({
                    success: true,
                    message: 'Pago ya procesado anteriormente',
                    order: {
                        id: order._id,
                        status: order.status
                    }
                });
            }
            
            // Verificar si el pago fue aprobado
            const isApproved = 
                (x_response === 'Aprobada' || x_response === 'Aceptada') ||
                (paymentInfo?.data?.x_response === 'Aceptada' || paymentInfo?.data?.x_response === 'Aprobada');
            
            if (isApproved) {
                // Actualizar la orden con la información de pago
                order.status = 'processing'; // Marcamos como en procesamiento, el webhook completo lo marcará como completed
                await order.save();
                
                return res.json({
                    success: true,
                    message: 'Pago recibido, procesando orden',
                    order: {
                        id: order._id,
                        status: order.status
                    }
                });
            } else {
                return res.json({
                    success: false,
                    message: 'El pago no fue aprobado',
                    paymentStatus: x_response || paymentInfo?.data?.x_response || 'Desconocido'
                });
            }
        } catch (error) {
            console.error('Error al procesar confirmación de pago del cliente:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al procesar la confirmación del pago',
                error: error.message
            });
        }
    },

    getCustomerQRCodes: async (req, res) => {
        try {
            const { customerId } = req.params;

            // Validar que el ID de usuario sea válido
            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Falta el ID del cliente'
                });
            }

            // Buscar todas las órdenes completadas del cliente
            const orders = await OrderModel.find({
                userId: customerId,
                status: 'completed'
            }).populate('qrCodes').sort({ createdAt: -1 });

            if (!orders || orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontraron códigos QR para este cliente'
                });
            }

            // Contar el total de códigos QR
            const totalQRs = orders.reduce((total, order) => total + (order.qrCodes?.length || 0), 0);

            // Formatear la respuesta
            const formattedOrders = orders.map(order => ({
                orderId: order._id,
                paymentId: order.paymentId,
                amount: order.amount,
                qrCount: order.qrCount,
                purchaseDate: order.createdAt,
                qrCodes: order.qrCodes.map(qr => ({
                    qrId: qr.qrId,
                    qrImage: qr.qrImage,
                    status: qr.status,
                    isLinked: qr.isLinked === true
                }))
            }));

            res.json({
                success: true,
                totalQRs,
                orders: formattedOrders
            });
        } catch (error) {
            console.error('Error al obtener códigos QR:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los códigos QR',
                error: error.message
            });
        }
    },

    // Endpoint para forzar la creación de una orden y códigos QR (sólo para desarrollo)
    createTestOrder: async (req, res) => {
        // Verificar si estamos en ambiente de desarrollo
        if (process.env.NODE_ENV !== 'development') {
            return res.status(403).json({
                success: false,
                message: 'Este endpoint sólo está disponible en ambiente de desarrollo'
            });
        }

        try {
            const { userId, qrCount } = req.body;

            if (!userId || !qrCount) {
                return res.status(400).json({
                    success: false,
                    message: 'Falta el ID de usuario o la cantidad de QRs'
                });
            }

            // Crear orden y QRs
            const { order, qrCodes } = await createCompletedOrderWithQRs(
                userId,
                parseInt(qrCount),
                `test-${Date.now()}`
            );

            res.json({
                success: true,
                message: 'Orden de prueba y códigos QR creados exitosamente',
                order: {
                    id: order._id,
                    status: order.status,
                    qrCount: qrCodes.length
                }
            });
        } catch (error) {
            console.error('Error al crear orden de prueba:', error);
            res.status(500).json({
                success: false,
                message: 'Error al crear orden de prueba',
                error: error.message
            });
        }
    }
};

module.exports = epaycoController; 