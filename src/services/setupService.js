const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');

const setupAdminAccount = async () => {
    try {
        // Verificar si existe algún usuario admin
        const adminExists = await UserModel.findOne({ role: 'admin' });

        if (!adminExists) {
            // Crear contraseña segura y hashearla
            const password = 'petConnect12345';
            const hashedPassword = await bcrypt.hash(password, 10);
            try {
                // Crear usuario admin directamente sin usar el modelo
                await UserModel.create({
                    name: 'ADMIN',
                    email: 'admin@gmail.com',
                    password: hashedPassword,
                    role: 'admin',
                    is_profile_public: false
                });
                // Verificar que se guardó correctamente
                const savedAdmin = await UserModel.findOne({ 
                    email: 'admin@gmail.com' 
                }).select('+password');

                if (savedAdmin && savedAdmin.password) {
                    return {
                        created: true,
                        email: savedAdmin.email,
                        password: password
                    };
                } else {
                    throw new Error('La contraseña no se guardó correctamente');
                }
            } catch (error) {
                console.error('Error al crear admin:', error);
                throw error;
            }
        } else {
            return { exists: true };
        }
    } catch (error) {
        console.error('❌ Error al configurar cuenta de administrador:', error);
        throw error;
    }
};

module.exports = {
    setupAdminAccount
}; 