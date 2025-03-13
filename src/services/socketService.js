const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

let io;
const connectedUsers = new Map();

const initialize = (socketIo) => {
  io = socketIo;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Autenticación requerida'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      
      // Verificar si el usuario existe
      const user = await UserModel.findById(decoded.id);
      if (!user) {
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
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.userId}`);
    
    // Registrar usuario conectado
    connectedUsers.set(socket.userId, socket.id);
    
    // Unirse a salas personales para recibir mensajes directos
    socket.join(`user:${socket.userId}`);
    
    // Manejar envío de mensajes directos
    socket.on('send_direct_message', (data) => {
      try {
        const { receiverId, content } = data;
        
        // Verificar si el receptor está conectado
        if (connectedUsers.has(receiverId)) {
          // Enviar mensaje al receptor
          io.to(`user:${receiverId}`).emit('direct_message', {
            senderId: socket.userId,
            senderName: socket.user.name,
            content,
            timestamp: new Date()
          });
          
          // Confirmar envío al remitente
          socket.emit('message_sent', {
            receiverId,
            content,
            timestamp: new Date()
          });
        } else {
          // El receptor no está conectado
          socket.emit('user_offline', {
            receiverId,
            message: 'El usuario no está conectado actualmente'
          });
        }
      } catch (error) {
        console.error('Error al enviar mensaje directo:', error);
        socket.emit('error', { message: 'Error al enviar mensaje' });
      }
    });
    
    // Manejar mensajes relacionados con mascotas
    socket.on('pet_message', (data) => {
      try {
        const { petId, ownerId, content } = data;
        
        // Verificar si el dueño está conectado
        if (connectedUsers.has(ownerId)) {
          // Enviar mensaje al dueño de la mascota
          io.to(`user:${ownerId}`).emit('pet_message', {
            petId,
            senderId: socket.userId,
            senderName: socket.user.name,
            content,
            timestamp: new Date()
          });
          
          // Confirmar envío al remitente
          socket.emit('pet_message_sent', {
            petId,
            ownerId,
            content,
            timestamp: new Date()
          });
        } else {
          // El dueño no está conectado
          socket.emit('owner_offline', {
            petId,
            ownerId,
            message: 'El dueño de la mascota no está conectado actualmente'
          });
        }
      } catch (error) {
        console.error('Error al enviar mensaje sobre mascota:', error);
        socket.emit('error', { message: 'Error al enviar mensaje sobre mascota' });
      }
    });
    
    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${socket.userId}`);
      
      // Eliminar usuario de la lista de conectados
      connectedUsers.delete(socket.userId);
    });
  });
};

// Función para enviar mensaje a un usuario específico
const sendDirectMessage = (userId, event, data) => {
  if (io && connectedUsers.has(userId)) {
    io.to(`user:${userId}`).emit(event, data);
    return true;
  }
  return false;
};

module.exports = {
  initialize,
  sendDirectMessage,
  connectedUsers
}; 