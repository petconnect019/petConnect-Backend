const epayco = require('epayco-sdk-node')({
    apiKey: process.env.EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: process.env.EPAYCO_TEST === 'true',
    p_cust_id_cliente: process.env.EPAYCO_CUST_ID_CLIENTE,
    p_key: process.env.EPAYCO_P_KEY
});

module.exports = epayco; 