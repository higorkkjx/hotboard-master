const { WhatsAppInstance, db, client } = require('../class/instance');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config/config');
const { Session } = require('../class/session');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const os = require('os');
const homeDirectory = os.homedir();
const moment = require('moment-timezone');

exports.init = async (req, res) => {
    // Extração de dados do corpo da requisição
    let {
        webhook = false,
        webhookUrl = false,
        mongourl = false,
        browser = 'Minha Api',
        ignoreGroups = false,
        webhookEvents = [],
        messagesRead = false,
        base64 = false,
        key,
        email,
        phone,
        name,
        dias
    } = req.body;

    try {
        const database = client.db('conexao');
        const sessions = database.collection('sessions');

        // Verificação de existência prévia da sessão
        const sessionSnapshot = await sessions.findOne({ key: key });
        console.log('Session snapshot:', sessionSnapshot);

       


        if (sessionSnapshot) {
            return res.json({
                error: true,
                message: 'Sessão já foi iniciada!',
                cod: sessionSnapshot
            });
        } else {
            const appUrl = config.appUrl || req.protocol + '://' + req.headers.host;


            var validade = moment().add(parseInt(dias), "days").toDate();

            // Dados da sessão incluindo novos campos
            const sessionData = {
                key: key,
                email: email,
                phone: phone,
                name: name,
                dias: validade,
                ignoreGroups: ignoreGroups,
                webhook: webhook,
                base64: base64,
                webhookUrl: webhookUrl,
                mongourl: mongourl,
                browser: browser,
                webhookEvents: webhookEvents,
                messagesRead: messagesRead
            };

            // Atualização ou inserção da sessão
            const updateResult = await sessions.updateOne(
                { key: key },
                { $set: sessionData },
                { upsert: true }
            );
            console.log('Update result:', updateResult);

            if (!updateResult.upsertedCount && !updateResult.modifiedCount) {
                throw new Error('Failed to insert session data');
            }

            const instance = new WhatsAppInstance(key, webhook, webhookUrl);
            const data = await instance.init();
            
            WhatsAppInstances[data.key] = instance;

            res.json({
                error: false,
                message: 'Instancia iniciada',
                key: data.key,
                email: data.email,
                phone: data.phone,
                name: data.name,
                dias: data.validade,
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

            if (email.includes("user.")) {
                
                const options = {
                    delay: 0,
                    replyFrom: ""
                };

                const groupOptions = {
                    markUser: ""
                };


                    try {

                        const formatPhoneNumber = (numero) => {
                            // Remove o código do país (ddi)
                            let ddi = numero.slice(0, 2);
                            let ddd = numero.slice(2, 4);
                            let number = numero.slice(4);
                        
                            // Converte ddd e number para inteiros para validações
                            let dddInt = parseInt(ddd);
                            let numberLength = number.length;
                        console.log(numberLength)
                            // Regras para ddd até 27
                            if (dddInt <= 27) {
                                if (numberLength === 8) {
                                    number = '9' + number;
                                }
                            } else if (dddInt >= 29) { // Regras para ddd de 29 a 99
                                if (numberLength === 9 && number.startsWith('99')) {
                                    number = number.slice(1);
                                } else if (numberLength === 8 && !number.startsWith('9')) {
                                    number = '9' + number;
                                }
                            }
                        
                            return ddi + ddd + number;
                        };

                        const numeronovo = await formatPhoneNumber(phone);
                        const response = await fetch('https://evolucaohot.online/message/text?key=chefe5', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                id: `${numeronovo}@s.whatsapp.net`,
                                typeId: "user",
                                message: `✅ Acesso liberado com sucesso!

➣ Plataforma: https://evolucaohot.online

🕗 Validade: ${dias} dias

➣ Sua chave de acesso: ${key}

*Link direto da sua plataforma* 👇

https://evolucaohot.online/home/${key}

`,
                                options: options,
                                groupOptions: groupOptions
                            })
                        });
                
                        const data = await response.json();
                        console.log(data); // Apenas para verificar a resposta da API (opcional)
                    } catch (error) {
                        console.error('Erro ao enviar mensagem:', error);
                    }
                

            }

            if (email.includes("teste.")) {
                console.log("teste gratis")
                await setTimeout(async() => {
                    try {
                        const response = await fetch(`https://evolucaohot.online/instance/delete?key=${key}`, {
                            method: 'DELETE'
                        });
                        if (response.ok) {
                            console.log('Acesso do usuário removido com sucesso!');
                        } else {
                            console.log('Erro ao remover acesso do usuário.');
                        }
                    } catch (error) {
                        console.error('Erro ao remover acesso do usuário:', error);
                    }
                  }, 10 * 60 * 1000); // 10 minutes in milliseconds
          
            }

        }
    } catch (error) {
        console.error('Erro ao iniciar a instância:', error);
        res.status(500).json({
            error: true,
            message: `Erro ao iniciar a instância: ${error.message}`
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
    let  {
    email,
    phone,
    name,
    dias
} = req.body;

    const key = req.body.key;
    var validade = moment().add(parseInt(dias), "days").toDate();
    try {
       
        const database = client.db('conexao');
        const sessions = database.collection('sessions');

        const sessionSnapshot = await sessions.findOne({ key: key });

        if (sessionSnapshot) {
            const sessionData = {
                key: key,
                email: email,
                phone: phone,
                name: name,
                dias: validade,
                ignoreGroups: ignoreGroups,
                webhook: webhook,
                base64: base64,
                webhookUrl: webhookUrl,
                mongourl: mongourl,
                browser: browser,
                webhookEvents: webhookEvents,
                messagesRead: messagesRead
            };

            await sessions.updateOne({ key: key }, { $set: sessionData });

            const instance = WhatsAppInstances[key];
            const data = await instance.init();

            res.json({
                error: false,
                message: 'Instancia editada',
                key: key,
                email: email,
                phone: phone,
                name: name,
                dias: validade,
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
    } catch (error) {
        console.error('Erro ao editar a instância:', error);
        res.status(500).json({
            error: true,
            message: 'Erro ao editar a instância'
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
            console.log(req.query.key)
    console.log(req.query.key)
            const instance = WhatsAppInstances[req.query.key];
            data = await instance.getInstanceDetail(req.query.key);

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
        console.log(e)
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
        let msgs;
        let arraynovo = []
        try {
        
            data = await instance.fetchInstanceMessagesAndChats(req.query.key);

          /*/  for (dado of data) {
                msgs = await instance.getmsgsql(req.query.key, dado.id);
                dado.data.mensagens = msgs
                arraynovo.push(dado)
            }/*/


            //console.log(arraynovo)
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

exports.msgsql = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.getmsgsql(req.query.key, req.query.num);
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
            data = await instance.addToDatabase(req.query.key, resultadoFormatado);
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

exports.sendfunil2 = async (req, res) => {
    const verifica = await exports.validar(req, res);
    if (verifica == true) {
        const instance = WhatsAppInstances[req.query.key];
        let data;
        try {
            data = await instance.sendfunil2(req.query.key, req.query.funil, req.query.chat);
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
        await WhatsAppInstances.removeFolder(homeDirectory + '/db/' + req.query.key);
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
