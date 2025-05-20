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
                // Intentar crear el admin
                const newAdmin = await UserModel.create({
                    name: 'ADMIN',
                    email: 'admin@gmail.com',
                    password: hashedPassword,
                    role: 'admin',
                    is_profile_public: false
                }).catch(err => {
                    // Si el error es por duplicado, intentamos obtener el admin existente
                    if (err.code === 11000) {
                        return null;
                    }
                    throw err;
                });

                // Si no se pudo crear, probablemente ya existe
                if (!newAdmin) {
                    return { exists: true };
                }

                return {
                    created: true,
                    email: newAdmin.email,
                    password: password
                };
            } catch (error) {
                // Si el error no es de duplicación, lo propagamos
                if (error.code !== 11000) {
                    throw error;
                }
                return { exists: true };
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