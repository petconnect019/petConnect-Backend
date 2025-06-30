const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const ChatModel = require('../models/ChatModel');

let io;
const connectedUsers = new Map();

// Sistema de logging mejorado
const logger = {
    info: (message) => console.log(`[Socket] ${message}`),
    error: (message, error) => console.error(`[Socket] ${message}`, error),
    warn: (message) => console.warn(`[Socket] ${message}`)
};

const initialize = (socketIo) => {
    io = socketIo;

    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth.token;
            
            if (!token) {
                logger.warn('Intento de conexión sin token');
                return next(new Error('Autenticación requerida'));
            }

            // Flexibilidad para manejar el prefijo 'Bearer'
            if (token.startsWith('Bearer ')) {
                token = token.slice(7, token.length);
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            
            // Verificar si el usuario existe
            const user = await UserModel.findById(decoded.id);
            if (!user) {
                logger.warn(`Usuario no encontrado: ${decoded.id}`);
                return next(new Error('Usuario no encontrado'));
            }
            
            socket.user = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            };
            
            next();
        } catch (error) {
            logger.error('Error en autenticación de socket:', error);
            next(new Error('Token inválido'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Usuario conectado: ${socket.userId}`);
        
        // Registrar usuario conectado
        connectedUsers.set(socket.userId, socket.id);
        
        // Unirse a salas personales para recibir mensajes directos
        socket.join(`user:${socket.userId}`);

        // Manejar unión a un chat específico
        socket.on('join_chat', async ({ chatId }, callback) => {
            try {
                // Verificar acceso al chat
                const chat = await ChatModel.findById(chatId)
                    .populate({
                        path: 'messages.senderId',
                        select: 'name profilePicture'
                    });

                if (!chat) {
                    return callback({ 
                        success: false, 
                        error: 'Chat no encontrado' 
                    });
                }

                // Verificar si el usuario tiene acceso
                const isOwner = chat.owner.userId.toString() === socket.userId;
                const isParticipant = chat.participants.some(p => 
                    p.userId.toString() === socket.userId
                );

                if (!isOwner && !isParticipant) {
                    return callback({ 
                        success: false, 
                        error: 'No tienes acceso a este chat' 
                    });
                }

                // Unirse a la sala del chat
                socket.join(`chat:${chatId}`);
                
                // Actualizar lastRead
                if (isOwner) {
                    chat.owner.lastRead = new Date();
                } else {
                    const participant = chat.participants.find(p => 
                        p.userId.toString() === socket.userId
                    );
                    if (participant) {
                        participant.lastRead = new Date();
                    }
                }
                await chat.save();

                // Devolver mensajes
                callback({
                    success: true,
                    messages: chat.messages
                });
            } catch (error) {
                logger.error('Error al unirse al chat:', error);
                callback({ 
                    success: false, 
                    error: 'Error al cargar mensajes' 
                });
            }
        });

        socket.on('leave_chat', ({ chatId }) => {
            socket.leave(`chat:${chatId}`);
        });

        // Implementar heartbeat
        const heartbeat = setInterval(() => {
            socket.emit('ping');
        }, 30000);

        socket.on('pong', () => {
            logger.info(`Heartbeat recibido de usuario: ${socket.userId}`);
        });
        
        // Manejar envío de mensajes directos
        socket.on('send_direct_message', (data) => {
            try {
                // Validar datos antes de procesar
                if (!data.receiverId || !data.content) {
                    logger.warn(`Datos de mensaje inválidos de usuario: ${socket.userId}`);
                    return socket.emit('error', { 
                        message: 'Datos de mensaje inválidos' 
                    });
                }
                
                // Verificar si el receptor está conectado
                if (connectedUsers.has(data.receiverId)) {
                    // Enviar mensaje al receptor
                    io.to(`user:${data.receiverId}`).emit('direct_message', {
                        senderId: socket.userId,
                        senderName: socket.user.name,
                        content: data.content,
                        timestamp: new Date()
                    });
                    
                    // Confirmar envío al remitente
                    socket.emit('message_sent', {
                        receiverId: data.receiverId,
                        content: data.content,
                        timestamp: new Date()
                    });

                    logger.info(`Mensaje enviado de ${socket.userId} a ${data.receiverId}`);
                } else {
                    // El receptor no está conectado
                    socket.emit('user_offline', {
                        receiverId: data.receiverId,
                        message: 'El usuario no está conectado actualmente'
                    });
                    logger.warn(`Intento de mensaje a usuario desconectado: ${data.receiverId}`);
                }
            } catch (error) {
                logger.error('Error al enviar mensaje directo:', error);
                socket.emit('error', { message: 'Error al enviar mensaje' });
            }
        });
        
        // Manejar mensajes relacionados con mascotas
        socket.on('pet_message', (data) => {
            try {
                // Validar datos
                if (!data.petId || !data.ownerId || !data.content) {
                    logger.warn(`Datos de mensaje de mascota inválidos de usuario: ${socket.userId}`);
                    return socket.emit('error', { 
                        message: 'Datos de mensaje inválidos' 
                    });
                }

                // Verificar si el dueño está conectado
                if (connectedUsers.has(data.ownerId)) {
                    // Enviar mensaje al dueño de la mascota
                    io.to(`user:${data.ownerId}`).emit('pet_message', {
                        petId: data.petId,
                        senderId: socket.userId,
                        senderName: socket.user.name,
                        content: data.content,
                        timestamp: new Date()
                    });
                    
                    // Confirmar envío al remitente
                    socket.emit('pet_message_sent', {
                        petId: data.petId,
                        ownerId: data.ownerId,
                        content: data.content,
                        timestamp: new Date()
                    });

                    logger.info(`Mensaje de mascota enviado de ${socket.userId} a dueño ${data.ownerId}`);
                } else {
                    // El dueño no está conectado
                    socket.emit('owner_offline', {
                        petId: data.petId,
                        ownerId: data.ownerId,
                        message: 'El dueño de la mascota no está conectado actualmente'
                    });
                    logger.warn(`Intento de mensaje a dueño desconectado: ${data.ownerId}`);
                }
            } catch (error) {
                logger.error('Error al enviar mensaje sobre mascota:', error);
                socket.emit('error', { message: 'Error al enviar mensaje sobre mascota' });
            }
        });

        // Manejar reconexión
        socket.on('reconnect', () => {
            logger.info(`Usuario reconectado: ${socket.userId}`);
            connectedUsers.set(socket.userId, socket.id);
            socket.join(`user:${socket.userId}`);
        });
        
        // Manejar errores de socket
        socket.on('error', (error) => {
            logger.error('Error en socket:', error);
            socket.emit('error', { 
                message: 'Error en la conexión',
                code: error.code || 'UNKNOWN_ERROR'
            });
        });
        
        // Manejar desconexión
        socket.on('disconnect', () => {
            logger.info(`Usuario desconectado: ${socket.userId}`);
            clearInterval(heartbeat);
            connectedUsers.delete(socket.userId);
        });
    });
};

// Función para enviar mensaje a un usuario específico
const sendDirectMessage = (userId, event, data) => {
    try {
        if (!io) {
            logger.error('Socket.io no está inicializado');
            return false;
        }
        
        if (!connectedUsers.has(userId)) {
            logger.warn(`Usuario ${userId} no está conectado`);
            return false;
        }

        io.to(`user:${userId}`).emit(event, data);
        logger.info(`Mensaje enviado a usuario ${userId}, evento: ${event}`);
        return true;
    } catch (error) {
        logger.error('Error en sendDirectMessage:', error);
        return false;
    }
};

module.exports = {
    initialize,
    sendDirectMessage,
    connectedUsers
}; 