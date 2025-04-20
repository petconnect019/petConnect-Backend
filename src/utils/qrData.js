const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

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
            });
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const generateQRImage = async (data) => {
    try {
        // Opciones mejoradas para generar QRs más robustos
        const options = {
            errorCorrectionLevel: 'H', // Alta corrección de errores
            margin: 2, // Margen alrededor del QR
            width: 300, // Tamaño del QR
            color: {
                dark: '#000000', // Color del QR
                light: '#FFFFFF' // Color de fondo
            }
        };
        
        // Agregamos el dominio del frontend a la URL para asegurar que funcione correctamente
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
        const qrContent = typeof data === 'string' ? `${baseUrl}/qr/scan/${data}` : JSON.stringify(data);
        
        const qrImage = await QRCode.toDataURL(qrContent, options);
        return qrImage;
    } catch (error) {
        console.error('Error al generar código QR:', error);
        throw error;
    }
};

module.exports = {
    generateQRCode,
    generateQRImage
}; 