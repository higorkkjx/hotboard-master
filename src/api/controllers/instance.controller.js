const { WhatsAppInstance } = require('../class/instance');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config/config');
const { Session } = require('../class/session');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.init = async (req, res) => {
    let webhook = req.body.webhook || false;
    let webhookUrl = req.body.webhookUrl || false;
    let mongourl = req.body.mongourl || false;
    let browser = req.body.browser || 'Minha Api';
    let ignoreGroups = req.body.ignoreGroups || false;
    let webhookEvents = req.body.webhookEvents || [];
    let messagesRead = req.body.messagesRead || false;
    let base64 = req.body.base64 || false;

    const key = req.body.key;
    const filePath = path.join('db/sessions.json');

    const data = await fs.readFile(filePath, 'utf-8');
    const sessions = JSON.parse(data);

    const valida = sessions.find(session => session.key === key);
    console.log(key)
console.log(valida)
    if (valida) {
        return res.json({
            error: true,
            message: 'Sessão já foi iniciada.'
        });
    } else {
        const appUrl = config.appUrl || req.protocol + '://' + req.headers.host;

        const filePath = path.join('db/sessions.json');
        const dataSession = await fs.readFile(filePath, 'utf-8');
        const sessions = JSON.parse(dataSession);

        sessions.push({ key: key, ignoreGroups: ignoreGroups, webhook: webhook, base64: base64, webhookUrl: webhookUrl,mongourl: mongourl, browser: browser, webhookEvents: webhookEvents, messagesRead: messagesRead });

        await fs.writeFile(filePath, JSON.stringify(sessions, null, 2), 'utf-8');

        const instance = new WhatsAppInstance(key, webhook, webhookUrl);
        const data = await instance.init();
        WhatsAppInstances[data.key] = instance;
        res.json({
            error: false,
            message: 'Instancia iniciada',
            key: data.key,
            webhook: {
                enabled: webhook,
                webhookUrl: webhookUrl,
                webhookEvents: webhookEvents
            },
            qrcode: {
                url: appUrl + '/instance/qr?key=' + data.key,
            },
            browser: browser,
            messagesRead: messagesRead,
            ignoreGroups: ignoreGroups,
        });
    }
};

exports.editar = async (req, res) => {
    let webhook = req.body.webhook || false;
    let webhookUrl = req.body.webhookUrl || false;
    let mongourl = req.body.mongourl || false;
    let browser = req.body.browser || 'Minha Api';
    let ignoreGroups = req.body.ignoreGroups || false;
    let webhookEvents = req.body.webhookEvents || [];
    let messagesRead = req.body.messagesRead || false;
    let base64 = req.body.base64 || false;

    const key = req.body.key;
    const filePath = path.join('db/sessions.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const sessions = JSON.parse(data);
    const index = sessions.findIndex(session => session.key === key);

    if (index !== -1) {
        sessions[index] = { key, ignoreGroups, webhook, base64, webhookUrl,mongourl, browser, webhookEvents, messagesRead, ignoreGroups };
        await fs.writeFile(filePath, JSON.stringify(sessions, null, 2), 'utf-8');

        const instance = WhatsAppInstances[key];
        const data = await instance.init();
        res.json({
            error: false,
            message: 'Instancia editada',
            key: key,
            webhook: {
                enabled: webhook,
                webhookUrl: webhookUrl,
                webhookEvents: webhookEvents
            },
            browser: browser,
            messagesRead: messagesRead,
            ignoreGroups: ignoreGroups,
        });
    } else {
        return res.json({
            error: true,
            message: 'Sessão não localizada.'
        });
    }
};

exports.getcode = async (req, res) => {
    try {
        if (!req.body.number) {
            return res.json({
                error: true,
                message: 'Numero de telefone inválido'
            });
        } else {
            const instance = WhatsAppInstances[req.query.key];
            data = await instance.getInstanceDetail(req.body.key);

            if (data.phone_connected === true) {
                return res.json({
                    error: true,
                    message: 'Telefone já conectado'
                });
            } else {
                const number = await WhatsAppInstances[req.query.key].getWhatsappCode(req.body.number);
                const code = await WhatsAppInstances[req.query.key].instance?.sock?.requestPairingCode(number);
                return res.json({
                    error: false,
                    code: code
                });
            }
        }
    } catch (e) {
        return res.json({
            error: true,
            message: 'instância não localizada'
        });
    }
};

exports.ativas = async (req, res) => {
    if (req.query.active) {
        let instance = [];
        const db = mongoClient.db('whatsapp-api');
        const result = await db.listCollections().toArray();
        result.forEach((collection) => {
            instance.push(collection.name);
        });

        return res.json({
            data: instance
        });
    }

    let instance = Object.keys(WhatsAppInstances).map(async (key) =>
        WhatsAppInstances[key].getInstanceDetail(key)
    );
    let data = await Promise.all(instance);

    return {
        data: data
    };
};





exports.qr = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.getInstanceDetail(req.query.key);
        } catch (error) {
            data = {};
        }
        if (data.phone_connected === true) {
            return res.json({
                error: true,
                message: 'Telefone já conectado'
            });
        } else {
            try {
                const qrcode = await WhatsAppInstances[req.query.key]?.instance.qr;
                res.render('qrcode', {
                    qrcode: qrcode,
                });
            } catch {
                res.json({
                    qrcode: '',
                });
            }
        }
    } else {
        return res.json({
            error: true,
            message: 'Instâcncia não existente'
        });
    }
};

exports.qrbase64 = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.getInstanceDetail(req.query.key);
        } catch (error) {
            data = {};
        }
        if (data.phone_connected === true) {
            return res.json({
                error: true,
                message: 'Telefone já conectado'
            });
        } else {
            try {
                const qrcode = await WhatsAppInstances[req.query.key]?.instance.qr;
                res.json({
                    error: false,
                    message: 'QR Base64 fetched successfully',
                    qrcode: qrcode,
                });
            } catch {
                res.json({
                    qrcode: '',
                });
            }
        }
    } else {
        return res.json({
            error: true,
            message: 'Instâcncia não existente'
        });
    }
};

exports.validar = async (req, res) => {
    const verifica = await exports.ativas(req, res);
    const existe = verifica.data.some(item => item.instance_key === req.query.key);
    if (existe) {
        return true;
    } else {
        return false;
    }
};

exports.info = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.getInstanceDetail(req.query.key);
        } catch (error) {
            data = {};
        }
        return res.json({
            error: false,
            message: 'Instance fetched successfully',
            instance_data: data,
        });
    } else {
        return res.json({
            error: true,
            message: 'Instâcncia não existente'
        });
    }
};

exports.info = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.getInstanceDetail(req.query.key);
        } catch (error) {
            data = {};
        }
        return res.json({
            error: false,
            message: 'Instance fetched successfully',
            instance_data: data,
        });
    } else {
        return res.json({
            error: true,
            message: 'Instâcncia não existente'
        });
    }
};

exports.gchats = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.fetchInstanceMessagesAndChats(req.query.key);
            console.log(data)
        } catch (error) {
            data = {};
        }
        return res.json(data);
    } else {
        return res.json({
            error: true,
            message: 'Instâcncia não existente'
        });
    }
};

exports.addmail = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.salvarEmail(req.query.key, req.query.email);
            console.log(data)
        } catch (error) {
            data = {};
        }
        return res.json({sucess: data});
    } else {
        return res.json({
            error: true,
            message: 'erro ao add email'
        });
    }
};

exports.getmail = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.obterEmail(req.query.key);
            console.log(data)
        } catch (error) {
            data = {};
        }
        return res.json({email: data});
    } else {
        return res.json({
            error: true,
            message: 'erro ao obter email'
        });
    }
};

//typebot funis 

exports.addtofirestore = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            const resultadoFormatado = req.body;
            data = await instance.addToFirestore(req.query.key, resultadoFormatado);
            console.log(data)
        } catch (error) {
            data = {};
        }
        return res.json(data);
    } else {
        return res.json({
            error: true,
            message: 'erro ao salvar dados'
        });
    }
};

exports.displayllfunis = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.displayAllFunis(req.query.key);
            console.log(data)
        } catch (error) {
            data = {};
        }
        return res.json(data);
    } else {
        return res.json({
            error: true,
            message: 'erro ao listar dados'
        });
    }
};

exports.sendfunil = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.sendfunil(req.query.key, req.query.funil, req.query.chat, req.query.visuunica);
            console.log(data)
        } catch (error) {
            data = {};
        }
        return res.json(data);
    } else {
        return res.json({
            error: true,
            message: 'erro ao enviar dados'
        });
    }
};


exports.deletefunil = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.deleteFunilByFunilName(req.query.key, req.query.nome);
            console.log(data)
        } catch (error) {
            data = {};
        }
       return res.json({ funil: req.query.nome, status: "deletado" });
    } else {
        return res.json({
            error: true,
            message: 'erro ao deletar dados'
        });
    }
};

exports.gerargp = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.gerargrupo(req.query.key);
            console.log(data)
        } catch (error) {
            data = {};
        }
       return res.json(data);
    } else {
        return res.json({
            error: true,
            message: 'erro ao gerar gp'
        });
    }
};


// ---------------------------------//

exports.gconfig = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.getconfig(req.query.key);
            console.log(data)
        } catch (error) {
            data = {};
        }
        return res.json(data);
    } else {
        return res.json({
            error: true,
            message: 'dados não existente'
        });
    }
};

exports.editconfig = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let mensagem;
        try {
            const dados = {
                idgrupo: req.body.idgrupo || '',
                conecao: req.body.conecao || '',
                nomeapp: req.body.nomeapp || '',
                heroku_key: req.body.heroku_key || '',
                telebot: req.body.telebot || '',
                idvozeleven: req.body.idvozeleven || '',
                elevenkey: req.body.elevenkey || '',
                beekey: req.body.beekey || ''
              };
          
               mensagem = await instance.salvarDados(req.query.key, dados);
             
           
        } catch (error) {
            console.log(error)
            mensagem = "err"
        }
        return res.status(200).json({ message: mensagem });
    } else {
        return res.json({
            error: true,
            message: 'Erro ao editar/salvar dados'
        });
    }
};

exports.gchatsById = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.fetchInstanceMessagesAndChats(req.query.key);
            const filteredChats = data.filter(chat => chat.id === req.query.id);
            if (filteredChats.length > 0) {
                return res.json(filteredChats);
            } else {
                return res.json({
                    error: true,
                    message: 'ID de chat não encontrado',
                });
            }
        } catch (error) {
            return res.json({
                error: true,
                message: 'Erro ao obter chats',
            });
        }
    } else {
        return res.json({
            error: true,
            message: 'Instância não existente'
        });
    }
};


exports.restore = async (req, res, next) => {
    try {
        let instance = Object.keys(WhatsAppInstances).map(async (key) =>
            WhatsAppInstances[key].getInstanceDetail(key)
        );
        let data = await Promise.all(instance);

        if (data.length > 0) {
            return res.json({
                error: false,
                message: 'All instances restored',
                data: data,
            });
        } else {
            const session = new Session();
            let restoredSessions = await session.restoreSessions();

            return res.json({
                error: false,
                message: 'All instances restored',
                data: restoredSessions,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.logout = async (req, res) => {
    let errormsg;
    try {
        await WhatsAppInstances[req.query.key].instance?.sock?.logout();
        await WhatsAppInstances.removeFolder('db/' + req.query.key);
        await WhatsAppInstances.init();
    } catch (error) {
        errormsg = error;
    }
    return res.json({
        error: false,
        message: 'logout successfull',
        errormsg: errormsg ? errormsg : null,
    });
};

exports.delete = async (req, res) => {
    let errormsg;
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        try {
            await WhatsAppInstances[req.query.key].deleteInstance(req.query.key);
            delete WhatsAppInstances[req.query.key];
        } catch (error) {
            errormsg = error;
        }
        return res.json({
            error: false,
            message: 'Instance deleted successfully',
            data: errormsg ? errormsg : null,
        });
    } else {
        return res.json({
            error: false,
            message: 'Instance deleted successfully',
            data: errormsg ? errormsg : null,
        });
    }
};

exports.list = async (req, res) => {
    let instance = Object.keys(WhatsAppInstances).map(async (key) =>
        WhatsAppInstances[key].getInstanceDetail(key)
    );
    let data = await Promise.all(instance);
    return res.json({
        error: false,
        message: 'All instance listed',
        data: data,
    });
};

exports.deleteInactives = async (req, res) => {
    let instance = Object.keys(WhatsAppInstances).map(async (key) =>
        WhatsAppInstances[key].getInstanceDetail(key)
    );
    let data = await Promise.all(instance);
    const deletePromises = [];
    for (const instance of data) {
        if (instance.phone_connected === undefined || instance.phone_connected === false) {
            const deletePromise = WhatsAppInstances[instance.instance_key].deleteInstance(instance.instance_key);
            delete WhatsAppInstances[instance.instance_key];
            deletePromises.push(deletePromise);
        }
        await sleep(150);
    }
    await Promise.all(deletePromises);
    return res.json({
        error: false,
        message: 'All inactive sessions deleted',
    });
};

exports.deleteAll = async (req, res) => {
    let instance = Object.keys(WhatsAppInstances).map(async (key) =>
        WhatsAppInstances[key].getInstanceDetail(key)
    );
    let data = await Promise.all(instance);
    const deletePromises = [];
    for (const instance of data) {
        const deletePromise = WhatsAppInstances[instance.instance_key].deleteInstance(instance.instance_key);
        delete WhatsAppInstances[instance.instance_key];
        deletePromises.push(deletePromise);
        await sleep(150);
    }
    await Promise.all(deletePromises);
    return res.json({
        error: false,
        message: 'All sessions deleted',
    });
};
