const express = require('express');
const { sendEmail } = require('../services/emailService');
const { validationMiddleware } = require('../middlewares/validationMiddleware');
const { body } = require('express-validator');

const router = express.Router();

// Validación para el formulario de contacto
const contactValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('subject').trim().notEmpty().withMessage('El asunto es requerido'),
  body('message').trim().notEmpty().withMessage('El mensaje es requerido'),
];

router.post('/contact', contactValidation, validationMiddleware, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Configuración del correo
    const emailConfig = {
      to: 'petconnect019@gmail.com', // Email de soporte
      subject: `Nuevo mensaje de soporte: ${subject}`,
      html: `
        <h2>Nuevo mensaje de soporte de PetConnect</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Asunto:</strong> ${subject}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${message}</p>
      `,
    };

    await sendEmail(emailConfig);

    // Enviar correo de confirmación al usuario
    const confirmationEmail = {
      to: email,
      subject: 'Hemos recibido tu mensaje - PetConnect',
      html: `
        <h2>¡Gracias por contactarnos!</h2>
        <p>Hola ${name},</p>
        <p>Hemos recibido tu mensaje y nuestro equipo lo revisará pronto.</p>
        <p>Te responderemos lo antes posible al correo electrónico proporcionado.</p>
        <br>
        <p>Saludos cordiales,</p>
        <p>El equipo de PetConnect</p>
      `,
    };

    await sendEmail(confirmationEmail);

    res.status(200).json({
      success: true,
      message: 'Mensaje enviado correctamente',
    });
  } catch (error) {
    console.error('Error al enviar el mensaje de soporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el mensaje. Por favor, intenta nuevamente.',
    });
  }
});

module.exports = router; 