const UserModel = require('../models/UserModel');
const PetModel = require('../models/PetModel');
const socketService = require('../services/socketService');

const chatData = {
  /**
   * Verifica si un usuario tiene acceso a un chat con el dueño de una mascota
   * @param {string} userId - ID del usuario
   * @param {string} petId - ID de la mascota
    */
  async userHasAccessToPetOwnerChat(userId, petId) {
    try {
      // Verificar que la mascota existe
      const pet = await PetModel.findById(petId);
      if (!pet) {
        throw new Error('Mascota no encontrada');
      }
      
      // Verificar que el usuario no es el dueño de la mascota
      if (pet.owner.toString() === userId) {
        throw new Error('No puedes iniciar un chat contigo mismo');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Inicia un chat con el dueño de una mascota
   * @param {string} userId - ID del usuario que inicia el chat
   * @param {string} petId - ID de la mascota
   */
  async startChatWithPetOwner(userId, petId) {
    try {
      // Verificar acceso
      await this.userHasAccessToPetOwnerChat(userId, petId);
      
      // Obtener la mascota y su dueño
      const pet = await PetModel.findById(petId).populate('owner', 'name email profilePicture');
      
      // Obtener información del usuario que inicia el chat
      const user = await UserModel.findById(userId).select('name email profilePicture');
      
      // Crear objeto de chat (sin persistir en base de datos)
      const chatInfo = {
        petId,
        petName: pet.name,
        petOwner: {
          id: pet.owner._id,
          name: pet.owner.name,
          email: pet.owner.email,
          profilePicture: pet.owner.profilePicture
        },
        initiator: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture
        },
        startedAt: new Date()
      };
      
      // Notificar al dueño de la mascota si está conectado
      socketService.sendDirectMessage(pet.owner._id.toString(), 'chat_request', {
        petId,
        petName: pet.name,
        from: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture
        },
        timestamp: new Date()
      });
      
      return chatInfo;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Envía un mensaje al dueño de una mascota
   * @param {string} userId - ID del usuario que envía el mensaje
   * @param {string} petId - ID de la mascota
   * @param {string} content - Contenido del mensaje
   * @param {Object} location - Ubicación opcional
   */
  async sendMessageToPetOwner(userId, petId, content, location = null) {
    try {
      // Verificar acceso
      await this.userHasAccessToPetOwnerChat(userId, petId);
      
      // Obtener la mascota y su dueño
      const pet = await PetModel.findById(petId);
      const user = await UserModel.findById(userId).select('name email profilePicture');
      
      // Crear objeto de mensaje (sin persistir en base de datos)
      const messageInfo = {
        petId,
        senderId: userId,
        senderName: user.name,
        senderEmail: user.email,
        senderProfilePicture: user.profilePicture,
        receiverId: pet.owner,
        content,
        location,
        timestamp: new Date()
      };
      
      // Enviar mensaje al dueño de la mascota si está conectado
      socketService.sendDirectMessage(pet.owner.toString(), 'pet_message', messageInfo);
      
      return messageInfo;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Envía un mensaje a un usuario que encontró una mascota
   * @param {string} ownerId - ID del dueño de la mascota
   * @param {string} finderId - ID del usuario que encontró la mascota
   * @param {string} petId - ID de la mascota
   * @param {string} content - Contenido del mensaje
    */
  async sendMessageToPetFinder(ownerId, finderId, petId, content) {
    try {
      // Verificar que la mascota existe y pertenece al dueño
      const pet = await PetModel.findOne({ _id: petId, owner: ownerId });
      if (!pet) {
        throw new Error('Mascota no encontrada o no eres el dueño');
      }
      
      const owner = await UserModel.findById(ownerId).select('name email profilePicture');
      
      // Crear objeto de mensaje (sin persistir en base de datos)
      const messageInfo = {
        petId,
        senderId: ownerId,
        senderName: owner.name,
        senderEmail: owner.email,
        senderProfilePicture: owner.profilePicture,
        receiverId: finderId,
        content,
        timestamp: new Date()
      };
      
      // Enviar mensaje al usuario que encontró la mascota si está conectado
      socketService.sendDirectMessage(finderId, 'owner_message', messageInfo);
      
      return messageInfo;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = chatData; 