const nodemailer = require('nodemailer');

// Configuración del transporter de nodemailer con soporte para OAuth2
const createTransporter = () => {
    /*
     * 1. SMTP genérico (MAILTRAP, SendGrid SMTP Relay, Outlook, etc.)
     *    Variables requeridas: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
     */
    if (
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    ) {
        console.log('📨 Usando configuración SMTP personalizada');
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465, // true para 465, false para otros
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /*
     * 2. Gmail con OAuth2 (requiere credenciales)
     */
    if (
        process.env.GMAIL_CLIENT_ID &&
        process.env.GMAIL_CLIENT_SECRET &&
        process.env.GMAIL_REFRESH_TOKEN &&
        process.env.EMAIL_USER
    ) {
        console.log('📨 Usando Gmail OAuth2');
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN
            }
        });
    }

    /*
     * 3. Gmail con contraseña de aplicación (EMAIL_USER + EMAIL_PASS)
     */
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log('📨 Usando Gmail con contraseña de aplicación');
        return nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // SSL
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    // Si no hay credenciales configuradas, usamos un servicio de prueba (ethereal)
    console.warn('⚠️ No se encontraron credenciales de correo. Usando servicio de prueba Ethereal.');
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'ethereal.user@ethereal.email',
            pass: 'ethereal_pass'
        }
    });
};

let transporter = createTransporter();

// Función para verificar y recrear el transporter si es necesario
const verifyTransporter = async () => {
    try {
        await transporter.verify();
    } catch (error) {
        console.error('Error al verificar el transporter:', error);
        // Intentar recrear el transporter
        transporter = createTransporter();
        // Verificar nuevamente
        try {
            await transporter.verify();
        } catch (retryError) {
            console.error('Error al recrear el transporter:', retryError);
            throw new Error('No se pudo establecer conexión con el servicio de correo');
        }
    }
};

const sendEmail = async ({ to, subject, html }) => {
    try {
        // Verificar el transporter antes de enviar
        await verifyTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER ? `PetConnect <${process.env.EMAIL_USER}>` : 'PetConnect <noreply@petconnect.com>',
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado exitosamente:', info.messageId);
        
        // Si estamos usando Ethereal, mostrar la URL de vista previa
        if (info.messageId.includes('ethereal')) {
            console.log('📧 Vista previa del email (desarrollo):', nodemailer.getTestMessageUrl(info));
        }
        
        return info;
    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        // No lanzamos el error para no interrumpir el flujo principal
        return {
            error: true,
            message: error.message
        };
    }
};

module.exports = {
    sendEmail
};
