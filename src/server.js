const dotenv = require('dotenv')
//const mongoose = require('mongoose')
const logger = require('pino')()
dotenv.config()

const {app} = require('./config/express')
const config = require('./config/config')

const { Session } = require('./api/class/session')


let server


server = app.listen(config.port, '0.0.0.0', async () => {
    logger.info(`Listening on port ${config.port}`)
   
    if (config.restoreSessionsOnStartup) {
        logger.info(`Restaurando sessions`)
        const session = new Session()
        let restoreSessions = await session.restoreSessions()
        logger.info(`Sessions restauradas`)
    }
})


const io = require('socket.io')(server);

// Manipulador para conexão de cliente
io.on('connection', (socket) => {
    console.log('Um cliente se conectou');

    // Enviar mensagem ao cliente
    socket.emit('message', 'Bem-vindo ao servidor Socket.IO!');

    // Escutar mensagem do cliente
    socket.on('clientMessage', (msg) => {
        console.log('Mensagem do cliente:', msg);
    });

    // Manipulador para desconexão de cliente
    socket.on('disconnect', () => {
        console.log('Um cliente se desconectou');
    });
});


app.post('/sendmessage', async (req, res) => {
    const { newChat } = req.body; // Obtendo a mensagem do corpo da requisição

    if (newChat) {
        io.emit('newChat', newChat);
        console.log('Mensagem enviada para todos os clientes:', newChat);
        res.json({ success: true, newChat: 'Mensagem enviada com sucesso!' });
    } else {
        console.log('Corpo da requisição "newChat" não fornecido.');
        res.status(400).json({ success: false, newChat: 'Corpo da requisição "newChat" não fornecido.' });
    }
});

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed')
            process.exit(1)
        })
    } else {
        process.exit(1)
    }
}

const unexpectedErrorHandler = (error) => {
    logger.error(error)
    exitHandler()
}

process.on('uncaughtException', unexpectedErrorHandler)
process.on('unhandledRejection', unexpectedErrorHandler)

process.on('SIGTERM', () => {
    logger.info('SIGTERM received')
    if (server) {
        server.close()
    }
})

module.exports = {server, io}
