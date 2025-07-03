const qrData = require('../../data/qrData');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const UserModel = require('../../models/UserModel');
const mongoose = require('mongoose');
const QRModel = require('../../models/QRModel');
const QRScanModel = require('../../models/QRScanModel');
const { sendEmail } = require('../../services/emailService');
const PetModel = require('../../models/PetModel');
const NotificationModel = require('../../models/NotificationModel');

// Función auxiliar para obtener detalles de ubicación usando OpenStreetMap Nominatim
async function getLocationDetails(latitude, longitude) {
    try {
        // Esperar 1 segundo para respetar el límite de rate de Nominatim
        await new Promise(resolve => setTimeout(resolve, 1000));

        const url = new URL(`https://nominatim.openstreetmap.org/reverse`);
        url.searchParams.set('format', 'json');
        url.searchParams.set('lat', latitude);
        url.searchParams.set('lon', longitude);
        url.searchParams.set('accept-language', 'es');

        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'PetConnect/1.0' // Identificador requerido por Nominatim
            }
        });
        
        if (!response.ok) {
            // Lanza un error si la respuesta no es exitosa para ser capturado por el bloque catch
            throw new Error(`Nominatim request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data && data.address) {
            const address = data.address;
            return {
                departamento: address.state || address.county || 'No disponible',
                ciudad: address.city || address.town || address.village || address.municipality || 'No disponible',
                direccion: data.display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Error al obtener detalles de ubicación:', error);
        return null;
    }
}

// Función auxiliar para geocodificar una dirección usando OpenStreetMap Nominatim
async function geocodeAddress(address) {
    try {
        // Esperar 1 segundo para respetar el límite de rate de Nominatim
        await new Promise(resolve => setTimeout(resolve, 1000));

        const url = new URL(`https://nominatim.openstreetmap.org/search`);
        url.searchParams.set('q', address);
        url.searchParams.set('format', 'json');
        url.searchParams.set('accept-language', 'es');
        url.searchParams.set('limit', '1');
        
        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'PetConnect/1.0' // Identificador requerido por Nominatim
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim request failed with status ${response.status}`);
        }
        
        const data = await response.json();

        if (data && data.length > 0) {
            const { lat, lon, display_name } = data[0];
            const addressDetails = data[0].address;
            return {
                latitude: parseFloat(lat),
                longitude: parseFloat(lon),
                direccion: display_name,
                departamento: addressDetails.state || addressDetails.county || 'No disponible',
                ciudad: addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.municipality || 'No disponible',
            };
        }
        return null;
    } catch (error) {
        console.error('Error al geocodificar la dirección:', error);
        return null;
    }
}

const qrController = {
    generateMultipleQRs: async (req, res, next) => {
        try {
            const { count } = req.body;
            const userId = req.user.id;
            
            if (!count || count < 1 || count > 100) {
                const error = new Error('La cantidad debe estar entre 1 y 100');
                error.statusCode = 400;
                return next(error);
            }
            
            const qrCodes = await qrData.generateMultipleQRs(userId, count);
            
            res.status(201).json({
                success: true,
                message: `${count} códigos QR generados`,
                qrCodes
            });
        } catch (error) {
            console.error('Error al generar QRs:', error);
            next(error);
        }
    },
    
    scanQR: async (req, res, next) => {
        try {
            const { qrId } = req.params;
            const scannerUserId = req.user ? req.user.id : null;
            let { latitude, longitude, address } = req.body;
            let locationDetails;
            let locationText;

            // Lógica de geolocalización mejorada
            if (address) {
                const geocodedLocation = await geocodeAddress(address);
                if (geocodedLocation) {
                    latitude = geocodedLocation.latitude;
                    longitude = geocodedLocation.longitude;
                    locationDetails = {
                        direccion: geocodedLocation.direccion,
                        departamento: geocodedLocation.departamento,
                        ciudad: geocodedLocation.ciudad,
                    };
                    locationText = geocodedLocation.direccion;
                } else {
                    // Si la geocodificación falla, se guarda la dirección de texto
                    locationDetails = { direccion: address, departamento: 'No disponible', ciudad: 'No disponible' };
                    locationText = address;
                    latitude = null;
                    longitude = null;
                }
            } else if (latitude && longitude) {
                locationDetails = await getLocationDetails(latitude, longitude);
                locationText = locationDetails?.direccion || 'ubicación no especificada';
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere una dirección o coordenadas (latitud y longitud) para registrar el escaneo.'
                });
            }

            // Verificar si el QR existe
            const qr = await QRModel.findById(qrId).populate('petId');
            if (!qr || !qr.isActive) {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado o ha sido eliminado'
                });
            }

            // Solo crear registro de escaneo si el QR está vinculado a una mascota y no es escaneado por su dueño
            let scanRecord = null;
            if (qr.isLinked && qr.petId && (!scannerUserId || qr.userId.toString() !== scannerUserId)) {
                scanRecord = await QRScanModel.create({
                    qrId: qr._id,
                    scannedBy: scannerUserId,
                    location: {
                        latitude: latitude,
                        longitude: longitude,
                        address: locationDetails?.direccion || address || 'No disponible',
                        departamento: locationDetails?.departamento || 'No disponible',
                        ciudad: locationDetails?.ciudad || 'No disponible'
                    }
                });

                // Crear notificación para el dueño de la mascota
                await NotificationModel.create({
                    userId: qr.userId,
                    title: '¡Tu mascota ha sido encontrada!',
                    message: `${qr.petId.name} ha sido escaneado ${locationText}`,
                    type: 'pet_scan',
                    actionUrl: `/check-protection`,
                    data: {
                        petId: qr.petId._id,
                        scanId: scanRecord._id,
                        location: scanRecord.location
                    }
                });
            }

            // Preparar respuesta
            const response = {
                success: true,
                message: qr.isLinked ? 
                    'Hola, ¿me ayudas a encontrar a mi dueño?' : 
                    'Este QR no está vinculado a ninguna mascota',
                isLinked: qr.isLinked
            };

            // Solo incluir información del escaneo si se creó el registro
            if (scanRecord) {
                response.scan = {
                    fecha: scanRecord.formattedDate,
                    hora: scanRecord.formattedTime,
                    ubicacion: scanRecord.location
                };
            }

            if (qr.isLinked && qr.petId) {
                response.pet = {
                    id: qr.petId._id,
                    nombre: qr.petId.name,
                    especie: qr.petId.species,
                    raza: qr.petId.breed,
                    foto: qr.petId.profilePicture
                };
            }

            res.json(response);
        } catch (error) {
            console.error('Error al escanear QR:', error);
            next(error);
        }
    },
    
    linkQRToPet: async (req, res, next) => {
        // console.log('🚀 ENTRANDO A linkQRToPet');
        // console.log('=== DEBUGGING linkQRToPet ===');
        // console.log('QR ID recibido:', _id);
        // console.log('Pet ID recibido:', petId);
        // console.log('User ID autenticado:', userId);
        // console.log('User role:', userRole);
        // console.log('Request body completo:', req.body);
        // console.log('Request query completo:', req.query);
        // console.log('❌ ERROR EN linkQRToPet:');
        // console.log('Error message:', error.message);
        // console.log('Error stack:', error.stack);
        try {
            const _id = req.query._id;
            const { petId } = req.body;
            const userId = req.user.id;
            const userRole = req.user.role;

            if (!_id || !petId) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren tanto el ID del QR como el ID de la mascota'
                });
            }
            
            const updatedQR = await qrData.linkQRToPet(_id, petId, userId, userRole);
            
            res.json({
                success: true,
                message: 'QR vinculado exitosamente',
                qr: updatedQR
            });
        } catch (error) {
            // console.log('❌ ERROR EN linkQRToPet:');
            console.error('Error al vincular QR:', error);
            console.log('Error message:', error.message);
            console.log('Error stack:', error.stack);
            
            if (error.message === 'QR no encontrado o ha sido eliminado') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            } else if (error.message === 'Este QR ya está vinculado a una mascota') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            } else if (error.message === 'Mascota no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            } else if (error.message === 'No tienes permiso para vincular este QR a esta mascota') {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error interno al vincular el QR',
                error: error.message
            });
        }
    },
    
    getAllQRs: async (req, res, next) => {
        const userRole = req.user.role;

        if (userRole !== 'admin') {
            const error = new Error('No tienes permiso para acceder a esta información');
            error.statusCode = 403;
            return next(error);
        }

        try {
            const qrs = await qrData.getAllQRs();
            
            res.json({
                success: true,
                qrs
            });
        } catch (error) {
            console.error('Error al obtener QRs:', error);
            next(error);
        }
    },
    
    getUserQRs: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const qrs = await qrData.getUserQRs(userId);
            
            if (!qrs || qrs.length === 0) {
                const error = new Error('No tienes QRs en lista');
                error.statusCode = 404;
                return next(error);
            }
            res.json({
                success: true,
                qrs
            });
        } catch (error) {
            console.error('Error al obtener QRs del usuario:', error);
            next(error);
        }
    },
    
    deactivateQR: async (req, res, next) => {
        try {
            const { _id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;
            
            const updatedQR = await qrData.deactivateQR(_id, userId, userRole);
            
            res.json({
                success: true,
                message: 'QR desactivado exitosamente',
                qr: updatedQR
            });
        } catch (error) {
            console.error('Error al desactivar QR:', error);
            
            if (error.message === 'QR no encontrado') {
                error.statusCode = 404;
            } else if (error.message === 'Solo los administradores pueden desactivar códigos QR') {
                error.statusCode = 403;
            }
            
            next(error);
        }
    },
    
    deleteQR: async (req, res, next) => {
        try {
            const { _id } = req.params;
            const userId = req.user.id;
            
            const result = await qrData.deleteQR(_id, userId);
            
            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error al eliminar QR:', error);
            
            if (error.message === 'QR no encontrado') {
                error.statusCode = 404;
            } else if (error.message === 'No tienes permiso para eliminar este QR') {
                error.statusCode = 403;
            } else if (error.message === 'No se puede eliminar un QR que está vinculado a una mascota. Desvincúlalo primero.') {
                error.statusCode = 400;
            }
            
            next(error);
        }
    },
    
    getQRById: async (req, res, next) => {
        try {
            const _id = req.params.id;
            const qrDetails = await qrData.getQRById(_id);
            
            return res.status(200).json({
                success: true,
                message: 'Código QR encontrado',
                data: qrDetails
            });
        } catch (error) {
            console.error('Error al obtener código QR:', error);
            next(error);
        }
    },
    
    getUserQRCodes: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const qrCodes = await qrData.getUserQRCodes(userId);
            
            return res.status(200).json({
                success: true,
                message: qrCodes.length > 0 ? `Se encontraron ${qrCodes.length} códigos QR` : 'No se encontraron códigos QR',
                data: qrCodes
            });
        } catch (error) {
            console.error('Error al obtener códigos QR del usuario:', error);
            next(error);
        }
    },

    getQRHistory: async (req, res, next) => {
        try {
            const { qrId } = req.params;
            const userId = req.user.id;
            
            // Obtener el QR y verificar permisos
            const qr = await QRModel.findById(qrId).populate('petId');
            if (!qr) {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado'
                });
            }

            if (qr.userId.toString() !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para ver el historial de este QR'
                });
            }

            // Obtener el historial de escaneos
            const history = await QRScanModel.find({ qrId: qr._id })
                .sort({ scanDate: -1 })
                .populate('scannedBy', 'name email');

            // Formatear los datos para el frontend
            const formattedHistory = history.map(scan => ({
                mascotaDetectada: qr.petId ? qr.petId.name : 'No vinculada',
                departamento: scan.location?.departamento || 'No disponible',
                ciudad: scan.location?.ciudad || 'No disponible',
                fecha: scan.formattedDate,
                hora: scan.formattedTime,
                ubicacion: {
                    latitude: scan.location?.latitude,
                    longitude: scan.location?.longitude,
                    address: scan.location?.address
                },
                escaneadoPor: scan.scannedBy ? {
                    id: scan.scannedBy._id,
                    nombre: scan.scannedBy.name,
                    email: scan.scannedBy.email
                } : null
            }));
            
            return res.status(200).json({
                success: true,
                message: `Se encontraron ${history.length} escaneos para este QR`,
                petName: qr.petId ? qr.petId.name : null,
                history: formattedHistory
            });
        } catch (error) {
            console.error('Error al obtener historial de QR:', error);
            next(error);
        }
    },

    /**
     * Genera un código QR para un usuario (solo administradores)
     * Este QR podrá ser vinculado a una mascota posteriormente
     */
    generateUserQR: async (req, res, next) => {
        try {
            // Verificar que el usuario es administrador
            if (req.user.role !== 'admin') {
                const error = new Error('Solo los administradores pueden generar códigos QR para usuarios');
                error.statusCode = 403;
                return next(error);
            }

            const { userId } = req.params;
            
            // Verificar que el usuario existe
            const user = await UserModel.findById(userId);
            if (!user) {
                const error = new Error('Usuario no encontrado');
                error.statusCode = 404;
                return next(error);
            }

            // Generar un solo QR usando la función existente
            const qrCodes = await qrData.generateMultipleQRs(userId, 1);
            
            if (!qrCodes || qrCodes.length === 0) {
                const error = new Error('Error al generar el código QR');
                error.statusCode = 500;
                return next(error);
            }

            const qrCode = qrCodes[0];

            res.status(200).json({
                success: true,
                message: 'Código QR generado exitosamente. Este QR puede ser vinculado a una mascota.',
                data: {
                    qrCode: qrCode.qrImage,
                    _id: qrCode._id,
                    qrURL: qrCode.qrURL,
                    userId: user._id,
                    isLinked: qrCode.isLinked,
                    isActive: qrCode.isActive
                }
            });
        } catch (error) {
            console.error('Error al generar código QR:', error);
            next(error);
        }
    },

    registerManualScan: async (req, res, next) => {
        try {
            const { qrId } = req.params;
            const scannerUserId = req.user ? req.user.id : null;
            let { latitude, longitude, address } = req.body;
            let locationDetails;
            let locationText;

            // Lógica de geolocalización mejorada
            if (address) {
                const geocodedLocation = await geocodeAddress(address);
                if (geocodedLocation) {
                    latitude = geocodedLocation.latitude;
                    longitude = geocodedLocation.longitude;
                    locationDetails = {
                        direccion: geocodedLocation.direccion,
                        departamento: geocodedLocation.departamento,
                        ciudad: geocodedLocation.ciudad,
                    };
                    locationText = geocodedLocation.direccion;
                } else {
                    // Si la geocodificación falla, se guarda la dirección de texto
                    locationDetails = { direccion: address, departamento: 'No disponible', ciudad: 'No disponible' };
                    locationText = address;
                    latitude = null;
                    longitude = null;
                }
            } else if (latitude && longitude) {
                locationDetails = await getLocationDetails(latitude, longitude);
                locationText = locationDetails?.direccion || 'ubicación no especificada';
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere una dirección o coordenadas (latitud y longitud) para registrar el escaneo.'
                });
            }

            // Verificar si el QR existe y obtener información de la mascota
            const qr = await QRModel.findById(qrId).populate('petId').populate('userId', 'email name');
            if (!qr || !qr.isActive) {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado o ha sido eliminado'
                });
            }

            // Verificar que el QR esté vinculado a una mascota
            if (!qr.isLinked || !qr.petId) {
                return res.status(400).json({
                    success: false,
                    message: 'Este QR no está vinculado a ninguna mascota'
                });
            }

            // Verificar que no sea el dueño quien registra el escaneo
            if (scannerUserId && qr.userId.toString() === scannerUserId) {
                return res.status(400).json({
                    success: false,
                    message: 'El dueño de la mascota no puede registrar escaneos'
                });
            }

            // Crear el registro de escaneo
            const scanRecord = await QRScanModel.create({
                qrId: qr._id,
                scannedBy: scannerUserId,
                location: {
                    latitude,
                    longitude,
                    address: locationDetails?.direccion || address || 'No disponible',
                    departamento: locationDetails?.departamento || 'No disponible',
                    ciudad: locationDetails?.ciudad || 'No disponible'
                }
            });

            // Crear notificación para el dueño
            await NotificationModel.create({
                userId: qr.userId,
                title: '¡Tu mascota ha sido encontrada!',
                message: `${qr.petId.name} ha sido visto en ${locationText}`,
                type: 'pet_scan',
                actionUrl: `/check-protection`,
                data: {
                    petId: qr.petId._id,
                    scanId: scanRecord._id,
                    location: scanRecord.location
                }
            });

            // Enviar correo electrónico al dueño
            try {
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #f97316;">¡${qr.petId.name} ha sido encontrado!</h2>
                        <p>Hola ${qr.userId.name},</p>
                        <p>Queremos informarte que alguien ha escaneado el código QR de ${qr.petId.name}.</p>
                        <p><strong>Detalles del escaneo:</strong></p>
                        <ul>
                            <li>Fecha: ${scanRecord.formattedDate}</li>
                            <li>Hora: ${scanRecord.formattedTime}</li>
                            <li>Ubicación: ${locationText}</li>
                        </ul>
                        <p>Puedes ver más detalles iniciando sesión en tu cuenta de PetConnect.</p>
                        <div style="margin-top: 20px; padding: 15px; background-color: #fff7ed; border-radius: 8px;">
                            <p style="margin: 0; color: #9a3412;">Importante: Si tu mascota está perdida, te recomendamos revisar la ubicación proporcionada lo antes posible.</p>
                        </div>
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="${process.env.FRONTEND_URL}/check-protection" style="background-color: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver detalles en PetConnect</a>
                        </div>
                    </div>
                `;

                await sendEmail({
                    to: qr.userId.email,
                    subject: `¡${qr.petId.name} ha sido encontrado! - PetConnect`,
                    html: emailHtml
                });

                console.log('✅ Correo electrónico enviado exitosamente al dueño');
            } catch (emailError) {
                console.error('❌ Error al enviar correo electrónico:', emailError);
                // No detenemos el flujo si falla el envío del correo
            }

            res.status(201).json({
                success: true,
                message: 'Escaneo registrado exitosamente',
                scan: {
                    fecha: scanRecord.formattedDate,
                    hora: scanRecord.formattedTime,
                    ubicacion: scanRecord.location
                },
                pet: {
                    name: qr.petId.name
                },
                owner: {
                    name: qr.userId.name,
                    email: qr.userId.email
                }
            });
        } catch (error) {
            console.error('Error al registrar escaneo manual:', error);
            next(error);
        }
    },
};

module.exports = qrController;