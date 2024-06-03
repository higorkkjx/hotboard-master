const fs = require('fs');
const axios = require('axios');
const { decryptMedia } = require('@open-wa/wa-decrypt');

const imageMessage = {
    url: 'https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m237/up-oil-image-c3398536-8045-4b10-9571-03e7aa3b81f0?ccb=9-4&oh=01_Q5AaIE3B8fvYRd8DMRxI2N7ud_wJopd3mqI8TB9_6J7Zl5S6&oe=66815FEC&_nc_sid=000000&mms3=true',
    mediaKey: new Uint8Array([
        176, 150, 253, 193,  33,  28, 148,  97,
        119, 226, 227, 107, 179,  52, 109,   7,
        249, 253, 166,  38,  54,  95,  31, 188,
         27, 123, 147, 193,  96,  84, 191, 107
    ]),
    fileSha256: new Uint8Array([
        19,  40,  62,  65, 110, 173,  43, 196,
        96, 218, 246, 106, 111, 221, 192,  95,
        61, 145,  20, 170, 247, 162, 189,  70,
        72,  55, 128, 215, 144, 246,  99, 181
    ]),
    mimetype: 'image/jpeg',
};

const downloadAndDecryptImage = async (message) => {
    try {
        const response = await axios.get(message.url, { responseType: 'arraybuffer' });
        const decryptedMedia = await decryptMedia({
            message: response.data,
            mediaKey: message.mediaKey,
            fileSha256: message.fileSha256,
            mimetype: message.mimetype,
        });
        fs.writeFileSync('decrypted_image.jpg', decryptedMedia, 'binary');
        console.log('Imagem baixada e descriptografada com sucesso!');
    } catch (error) {
        console.error('Ocorreu um erro:', error);
    }
};

downloadAndDecryptImage(imageMessage);
