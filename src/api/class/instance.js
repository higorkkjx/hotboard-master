const ffmpegPath = require('@ffmpeg-installer/ffmpeg');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const QRCode = require('qrcode');
const pino = require('pino');
const { promisify } = require('util');
const cach = require('node-cache');
const msgRetryCounterCache = new cach();
const admin = require('firebase-admin');
const cheerio = require("cheerio")
const colors = require('colors');
const urlapi = process.env.urlapi
const {server} = require("../../config/express")
const io = require('../../config/public/assets/socket.io/dist')(server);

/*/
const serviceAccount = require('./firekey.json'); // Caminho para o arquivo de credenciais do Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://hotboard-fa1b8-default-rtdb.firebaseio.com/' // URL do seu projeto do Firebase Realtime Database
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });/*/

const db = "aa"

const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://alancalhares123:senha123@cluster0.sgubjmv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, maxPoolSize: 50 });
client.connect();

let intervalStore = [];

const {
    makeWASocket,
    DisconnectReason,
    isJidUser,
    isJidGroup,
    makeInMemoryStore,
    proto,
    delay,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    getDevice,
    GroupMetadata,
    MessageUpsertType,
    ParticipantAction,
    generateWAMessageFromContent,
    WASocket
} = require('@whiskeysockets/baileys');

const { unlinkSync } = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const processButton = require('../helper/processbtn');
const generateVC = require('../helper/genVc');
const axios = require('axios');
const config = require('../../config/config');
const downloadMessage = require('../helper/downloadMsg');
const dados = makeInMemoryStore({ pino });
const fs = require('fs').promises;
const getMIMEType = require('mime-types');
const readFileAsync = promisify(fs.readFile);
const util = require('util');
const url = require('url');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const os = require('os');
const homeDirectory = os.homedir();


dados.readFromFile(`${homeDirectory}/db/mensagens.json`);

setInterval(() => {
    dados.writeToFile(`${homeDirectory}/db/mensagens.json`);
}, 7200000);



class WhatsAppInstance {
socketConfig = {
    defaultQueryTimeoutMs: undefined,
    printQRInTerminal: false,
    logger: pino({
        level: config.log.level,
    }),

    // markOnlineOnConnect: false
    msgRetryCounterCache: msgRetryCounterCache,
    getMessage: (key) => {
        return (dados.loadMessage(key.remoteJid, key.id))?.message || undefined;
    },
    patchMessageBeforeSending: (msg) => {
        if (msg.deviceSentMessage?.message?.listMessage?.listType == proto.Message.ListMessage.ListType.PRODUCT_LIST) {
            msg = JSON.parse(JSON.stringify(msg));
            msg.deviceSentMessage.message.listMessage.listType = proto.Message.ListMessage.ListType.SINGLE_SELECT;
        }

        if (msg.listMessage?.listType == proto.Message.ListMessage.ListType.PRODUCT_LIST) {
            msg = JSON.parse(JSON.stringify(msg));
            msg.listMessage.listType = proto.Message.ListMessage.ListType.SINGLE_SELECT;
        }

        const requiresPatch = !!(msg.buttonsMessage || msg.listMessage || msg.templateMessage);
        if (requiresPatch) {
            msg = {
                viewOnceMessageV2: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadataVersion: 2,
                            deviceListMetadata: {},
                        },
                        ...msg,
                    },
                },
            };
        }

        return msg;
    },
};

key = '';
authState;
allowWebhook = undefined;
webhook = undefined;

instance = {
    key: this.key,
    chats: [],
    contacts: [],
    qr: '',
    messages: [],
    qrRetry: 0,
    customWebhook: '',
    WAPresence: [],
    deleted: false,
};

axiosInstance = axios.create({
    baseURL: config.webhookUrl,
});

constructor(key, allowWebhook, webhook) {
    this.key = key ? key : uuidv4();
    this.Chat = null;
    this.instance.customWebhook = this.webhook ? this.webhook : webhook;
    this.allowWebhook = config.webhookEnabled ? config.webhookEnabled : allowWebhook;

    if (this.allowWebhook && this.instance.customWebhook !== null) {
        this.allowWebhook = true;
        this.instance.customWebhook = webhook;
        this.axiosInstance = axios.create({
            baseURL: webhook,
        });
    }
}

async geraThumb(videoPath) {
    const name = uuidv4();
    const tempDir = 'temp';
    const thumbPath = 'temp/' + name + 'thumb.png';

    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    const base64 = base64Regex.test(videoPath);

    try {
        let videoBuffer;
        let videoTempPath;

        if (videoPath.startsWith('http')) {
            const response = await axios.get(videoPath, { responseType: 'arraybuffer' });
            videoTempPath = path.join(tempDir, name + '.mp4');
            videoBuffer = Buffer.from(response.data);
            await fs.writeFile(videoTempPath, videoBuffer);
        } else if (base64 === true) {
            videoTempPath = path.join(tempDir, 'temp/' + name + '.mp4');
            const buffer = Buffer.from(videoPath, 'base64');
            await fs.writeFile(videoTempPath, buffer);
        } else {
            videoTempPath = videoPath;
        }

        const command = `ffmpeg -i ${videoTempPath} -ss 00:00:01 -vframes 1 ${thumbPath}`;
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        const thumbContent = await fs.readFile(thumbPath, { encoding: 'base64' });

        await Promise.all([fs.unlink(videoTempPath), fs.unlink(thumbPath)]);

        return thumbContent;
    } catch (error) {
        console.log(error);
    }
}

async thumbURL(url) {
    const videoUrl = url;
    try {
        const thumbContentFromUrl = await this.geraThumb(videoUrl);
        return thumbContentFromUrl;
    } catch (error) {
        console.log(error);
    }
}

async thumbBUFFER(buffer) {
    try {
        const thumbContentFromBuffer = await this.geraThumb(buffer);
        return thumbContentFromBuffer;
    } catch (error) {
        console.log(error);
    }
}

async thumbBase64(buffer) {
    try {
        const thumbContentFromBuffer = await this.geraThumb(buffer);
        return thumbContentFromBuffer;
    } catch (error) {
        console.log(error);
    }
}

async convertMP3(audioSource) {
    try {
        const return_mp3 = await this.mp3(audioSource);
        return return_mp3;
    } catch (error) {
        console.log(error);
    }
}

async mp3(audioSource) {
    const name = uuidv4();
    try {
        const mp3_temp = 'temp/' + name + '.mp3';
        const command = `ffmpeg -i ${audioSource} -acodec libmp3lame -ab 128k ${mp3_temp}`;
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        const audioContent = await fs.readFile(mp3_temp, { encoding: 'base64' });

        await Promise.all([fs.unlink(mp3_temp), fs.unlink(audioSource)]);

        return audioContent;
    } catch (error) {
        console.log(error);
    }
}
					   
					   
async convertToMP4(audioSource) {
	 const name = uuidv4();
  try {
    let audioBuffer;
    if (Buffer.isBuffer(audioSource)) {
      audioBuffer = audioSource;
    } else if (audioSource.startsWith('http')) {
      const response = await fetch(audioSource);
      audioBuffer = await response.buffer();
    } else if (audioSource.startsWith('data:audio')) {
      const base64DataIndex = audioSource.indexOf(',');
      if (base64DataIndex !== -1) {
        const base64Data = audioSource.slice(base64DataIndex + 1);
        audioBuffer = Buffer.from(base64Data, 'base64');
      }
    } else {
      audioBuffer = audioSource;
    }

    const tempOutputFile = `temp/temp_output_${name}.opus`;
    const mp3_temp = 'temp/' + name + '.mp3';

    const ffmpegCommand = `ffmpeg -i "${mp3_temp}" -c:a libopus -b:a 128k -ac 1 "${tempOutputFile}"`;

    await fs.writeFile(mp3_temp, Buffer.from(audioBuffer));

    await new Promise((resolve, reject) => {
      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    fs.unlink(mp3_temp);

    return tempOutputFile;
  } catch (error) {
    throw error;
  }
}

async convertTovideoMP4(videoSource) {
  const name = uuidv4();
  try {
    let videoBuffer;

    if (Buffer.isBuffer(videoSource)) {
      videoBuffer = videoSource;
    } else if (videoSource.startsWith('http')) {
      const response = await fetch(videoSource);
      videoBuffer = await response.buffer();
    } else if (videoSource.startsWith('data:video')) {
      const base64DataIndex = videoSource.indexOf(',');
      if (base64DataIndex !== -1) {
        const base64Data = videoSource.slice(base64DataIndex + 1);
        videoBuffer = Buffer.from(base64Data, 'base64');
      }
    } else {
      videoBuffer = videoSource;
    }

    const tempOutputFile = `temp/temp_output_${name}.mp4`;
    const mp4 = 'temp/' + name + '.mp4';

    const ffmpegCommand = `ffmpeg -i "${mp4}" -c:v libx264 -c:a aac -strict experimental -b:a 192k -movflags faststart -f mp4 "${tempOutputFile}"`;

    await fs.writeFile(mp4, Buffer.from(videoBuffer));

    await new Promise((resolve, reject) => {
      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    fs.unlink(mp4);

    return tempOutputFile;
  } catch (error) {
    throw error;
  }
}

async getMimeTypeFromBase64(base64String) {
  return new Promise((resolve, reject) => {
    try {
      const header = base64String.substring(0, base64String.indexOf(','));
      const match = header.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);

      if (match && match[1]) {
        resolve(match[1]);
      } else {
        reject(new Error('Tipo MIME não pôde ser determinado.'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

async getBufferFromMP4File(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async getFileNameFromUrl(url) {
  try {
    const pathArray = new URL(url).pathname.split('/');
    const fileName = pathArray[pathArray.length - 1];
    return fileName;
  } catch (error) {
    throw error;
  }
}



async dataBase() {
    try {
        return await useMultiFileAuthState(homeDirectory + '/db/' + this.key);
    } catch (error) {
        console.log('Falha ao atualizar a base de dados');
    }
}

async SendWebhook(type, hook, body, key) {
    if (this.instance.webhok === false) {
        return;
    } else {
        const webhook_url = this.instance.webhook_url;
        const events = this.instance.webhook_events;

        const hasMessagesSet = events.includes(hook);

        if (hasMessagesSet === true) {
            this.web = axios.create({
                baseURL: this.instance.webhook_url,
            });
            this.web
                .post('', {
                    type,
                    body,
                    instanceKey: key,
                })
                .catch((e) => {});
        }
    }
}

async instanceFind(key) {
    
    const database = client.db('conexao');
    const sessions = database.collection('sessions');

    const sessionSnapshot = await sessions.findOne({ key: key });

    if (!sessionSnapshot) {
        const data = {
            "key": false,
            "browser": false,
            "webhook": false,
            "base64": false,
            "webhookUrl": false,
            "mongourl": false,
            "webhookEvents": false,
            "messagesRead": false,
        };
        return data;
    } else {
        return sessionSnapshot;
    }
}

async init() {
    const ver = await fetchLatestBaileysVersion();

    
    const database = client.db('conexao');
    const sessions = database.collection('sessions');

    const sessionSnapshot = await sessions.findOne({ key: this.key });

    if (!sessionSnapshot) {
        return;
    }
    const existingSession = sessionSnapshot;

    const { state, saveCreds, keys } = await this.dataBase();
    this.authState = {
        state: state,
        saveCreds: saveCreds,
        keys: makeCacheableSignalKeyStore(keys, this.logger),
    };

    let b;
    let ignoreGroup;

    if (existingSession) {
        b = {
            browser: {
                platform: existingSession.browser,
                browser: 'Chrome',
                version: '20.0.04',
            },
        };
        ignoreGroup = existingSession.ignoreGroups;
        this.instance.mark = existingSession.messagesRead;
        this.instance.webhook = existingSession.webhook;
        this.instance.webhook_url = existingSession.webhookUrl;
        this.instance.mongourl = existingSession.mongourl;
        this.instance.webhook_events = existingSession.webhookEvents;
    } else {
        b = {
            browser: {
                platform: 'Chrome (Linux)',
                browser: 'chrome',
                version: '22.5.0',
            },
        };
        ignoreGroup = false;
        this.instance.mark = false;
        this.instance.webhook = false;
        this.instance.webhook_url = false;
        this.instance.mongourl = false;
        this.instance.webhook_events = false;
    }

    this.socketConfig.auth = this.authState.state;
    if (ignoreGroup === true) {
        this.socketConfig.shouldIgnoreJid = (jid) => !isJidUser(jid);
    } else {
        this.socketConfig.shouldIgnoreJid = (jid) => false;
    }
    this.socketConfig.version = [2, 2413, 1];
    this.socketConfig.browser = Object.values(b.browser);

    this.instance.sock = makeWASocket(this.socketConfig);

    dados?.bind(this.instance.sock?.ev);

    this.setHandler();
    return this;
}

setHandler() {
    const sock = this.instance.sock;

    sock?.ev.on('creds.update', this.authState.saveCreds);

    sock?.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const status = lastDisconnect?.error?.output?.statusCode;

        if (connection === 'connecting') return;

        if (connection === 'close') {
            if (status === DisconnectReason.loggedOut || status === 405 || status === 402 || status === 403) {
                await this.deleteFolder(homeDirectory + '/db/' + this.key);
                await delay(1000);
                this.instance.online = false;
                await this.init();
            } else if (status === 440) {
                return;
            } else {
                await this.init();
            }

            await this.SendWebhook('connection', 'connection.update', {
                connection: connection,
                connection_code: lastDisconnect?.error?.output?.statusCode
            }, this.key);
        } else if (connection === 'open') {
            this.instance.online = true;
            await this.SendWebhook('connection', 'connection.update', {
                connection: connection,
            }, this.key);
        }

        if (qr) {
            QRCode.toDataURL(qr).then((url) => {
                this.instance.qr = url;
            });
            await this.SendWebhook('qrCode', 'qrCode.update', {
                qr: qr,
            }, this.key);
        }
    });

    // sending presence
    sock?.ev.on('presence.update', async (json) => {
        await this.SendWebhook('presence', 'presence.update', json, this.key);
    });

    sock?.ev.on('contacts.upsert', async (contacts) => {
        let folderPath;
        let filePath;
        try {
            const folderPath = homeDirectory + '/db/' + this.key;

            const filePath = path.join(folderPath, 'contacts.json');
            await fs.access(folderPath);

            const currentContent = await fs.readFile(filePath, 'utf-8');
            const existingContacts = JSON.parse(currentContent);

            contacts.forEach((contact) => {
                const existingContactIndex = existingContacts.findIndex(
                    (c) => c.id === contact.id
                );

                if (existingContactIndex !== -1) {
                    existingContacts[existingContactIndex] = contact;
                } else {
                    existingContacts.push(contact);
                }
            });

            await fs.writeFile(filePath, JSON.stringify(existingContacts, null, 2), 'utf-8');

            await this.SendWebhook('contacts', 'contacts.upsert', contacts, this.key);
        } catch (error) {
            const folderPath = homeDirectory + '/db/' + this.key;

            const filePath = path.join(folderPath, 'contacts.json');
            await fs.mkdir(folderPath, { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(contacts, null, 2), 'utf-8');
        }
    });

    sock?.ev.on('chats.upsert', async (newChat) => {
        try {
            await this.SendWebhook('chats', 'chats.upsert', newChat, this.key);
        } catch (e) {
            return;
        }
    });

    sock?.ev.on('chats.delete', async (deletedChats) => {
        try {
            await this.SendWebhook('chats', 'chats.delete', deletedChats, this.key);
        } catch (e) {
            return;
        }
    });

    sock?.ev.on('messages.update', async (m) => {
        try {
            await this.SendWebhook('updateMessage', 'messages.update', m, this.key);
        } catch (e) {
            return;
        }
    });


   
    
 
    // on new mssage
    sock?.ev.on('messages.upsert', async (m) => {
        if (m.type === 'prepend') this.instance.messages.unshift(...m.messages);
        if (m.type !== 'notify') return;
       

//console.log(messageType2)
const autoresp_config = await axios.get(`http://localhost:3000/autoresposta/dados/${this.key}/${m.messages[0].key.remoteJid.replace("@s.whatsapp.net", "")}`)       
const autoresp = autoresp_config.data.autoresposta
const funilselecionado = autoresp_config.data.funil

console.log(`CHAVE: ${this.key}`)
console.log(`Autoresposta: ${autoresp}/funil: ${funilselecionado}`)    

const isGroup = await m.messages[0].key.remoteJid.includes("@g.us")
console.log("GRUPO?", isGroup)
       try {
                  const sessaoInfo = await this.getInstanceDetail(this.key)

                  const moment = require('moment-timezone');
                  function getCurrentDateTime() {
                    const now = moment().tz('America/Sao_Paulo');
                    
                    const year = now.year().toString();
                    const month = (now.month() + 1).toString().padStart(2, "0");
                    const day = now.date().toString().padStart(2, "0");
                    const hours = now.hours().toString().padStart(2, "0");
                    const minutes = now.minutes().toString().padStart(2, "0");
                    
                    return `${year}-${month}-${day} ${hours}:${minutes}`;
                  }
              
              const checkAndAddChat = async (sender, pushname, body, fromme, gppessoanome) => {
                try {
                   
                    const database = client.db('perfil');
                    const chatCollection = database.collection(`conversas2_${this.key}`);
            
                    const chatDoc = await chatCollection.findOne({ _id: sender });
            
                    if (chatDoc) {
                        const currentDateTime = getCurrentDateTime();
                        const newMessage = `${currentDateTime} - ${pushname}: ${body}`;
                        try {
                            chatDoc.mensagens.push(newMessage);
                        } catch(e) {
                            console.log("erro ao salvar msg")
                            chatDoc.mensagens.push(`${currentDateTime} - ${pushname}: [MENSAGEM INDISPONIVEL]`);
                        }
                      
            
                        if (!fromme) {
                            console.log("> Salvando atualização de nome!");
                            chatDoc.nome = pushname;
                        }
            
                        await chatCollection.updateOne(
                            { _id: sender },
                            { $set: chatDoc }
                        );
                        console.log('> Mensagem adicionada ao chat existente.');
                        return false;
                    }
            
                    console.log("Chat não existe");
            
                    let stringname = pushname;
                    if (fromme) {
                        console.log("> Eu que enviei a mensagem primeiro!");
                        stringname = sender.replace("@s.whatsapp.net", "").replace("@g.us", "");
                    }
            
                    let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
                    const profileResponse = await fetch(`http://localhost:3000/misc/downProfile?key=${this.key}`, {
                        method: 'POST',
                        body: JSON.stringify({ id: sender.replace("@s.whatsapp.net", "") }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const profileData = await profileResponse.json();
                    if (profileData.error === false) {
                        profileImageUrl = profileData.data;
                    }
            
                    let imagemselecionada;
                    if (sender.includes("@g.us")) {
                        let ppUrl = await this.instance.sock?.profilePictureUrl(sender, 'image');
                        console.log(ppUrl);
                        imagemselecionada = ppUrl;
                    } else {
                        imagemselecionada = profileImageUrl;
                    }
            
                    let nomegpOrpeople;
                    if (sender.includes("@g.us")) {
                        nomegpOrpeople = gppessoanome
                    } else {
                        nomegpOrpeople = pushname
                    }

                    const newChatData = {
                        _id: sender,
                        nome: stringname,
                        mensagens: [`${getCurrentDateTime()} - ${nomegpOrpeople}: ${body}`],
                        estagio: 0,
                        nomePix: 'fulano',
                        imagem: imagemselecionada,
                        enviando: "nao",
                        aguardando: {
                            status: "nao",
                            id: null,
                            resposta: null,
                            inputs_enviados: ["asdasd"],
                        },
                        gpconfig: {
                            antilink: false,
                            autodivu: false,
                            timerdivu: 0,
                            funildivu: null
                        }
                    };
            
                    await chatCollection.insertOne(newChatData);
                    io.emit('new_chat', newChatData);

                    console.log('IDCHAT adicionado à base de dados com uma nova mensagem.');
                    return true;
                } catch (error) {
                    console.error('Erro ao processar o chat:', error);
                    throw error;
                }
            };

           const checkAndAddChat2 = async(sender, pushname, body, fromme, gppessoanome) => {
                try {
                    console.log(`------------------`);

                    
                    const database = client.db('perfil');
                    const chatCollection = database.collection(`conversas2_${this.key}`);
            
                    const existingChat = await chatCollection.findOne({ _id: sender });

                   
                    if (existingChat) {
                        const currentDateTime = getCurrentDateTime();
                        const newMessage = `${currentDateTime} - ${pushname}: ${body}`;
                        existingChat.mensagens.push(newMessage);
            
                        if (!fromme) {
                            console.log("> Salvando atualização de nome!");
                            existingChat.nome = pushname;
                        }
            
                        await chatCollection.updateOne(
                            { _id: sender },
                            { $set: existingChat }
                        );
                        console.log('> Mensagem adicionada ao IDCHAT existente.');
                        return false;
                    }
            
                   
            
                    let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
                    const profileResponse = await fetch(`http://localhost:3000/misc/downProfile?key=${this.key}`, {
                        method: 'POST',
                        body: JSON.stringify({ id: sender.replace("@s.whatsapp.net", "") }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const profileData = await profileResponse.json();
                    if (profileData.error === false) {
                        profileImageUrl = profileData.data;
                    }
            
                    let imagemselecionada;

                    if (sender.includes("@g.us")) {
                        let ppUrl = await this.instance.sock?.profilePictureUrl(sender, 'image');
                        console.log(ppUrl);
                        imagemselecionada = ppUrl;
                    } else {
                        imagemselecionada = profileImageUrl;
                    }
            
            
                    let stringname = pushname;
                    if (fromme) {
                        console.log("> Eu que enviei a mensagem primeiro!");
                        stringname = sender.replace("@s.whatsapp.net", "").replace("@g.us", "");
                    }
            

                    let nomegpOrpeople;
                    if (sender.includes("@g.us")) {
                        nomegpOrpeople = gppessoanome
                    } else {
                        nomegpOrpeople = pushname
                    }

                    const newChatData = {
                        chat: sender,
                        nome: stringname,
                        mensagens: [`${getCurrentDateTime()} - ${nomegpOrpeople}: ${body}`],
                        imagem: imagemselecionada,
                        estagio: 0,
                        nomePix: 'fulano',
                        enviando: "nao",
                        aguardando: {
                            status: "nao",
                            id: null,
                            resposta: null,
                            inputs_enviados: ["0vazio"],
                        },
                        gpconfig: {
                          antilink: false,
                          autodivu: false,
                          timerdivu: 0,
                          funildivu: null
                        }
                    };
            console.log(newChatData)
                    console.log("..");
                    await chatCollection.insertOne(newChatData);

                    console.log("...");
                    console.log('IDCHAT adicionado à base de dados com uma nova mensagem.');
                    return true;
                } catch (error) {
                    console.error('Erro ao processar o chat:', error);
                    throw error;
                }
            }

              if (m.messages[0].key.remoteJid.includes("@g.us")) {

                let mensagem = {}
            
                    if (m.messages[0].message.imageMessage) {
            
            
            const mensagemdow = await downloadMessage(
                m.messages[0].message.imageMessage,
                'image'
            );
            
            mensagem = {
                img: mensagemdow,
                legenda: m.messages[0].message.imageMessage.caption,
            }
            
                    } else  if (m.messages[0].message.extendedTextMessage) {
                        mensagem = {
                           text: m.messages[0].message.extendedTextMessage.text
                        }    
                    }
                
            
                    
            const gpmetadata = await this.instance.sock?.groupMetadata(m.messages[0].key.remoteJid)
           // console.log(gpmetadata)

          

               var dadomsggp = {
                    "type": "group",
                    "chatId": m.messages[0].key.remoteJid,
                    "message": m.messages[0].message.conversation,
                    "sender": m.messages[0].key.participant,
                    pushname: m.messages[0].pushname,
                    fromMe: m.messages[0].key.fromMe,
                    nomegp: gpmetadata.subject,
                    donogp: gpmetadata.subjectOwner,
                    desc: gpmetadata.desc,
                    }
              //  console.log(m.messages[0].message.conversation)
                let conteudomsg;
            
            if(dadomsggp.message) {
                conteudomsg = dadomsggp.message
            } else if(!dadomsggp.message) {
                conteudomsg = "[MEDIA]"
            }

            //console.log(typeof conteudomsg); // "string"
            console.log(
                colors.blue.bold('\nSessão: ') + colors.white(this.key) + '\n' +
                colors.green.bold('Grupo: ') + colors.white(gpmetadata.subject) + '\n' +
                colors.magenta.bold('Chat: ') + colors.white(m.messages[0].key.remoteJid) + '\n' +
                colors.cyan.bold('Mensagem: ') + colors.white(conteudomsg) + "\n"
            );
    
                await checkAndAddChat(dadomsggp.chatId, dadomsggp.nomegp, conteudomsg, dadomsggp.fromMe, dadomsggp.pushname)
            }
            
        this.instance.messages.unshift(...m.messages);

        m.messages.map(async (msg) => {
            if (!msg.message) return;

            if (this.instance.mark === true) {

                await this.lerMensagem(msg.key.id, msg.key.remoteJid);
            }

            const messageType = Object.keys(msg.message)[0];
            if (['protocolMessage', 'senderKeyDistributionMessage'].includes(messageType))
                return;

            const webhookData = {
                key: this.key,
                ...msg,
            };

            if (messageType === 'conversation') {
                //OBTENDO MENSAGENS DOS CHATS
              
               var dadomsg = {
                    sessao: this.key,
                    chat: msg.key.remoteJid,
                    fromMe: msg.key.fromMe,
                    pushname: msg.pushName,
                    budy: msg.message.conversation
                }

                console.log(
                    colors.blue.bold('\nSessão: ') + colors.white(this.key) + '\n' +
                    colors.green.bold('Tipo mensagem: ') + colors.white(messageType) + '\n' +
                    colors.magenta.bold('Chat: ') + colors.white(msg.key.remoteJid) + '\n' +
                    colors.cyan.bold('Mensagem: ') + colors.white(msg.message.conversation) + "\n"
                );


                await checkAndAddChat(dadomsg.chat, dadomsg.pushname, dadomsg.budy, dadomsg.fromMe, dadomsg.pushname)
              
        
                webhookData['text'] = m;
            }

            if (messageType === 'extendedTextMessage') {
                //OBTENDO MENSAGENS DOS CHATS
              
                console.log(
                    colors.blue.bold('\nSessão: ') + colors.white(this.key) + '\n' +
                    colors.green.bold('Tipo mensagem: ') + colors.white(messageType) + '\n' +
                    colors.magenta.bold('Chat: ') + colors.white(msg.key.remoteJid) + '\n' +
                    colors.cyan.bold('Mensagem: ') + colors.white(msg.message.extendedTextMessage.text) + "\n"
                );

               
               var dadomsg = {
                    sessao: this.key,
                    chat: msg.key.remoteJid,
                    fromMe: msg.key.fromMe,
                    pushname: msg.pushName,
                    budy: msg.message.extendedTextMessage.text
                }
            


                await checkAndAddChat(dadomsg.chat, dadomsg.pushname, dadomsg.budy, dadomsg.fromMe, dadomsg.pushname)
              
        
                webhookData['text'] = m;
            }


            if (this.instance.webhook === true) {
                switch (messageType) {
                    case 'imageMessage':
                        webhookData['msgContent'] = await downloadMessage(
                            msg.message.imageMessage,
                            'image'
                        );

                        var dadomsg = {
                            sessao: this.key,
                            chat: msg.key.remoteJid,
                            fromMe: msg.key.fromMe,
                            pushname: msg.pushName,
                            budy: msg.message.conversation
                        }
                        console.log(dadomsg)
        
                        await checkAndAddChat(dadomsg.chat, dadomsg.pushname, "[IMAGEM]", dadomsg.fromMe, dadomsg.pushname)

                        break;
                    case 'videoMessage':
                        const arquivo_video = await downloadMessage(
                            msg.message.videoMessage,
                            'video'
                        );

                        webhookData['msgContent'] = await fs.readFile(arquivo_video, {
                            encoding: 'base64',
                        });

                        webhookData['thumb'] = await this.thumbBase64(arquivo_video);

                        var dadomsg = {
                            sessao: this.key,
                            chat: msg.key.remoteJid,
                            fromMe: msg.key.fromMe,
                            pushname: msg.pushName,
                            budy: msg.message.conversation
                        }
                        console.log(dadomsg)
        
                        await checkAndAddChat(dadomsg.chat, dadomsg.pushname, "[VIDEO]", dadomsg.fromMe, dadomsg.pushname)
                        break;
			case 'audioMessage':
                        const arquivo_audio = await downloadMessage(
                            msg.message.audioMessage,
                            'audio'
                        );
			const convert = await this.mp3(arquivo_audio);
                        webhookData['msgContent'] = convert;

                        var dadomsg = {
                            sessao: this.key,
                            chat: msg.key.remoteJid,
                            fromMe: msg.key.fromMe,
                            pushname: msg.pushName,
                            budy: msg.message.conversation
                        }
                        console.log(dadomsg)
        
                        await checkAndAddChat(dadomsg.chat, dadomsg.pushname, "[AUDIO]", dadomsg.fromMe, dadomsg.pushname)
                        break;
                    case 'documentMessage':
                        webhookData['msgContent'] = await downloadMessage(
                            msg.message.documentMessage,
                            'document'
                        );

                        var dadomsg = {
                            sessao: this.key,
                            chat: msg.key.remoteJid,
                            fromMe: msg.key.fromMe,
                            pushname: msg.pushName,
                            budy: msg.message.conversation
                        }
                        console.log(dadomsg)
        
                        await checkAndAddChat(dadomsg.chat, dadomsg.pushname, "[DOCUMENTO]", dadomsg.fromMe, dadomsg.pushname)
                        break;
                    default:
                        var dadomsg = {
                            sessao: this.key,
                            chat: msg.key.remoteJid,
                            fromMe: msg.key.fromMe,
                            pushname: msg.pushName,
                            budy: msg.message.conversation
                        }
                        console.log(dadomsg)
        
                        await checkAndAddChat(dadomsg.chat, dadomsg.pushname, "[MIDIA]", dadomsg.fromMe, dadomsg.pushname)
                        webhookData['msgContent'] = '';
                        break;
                }
            }

           

             //autoresposta
             try {
                const mensagemuser = m.messages[0].message.conversation;
                const numeroUser = m.messages[0].key.remoteJid;
            
                if (autoresp === true) {
                    if (m.messages[0].key.remoteJid.includes("@g.us")) return; //IGNORANDO GRUPOS
            
                    const repleceado = m.messages[0].key.remoteJid;
                    const configUser = await this.getUser(repleceado);
                    const typebotfunil = await this.findFunilByName(this.key, funilselecionado);
            
                    if (!configUser.inputs_respostas) {
                        configUser.inputs_respostas = [];
                    }
            
                    let contagemFunil = 0;
            
                    if (configUser.aguardando.status === "sim") {
                        const currentFunilStep = typebotfunil.funil.find(step => step.idInput === configUser.aguardando.id);
                        if (currentFunilStep && currentFunilStep.tipoMensagem === "choice") {
                            const userChoice = parseInt(mensagemuser.trim(), 10);
                            if (!isNaN(userChoice) && userChoice > 0 && userChoice <= currentFunilStep.conteudo.opcoes.length) {
                                const selectedOption = currentFunilStep.conteudo.opcoes[userChoice - 1];
                                const selectedResponse = `dinamico_${currentFunilStep.conteudo.respostas[userChoice - 1]}`

                                async function salvarFunil(key, funilSelecionado) {
                                    const url = `http://localhost:3000/api/salvar-funil-user/${key}/${m.messages[0].key.remoteJid.replace("@s.whatsapp.net", "")}`
                                    const data = {
                                      funil: funilSelecionado
                                    };
                                  
                                    try {
                                      const response = await fetch(url, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(data)
                                      });
                                  
                                      if (!response.ok) {
                                        throw new Error(`HTTP error! Status: ${response.status}`);
                                      }
                                  
                                      const result = await response.json();
                                      console.log('Funil salvo com sucesso:', result);
                                    } catch (error) {
                                      console.error('Erro ao salvar o funil:', error);
                                    }
                                  }

                                console.log(`User selected option: ${selectedOption}`);
                                console.log(`Response for selected option: ${selectedResponse}`);
                                console.log(currentFunilStep.conteudo)
                                await salvarFunil(this.key, selectedResponse)

                                configUser.inputs_respostas.push({ input_id: currentFunilStep.idInput, resposta: selectedResponse });
                                configUser.inputs_enviados.push(currentFunilStep.idInput);
                                configUser.aguardando.status = "nao";
                                configUser.aguardando.id = null;
                                await this.instance.sock?.sendMessage(numeroUser, { text: "Ok, me envie qualquer mensagem para confirmar!" });
                                return
                            } else {
                                await this.instance.sock?.sendMessage(numeroUser, { text: "Opção inválida. Tente novamente." });
                                return;
                            }
                        } else {
                            for (const inps of typebotfunil.inputs_respostas) {
                                if (configUser.aguardando.id === inps.input_id) {
                                    inps.resposta = mensagemuser.trim();
            
                                    const existingInput = configUser.inputs_respostas.find(input => input.input_id === inps.input_id);
                                    if (existingInput) {
                                        existingInput.resposta = mensagemuser.trim();
                                    } else {
                                        configUser.inputs_respostas.push({ input_id: inps.input_id, resposta: mensagemuser.trim() });
                                    }
                                    console.log(configUser.inputs_respostas);
                                    configUser.inputs_enviados.push(inps.input_id);
                                    configUser.aguardando.status = "nao";
                                    configUser.aguardando.id = null;
                                }
                            }
                        }
                        await this.updateUser(repleceado, configUser);
                    }
            
                    for (const funil of typebotfunil.funil) {
                        contagemFunil++;
                        configUser.estagio = contagemFunil;
                        await this.updateUser(repleceado, configUser);
            
                        if (configUser.enviando === "sim") {
                            return;
                        }
            
                        switch (funil.tipoMensagem) {
                            case "wait":
                                if (configUser.inputs_enviados.includes(funil.idInput)) continue;
                                configUser.enviando = "sim";
                                configUser.inputs_enviados.push(funil.idInput);
                                await this.updateUser(repleceado, configUser);
                                await sleep(funil.conteudo * 1000);
                                await this.lerMensagem(m.messages[0].key.id, m.messages[0].key.remoteJid);
                                configUser.enviando = "nao";
                                await this.updateUser(repleceado, configUser);
                                break;
                            case "image":
                                if (configUser.inputs_enviados.includes(funil.idInput)) continue;
                                configUser.enviando = "sim";
                                configUser.inputs_enviados.push(funil.idInput);
                                await this.updateUser(repleceado, configUser);
                                await this.instance.sock?.sendMessage(numeroUser, { image: { url: funil.conteudo } });
                                configUser.enviando = "nao";
                                await this.updateUser(repleceado, configUser);
                                break;
                            case "audio":
                                if (configUser.inputs_enviados.includes(funil.idInput)) continue;
                                configUser.enviando = "sim";
                                configUser.inputs_enviados.push(funil.idInput);
                                await this.updateUser(repleceado, configUser);
                                await this.enviarAudio(this.key, funil.conteudo, numeroUser, "usr", 0);
                                configUser.enviando = "nao";
                                await this.updateUser(repleceado, configUser);
                                break;
                            case "video":
                                if (configUser.inputs_enviados.includes(funil.idInput)) continue;
                                configUser.enviando = "sim";
                                configUser.inputs_enviados.push(funil.idInput);
                                await this.updateUser(repleceado, configUser);
                                await this.instance.sock?.sendMessage(numeroUser, { video: { url: funil.conteudo } });
                                configUser.enviando = "nao";
                                await this.updateUser(repleceado, configUser);
                                break;
                            case "input":
                                if (configUser.inputs_enviados.includes(funil.idInput)) continue;
                                configUser.enviando = "sim";
                                await this.updateUser(repleceado, configUser);
                                await this.instance.sock?.sendMessage(numeroUser, { text: funil.conteudo });
                                configUser.aguardando.status = "sim";
                                configUser.aguardando.id = funil.idInput;
                                configUser.enviando = "nao";
                                await this.updateUser(repleceado, configUser);
                                return;
                            case "text":
                                
                                if (configUser.inputs_enviados.includes(funil.idInput)) continue;
                                if (funil.conteudo.includes('[FLUXO]')) continue;
                                configUser.enviando = "sim";
                                await this.updateUser(repleceado, configUser);
                                let conteudoFormatado = funil.conteudo;
                                const varMatches = conteudoFormatado.match(/%var=([^%]+)%/g) || [];
                                for (const varMatch of varMatches) {
                                    const varName = varMatch.replace(/%var=|%/g, '');
                                    const resposta = configUser.inputs_respostas.find(input => input.input_id === varName)?.resposta || '';
                                    conteudoFormatado = conteudoFormatado.replace(varMatch, resposta);
                                }
                                console.log(conteudoFormatado);
            
                                function extrairValorENumero(str) {
                                    const regex = /\[([a-zA-Z]+)\]\[(\d+)\]/;
                                    const match = str.match(regex);
                                    if (match) {
                                        const valor = match[1];
                                        const numero = parseInt(match[2], 10);
                                        return { valor, numero };
                                    } else {
                                        return { error: 'Formato inválido' };
                                    }
                                }
            
                                const resultadopresenca = await extrairValorENumero(conteudoFormatado);
            
                                if (resultadopresenca.error) {
                                    console.log("mensagem de texto...");
                                    console.log(resultadopresenca.error);
                                    await this.instance.sock?.sendMessage(numeroUser, { text: conteudoFormatado });
                                } else {
                                    console.log(resultadopresenca);
                                    if (resultadopresenca.valor == "digitar") {
                                        await this.instance.sock?.sendPresenceUpdate('composing', numeroUser);
                                        await sleep(resultadopresenca.numero * 1000);
                                        console.log(resultadopresenca.numero * 1000);
                                    } else if (resultadopresenca.valor == "gravar") {
                                        await this.instance.sock?.sendPresenceUpdate('recording', numeroUser);
                                        await sleep(resultadopresenca.numero * 1000);
                                    }
                                }
            
                                configUser.inputs_enviados.push(funil.idInput);
                                configUser.enviando = "nao";
                                await this.updateUser(repleceado, configUser);
                                break;
                            case "choice":
                                if (configUser.inputs_enviados.includes(funil.idInput)) continue;
                                configUser.enviando = "sim";
                                await this.updateUser(repleceado, configUser);
                                await this.instance.sock?.sendMessage(numeroUser, { text: funil.conteudo.pergunta });
                                await this.instance.sock?.sendMessage(numeroUser, { text: funil.conteudo.opcoes.join('\n') });
                                configUser.aguardando.status = "sim";
                                configUser.aguardando.id = funil.idInput;
                                configUser.enviando = "nao";
                                await this.updateUser(repleceado, configUser);
                                return;
                            default:
                                break;
                        }
                    }
                }
            } catch (e) {
                console.log(e);
            }
            
            
            
            
                   
            
                    // ---------//

            await this.SendWebhook('message', 'messages.upsert', webhookData, this.key);
            
        });
    } catch(e) {
        console.log(e)
    }
    });

    sock?.ws.on('CB:call', async (data) => {
        try {
            if (data.content) {
                if (data.content.find((e) => e.tag === 'offer')) {
                    const content = data.content.find((e) => e.tag === 'offer');

                    await this.SendWebhook('call_offer', 'call.events', {
                        id: content.attrs['call-id'],
                        timestamp: parseInt(data.attrs.t),
                        user: {
                            id: data.attrs.from,
                            platform: data.attrs.platform,
                            platform_version: data.attrs.version,
                        },
                    }, this.key);
                } else if (data.content.find((e) => e.tag === 'terminate')) {
                    const content = data.content.find((e) => e.tag === 'terminate');

                    await this.SendWebhook('call', 'call.events', {
                        id: content.attrs['call-id'],
                        user: {
                            id: data.attrs.from,
                        },
                        timestamp: parseInt(data.attrs.t),
                        reason: data.content[0].attrs.reason,
                    }, this.key);
                }
            }
        } catch (e) {
            return;
        }
    });

    sock?.ev.on('groups.upsert', async (groupUpsert) => {
        try {
            await this.SendWebhook('updateGroups', 'groups.upsert', {
                data: groupUpsert,
            }, this.key);
        } catch (e) {
            return;
        }
    });

    sock?.ev.on('groups.update', async (groupUpdate) => {
        try {
            await this.SendWebhook('updateGroups', 'groups.update', {
                data: groupUpdate,
            }, this.key);
        } catch (e) {
            return;
        }
    });

    sock?.ev.on('group-participants.update', async (groupParticipants) => {
        try {
            await this.SendWebhook('group-participants', 'group-participants.update', {
                data: groupParticipants,
            }, this.key);
        } catch (e) {
            return;
        }
    });
}

async deleteInstance(key) {
    
    const database = client.db('conexao');
    const sessions = database.collection('sessions');

    const sessionSnapshot = await sessions.findOne({ key: key });

    if (!sessionSnapshot) {
        return {
            error: true,
            message: 'Sessão não localizada',
        };
    }

    try {
        await sessions.deleteOne({ _id: sessionSnapshot._id });

        if (this.instance.online === true) {
            this.instance.deleted = true;
            await this.instance.sock?.logout();
        } else {
            await this.deleteFolder(homeDirectory + '/db/' + this.key);
        }
    } catch (error) {
        console.log('Erro ao excluir a sessão:', error);
        return {
            error: true,
            message: 'Erro ao excluir a sessão',
        };
    }
}

async getInstanceDetail(key) {
    let connect = this.instance?.online;

    if (connect !== true) {
        connect = false;
    }
    const sessionData = await this.instanceFind(key);
    return {
        instance_key: key,
        phone_connected: connect,
        browser: sessionData.browser,
        webhook: sessionData.webhook,
        base64: sessionData.base64,
        webhookUrl: sessionData.webhookUrl,
        mongourl: sessionData.mongourl,
        webhookEvents: sessionData.webhookEvents,
        messagesRead: sessionData.messagesRead,
        ignoreGroups: sessionData.ignoreGroups,
        user: this.instance?.online ? this.instance.sock?.user : {},
    };
}
getWhatsappCode(id)
	{
 if (id.startsWith('55')) {
        const numero = id.slice(2);
        const ddd = numero.slice(0, 2);
        let n;

        const indice = numero.indexOf('@');

        if (indice >= 1) {
            n = numero.slice(0, indice);
        } else {
            n = numero;
        }

        const comprimentoSemDDD = n.slice(2).length;
      
        if (comprimentoSemDDD < 8) {
            throw new Error('no account exists!');
        } else if (comprimentoSemDDD > 9) {
            throw new Error('no account exists.');
        } else if (parseInt(ddd) <= 27 && comprimentoSemDDD < 9) {
            let novoNumero = n.substring(0, 2) + '9' + n.substring(2);
            id = '55' + novoNumero;
        } else if (parseInt(ddd) > 27 && comprimentoSemDDD > 8) {
            let novoNumero = n.substring(0, 2) + n.substring(3);
            id = '55' + novoNumero;
        }
	
	 return id;
    }
		else
 {
	return id;
 }
	}
getWhatsAppId(id) {
id  = id.replace(/\D/g, "");
if (id.includes('@g.us') || id.includes('@s.whatsapp.net')) return id;
return id.includes('-') ? `${id}@g.us` : `${id}@s.whatsapp.net`;
}

getWhatsAppId2(id) {
    if (id.includes('@g.us')) return id
    if (id.includes('@s.whatsapp.net')) return id
    return id + '@s.whatsapp.net'
    }


getGroupId(id) {
    if (id.includes('@g.us') || id.includes('@g.us')) return id;
    return id.includes('-') ? `${id}@g.us` : `${id}@g.us`;
}

async deleteFolder(folder) {
    try {
        const folderPath = await path.join(folder);

        const folderExists = await fs.access(folderPath).then(() => true).catch(() => false);

        if (folderExists) {
            const files = await fs.readdir(folderPath);

            for (const file of files) {
                const filePath = await path.join(folderPath, file);
                await fs.unlink(filePath);
            }

            await fs.rmdir(folderPath);
            return;
        }
    } catch (e) {
        return;
    }
}

async lerMensagem(idMessage, to) {
    try {
        const msg = await this.getMessage(idMessage, to);
        if (msg) {
            await this.instance.sock?.readMessages([msg.key]);
        }
    } catch (e) {
        //console.log(e)
    }
}

async verifyId(id) {
    if (id.includes('@g.us')) return true;
    const [result] = await this.instance.sock?.onWhatsApp(id);
    if (result?.exists) {
        return this.getWhatsAppId(id);
    } else {
        throw new Error('no account exists');
    }
}

async verifyGroup(id) {
    try {
        const res = await Promise.race([
            this.instance.sock?.groupMetadata(id),
            new Promise((_, reject) => setTimeout(() => reject(), 5000))
        ]);
        return res;
    } catch (error) {
        throw new Error('Grupo não existe');
    }
}

async sendTextMessage(data) {
    let to = data.id;

    if (data.typeId === 'user') {
        await this.verifyId(this.getWhatsAppId(to));
        to = this.getWhatsAppId(to);
    } else {
        to = this.getGroupId(to);

        await this.verifyGroup(this.getGroupId(to));
    }
    if (data.options && data.options.delay && data.options.delay > 0) {
        await this.setStatus('composing', to, data.typeId, data.options.delay);
    }

    let mentions = false;

    if (data.typeId === 'group' && data.groupOptions && data.groupOptions.markUser) {
        if (data.groupOptions.markUser === 'ghostMention') {
            const metadata = await this.instance.sock?.groupMetadata(this.getGroupId(to));
            mentions = metadata.participants.map((participant) => participant.id);
        } else {
            mentions = this.parseParticipants(groupOptions.markUser);
        }
    }

    let quoted = { quoted: null };

    if (data.options && data.options.replyFrom) {
        const msg = await this.getMessage(data.options.replyFrom, to);

        if (msg) {
            quoted = { quoted: msg };
        }
    }

    const send = await this.instance.sock?.sendMessage(
        to, {
            text: data.message,
            mentions
        },
        quoted
    );
    
    return send;
}

async getMessage(idMessage, to) {
    try {
        const user_instance = this.instance.sock?.user.id;
        const user = this.getWhatsAppId(user_instance.split(':')[0]);
        const msg = await dados.loadMessage(to, idMessage);
        return msg;
    } catch (error) {
        return false;
    }
}

async sendMediaFile(data, origem) {
    let to = data.id;

    if (data.typeId === 'user') {
        await this.verifyId(this.getWhatsAppId(to));
        to = this.getWhatsAppId(to);
    } else {
        to = this.getGroupId(to);
        await this.verifyGroup(this.getGroupId(to));
    }

    let caption = '';
    if (data.options && data.options.caption) {
        caption = data.options.caption;
    }

    let mentions = false;

    if (data.typeId === 'group' && data.groupOptions && data.groupOptions.markUser) {
        if (data.groupOptions.markUser === 'ghostMention') {
            const metadata = await this.instance.sock?.groupMetadata(this.getGroupId(to));
            mentions = metadata.participants.map((participant) => participant.id);
        } else {
            mentions = this.parseParticipants(groupOptions.markUser);
        }
    }

    let quoted = { quoted: null };

    if (data.options && data.options.replyFrom) {
        const msg = await this.getMessage(data.options.replyFrom, to);

        if (msg) {
            quoted = { quoted: msg };
        }
    }

    const acepty = ['audio', 'document', 'video', 'image'];

    if (!acepty.includes(data.type)) {
        throw new Error('Arquivo invalido');
    }

    const origin = ['url', 'base64', 'file'];
    if (!origin.includes(origem)) {
        throw new Error('Metodo de envio invalido');
    }

    let type = false;
    let mimetype = false;
    let filename = false;
    let file = false;
    let audio = false;
    let document = false;
    let video = false;
    let image = false;
    let thumb = false;
    let send;

    let myArray;
    if (data.type === 'image') {
        myArray = config.imageMimeTypes;
    } else if (data.type === 'video') {
        myArray = config.videoMimeTypes;
    } else if (data.type === 'audio') {
        myArray = config.audioMimeTypes;
    } else {
        myArray = config.documentMimeTypes;
    }

    if (origem === 'url') {
        const parsedUrl = url.parse(data.url);
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            mimetype = await this.GetFileMime(data.url);

            if (!myArray.includes(mimetype.trim())) {
                throw new Error('Arquivo ' + mimetype + ' não é permitido para ' + data.type);
            }

            origem = data.url;
        }
    } else if (origem === 'base64') {
        if(!data.filename || data.filename ==='')
			{throw new Error('Nome do arquivo é obrigatorio');}
		
		mimetype = getMIMEType.lookup(data.filename);

        if (!myArray.includes(mimetype.trim())) {
            throw new Error('Arquivo ' + mimetype + ' não é permitido para ' + data.type);
        }

       
    }

    if (data.type === 'audio') {
        if (mimetype === 'audio/ogg') {
            if (data.options && data.options.delay) {
                if (data.options.delay > 0) {
                    await this.instance.sock?.sendPresenceUpdate('recording', to);
                    await delay(data.options.delay * 1000);
                }
            }

            type = {
                url: data.url,
            };
            mimetype = 'audio/mp4';
            filename = await this.getFileNameFromUrl(data.url);
        } else {
            audio = await this.convertToMP4(origem);
            mimetype = 'audio/mp4';
            type = await fs.readFile(audio);
            if (data.options && data.options.delay) {
                if (data.options.delay > 0) {
                    await this.instance.sock?.sendPresenceUpdate('recording', to);
                    await delay(data.options.delay * 1000);
                }
            }
        }
    } else if (data.type === 'video') {
        if (mimetype === 'video/mp4') {
            type = {
                url: data.url,
            };
            thumb = await this.thumbURL(data.url);
            filename = await this.getFileNameFromUrl(data.url);
        } else {
            video = await this.convertTovideoMP4(origem);
            mimetype = 'video/mp4';
            type = await fs.readFile(video);
            thumb = await this.thumbBUFFER(video);
        }
    } else {
	
		if(!data.base64string)
			{
        type = {
            url: data.url,
        };

        filename = await this.getFileNameFromUrl(data.url);
			}
		else
			{
			
	
	const buffer = Buffer.from(data.base64string, 'base64');			

    filename = data.filename;	
    const file = path.join('temp/', filename);
								
	const join = await fs.writeFile(file, buffer);
	type = await fs.readFile('temp/'+filename);
				
			}
    }

    send = await this.instance.sock?.sendMessage(
        to, {
            mimetype: mimetype,
            [data.type]: type,
            caption: caption,
            ptt: data.type === 'audio' ? true : false,
            fileName: filename ? filename : file.originalname,
            mentions
        }, quoted
    );

    if (data.type === 'audio' || data.type === 'video' || data.type=='document') {
        if (data.type === 'video') {
            const ms = JSON.parse(JSON.stringify(send));
            ms.message.videoMessage.thumb = thumb;
            send = ms;
        }

        const tempDirectory = 'temp/';
        const files = await fs.readdir(tempDirectory);

        await Promise.all(files.map(async (file) => {
            const filePath = path.join(tempDirectory, file);
            await fs.unlink(filePath);
        }));
    }

    return send;
}

async GetFileMime(arquivo) {
    try {
        const file = await await axios.head(arquivo);
        return file.headers['content-type'];
        return file;
    } catch (error) {
        throw new Error(
            'Arquivo invalido'
        );
    }
}

async sendMedia(to, userType, file, type, caption = '', replyFrom = false, d = false) {
    if (userType === 'user') {
        await this.verifyId(this.getWhatsAppId(to));
        to = this.getWhatsAppId(to);
    } else {
        to = this.getGroupId(to);
        await this.verifyGroup(this.getGroupId(to));
    }

    const acepty = ['audio', 'document', 'video', 'image'];

    let myArray;
    if (type === 'image') {
        myArray = config.imageMimeTypes;
    } else if (type === 'video') {
        myArray = config.videoMimeTypes;
    } else if (type === 'audio') {
        myArray = config.audioMimeTypes;
    } else {
        myArray = config.documentMimeTypes;
    }

    const mime = file.mimetype;

    if (!myArray.includes(mime.trim())) {
        throw new Error('Arquivo ' + mime + ' não é permitido para ' + type);
    }

    if (!acepty.includes(type)) {
        throw new Error('Type not valid');
    }

    let mimetype = false;
    let filename = false;
    let buferFile = false;
    if (type === 'audio') {
        if (d > 0) {
            await this.instance.sock?.sendPresenceUpdate('recording', to);
            await delay(d * 1000);
        }

        if (mime === 'audio/ogg') {
            const filePath = file.originalname;
            const extension = path.extname(filePath);

            mimetype = 'audio/mp4';
            filename = file.originalname;
            buferFile = file.buffer;
        } else {
            filename = uuidv4() + '.mp4';

            const audio = await this.convertToMP4(file.buffer);
            mimetype = 'audio/mp4';
            buferFile = await fs.readFile(audio);
        }
    } else if (type === 'video') {
        if (mime === 'video/mp4') {
            const filePath = file.originalname;
            const extension = path.extname(filePath);

            mimetype = 'video/mp4';
            filename = file.originalname;
            buferFile = file.buffer;
        } else {
            filename = uuidv4() + '.mp4';

            const video = await this.convertTovideoMP4(file.buffer);
            mimetype = 'video/mp4';
            buferFile = await fs.readFile(video);
        }
    } else {
        const filePath = file.originalname;
        const extension = path.extname(filePath);

        const mimetype = getMIMEType.lookup(extension);
        filename = file.originalname;
        buferFile = file.buffer;
    }

    let quoted = { quoted: null };
    if (replyFrom) {
        const msg = await this.getMessage(replyFrom, to);

        if (msg) {
            quoted = { quoted: msg };
        }
    }

    const data = await this.instance.sock?.sendMessage(
        to, {
            [type]: buferFile,
            caption: caption,
            mimetype: mimetype,
            ptt: type === 'audio' ? true : false,
            fileName: filename
        }, quoted
    );

    if (type === 'audio' || type === 'video') {
        const tempDirectory = 'temp/';
        const files = await fs.readdir(tempDirectory);

        await Promise.all(files.map(async (file) => {
            const filePath = path.join(tempDirectory, file);
            await fs.unlink(filePath);
        }));
    }

    return data;
}

async newbuffer(mp4) {
    try {
        const filePath = path.join('temp', mp4);
        const buffer = await fs.readFile(filePath);
        return buffer;
    } catch (error) {
        throw new Error('Falha ao ler o arquivo mp4');
    }
}

async criaFile(tipo, origem) {
    try {
        if (tipo == 'file') {
            const randomName = uuidv4();
            const fileExtension = path.extname(origem.originalname);
            const newFileName = `${randomName}${fileExtension}`;

            await fs.writeFile('temp/' + newFileName, origem.buffer);
            return 'temp/' + newFileName;
        }
    } catch (error) {
        throw new Error('Falha ao converter o arquivo MP4');
    }
}

async convertemp4(file, retorno) {
    try {
        const tempAudioPath = file;
        const output = 'temp/' + retorno;
        const ffmpegCommand = `ffmpeg -i "${tempAudioPath}" -vn -ab 128k -ar 44100 -f ipod "${output}" -y`;

        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                reject({
                    error: true,
                    message: 'Falha ao converter o áudio.',
                });
            } else {
                return retorno;
            }
        });
    } catch (error) {
        throw new Error('Falha ao converter o arquivo MP4');
    }
}

async DownloadProfile(of) {
    await this.verifyId(this.getWhatsAppId(of));
    const ppUrl = await this.instance.sock?.profilePictureUrl(
        this.getWhatsAppId(of),
        'image'
    );
    return ppUrl;
}

async getUserStatus(of) {
    await this.verifyId(this.getWhatsAppId(of));
    const status = await this.instance.sock?.fetchStatus(
        this.getWhatsAppId(of)
    );
    return status;
}

async contacts() {
    const folderPath = homeDirectory + '/db/' + this.key;
    const filePath = path.join(folderPath, 'contacts.json');
    try {
        await fs.access(folderPath);

        const currentContent = await fs.readFile(filePath, 'utf-8');
        const existingContacts = JSON.parse(currentContent);
        return {
            error: false,
            contacts: existingContacts,
        };
    } catch (error) {
        return {
            error: true,
            message: 'Os contatos ainda não foram carregados.',
        };
    }
}

async chats() {
    const status = 'retorno de chats';
    return status;
}

async blockUnblock(to, data) {
    try {
        if (!data === 'block') {
            data = 'unblock';
        }

        await this.verifyId(this.getWhatsAppId(to));
        const status = await this.instance.sock?.updateBlockStatus(
            this.getWhatsAppId(to),
            data
        );
        return status;
    } catch (e) {
        return {
            error: true,
            message: 'Falha ao bloquear/desbloquear',
        };
    }
}

async sendButtonMessage(to, data) {
    await this.verifyId(this.getWhatsAppId(to));
    const result = await this.instance.sock?.sendMessage(
        this.getWhatsAppId(to),
        {
            templateButtons: processButton(data.buttons),
            text: data.text ?? '',
            footer: data.footerText ?? '',
            viewOnce: true
        }
    );
    return result;
}

async sendContactMessage(to, data) {
    await this.verifyId(this.getWhatsAppId(to));
    const vcard = generateVC(data);
    const result = await this.instance.sock?.sendMessage(
        await this.getWhatsAppId(to),
        {
            contacts: {
                displayName: data.fullName,
                contacts: [{
                    displayName: data.fullName,
                    vcard
                }, ],
            },
        }
    );
    return result;
}

async sendListMessage(to, type, options, groupOptions, data) {
    if (type === 'user') {
        await this.verifyId(this.getWhatsAppId(to));
        to = this.getWhatsAppId(to);
    } else {
        to = this.getGroupId(to);
        await this.verifyGroup(this.getGroupId(to));
    }
    if (options && options.delay && options.delay > 0) {
        await this.setStatus('composing', to, type, options.delay);
    }

    let mentions = false;

    if (type === 'group' && groupOptions && groupOptions.markUser) {
        if (groupOptions.markUser === 'ghostMention') {
            const metadata = await this.instance.sock?.groupMetadata(this.getGroupId(to));
            mentions = metadata.participants.map((participant) => participant.id);
        } else {
            mentions = this.parseParticipants(groupOptions.markUser);
        }
    }

    let quoted = {
        quoted: null
    };

    if (options && options.replyFrom) {
        const msg = await this.getMessage(options.replyFrom, to);

        if (msg) {
            quoted = {
                quoted: msg
            };
        }
    }

    const msgList = {
        text: data.title,
        title: data.title,
        description: data.description,
        buttonText: data.buttonText,
        footerText: data.footerText,
        sections: data.sections,
        listType: 2,
    };

    let idlogado = await this.idLogado();
    const msgRes = generateWAMessageFromContent(to, {
        listMessage: msgList,
        mentions
    }, quoted, {
        idlogado
    });

    const result = await this.instance.sock?.relayMessage(to, msgRes.message, msgRes.key.id);

    return msgRes;
}

async sendMediaButtonMessage(to, data) {
    await this.verifyId(this.getWhatsAppId(to));

    const result = await this.instance.sock?.sendMessage(
        this.getWhatsAppId(to), {
            [data.mediaType]: {
                url: data.image,
            },
            footer: data.footerText ?? '',
            caption: data.text,
            templateButtons: processButton(data.buttons),
            mimetype: data.mimeType,
            viewOnce: true
        }
    );
    return result;
}

async createJid(number) {
    if (!isNaN(number)) {
        const jid = `${number}@s.whatsapp.net`;
        return jid;
    } else {
        return number;
    }
}

async setStatus(status, to, type, pause = false) {

	try{
	if (type === 'user') {
        await this.verifyId(this.getWhatsAppId(to));
        to = this.getWhatsAppId(to);
    } else {
        to = this.getGroupId(to);

        await this.verifyGroup(this.getGroupId(to));
    }	

    const result = await this.instance.sock?.sendPresenceUpdate(status, to);
    if (pause > 0) {
        await delay(pause * 1000);
        await this.instance.sock?.sendPresenceUpdate('paused', to);
    }
    return result;
	}
	catch(e)
	{
	throw new Error('Falha ao enviar a presença, verifique o id e tente novamente')
	}
}

async updateProfilePicture(to, url, type) {
    try {
        let to
        if (type === 'user') {
            await this.verifyId(this.getWhatsAppId(to));
            to = this.getWhatsAppId(to);
        } else {
            to = this.getGroupId(to);
            await this.verifyGroup(to);
        }

        const img = await axios.get(url, {
            responseType: 'arraybuffer'
        });
        const res = await this.instance.sock?.updateProfilePicture(to, img.data);
        return {
            error: false,
            message: 'Foto alterada com sucesso!',
        };
    } catch (e) {
        return {
            error: true,
            message: 'Unable to update profile picture',
        };
    }
}

	async mystatus(status)
{
	try
	{
		 const result = await this.instance.sock?.sendPresenceUpdate(status)
		 return {
                error: false,
                message:
                    'Status alterado para '+status,
            }
		
	}
	catch (e) 
	{
		return {
                error: true,
                message:
                    'Não foi possível alterar para o status '+status,
            }
		
	}
	
}


async removeUndefined(obj) {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        return value === undefined ? null : value;
    }));
}

// Atualizar o usuário no Firestore



async updateUser(sender, updates) {
    try {
        
        const database = client.db('perfil');
        const chatCollection = database.collection(`conversas2_${this.key}`);

        await chatCollection.updateOne(
            { _id: sender },
            { $set: updates },
            { upsert: true }
        );
    } catch (error) {
        console.error('Erro ao atualizar o usuário:', error);
        throw error;
    }
}


async getUser(sender) {
    try {
        
        const database = client.db('perfil');
        const chatCollection = database.collection(`conversas2_${this.key}`);

        const userDoc = await chatCollection.findOne({ _id: sender });

        if (userDoc) {
            if (!userDoc.inputs_enviados) {
                userDoc.inputs_enviados = [];
            }
            if (!userDoc.inputs_respostas) {
                userDoc.inputs_respostas = [];
            }
            return userDoc;
        } else {
            const newUser = { chat: sender, aguardando: {}, enviando: "nao", estagio: 0, inputs_enviados: [], inputs_respostas: [] };
            await chatCollection.insertOne({ _id: sender, ...newUser });
            return newUser;
        }
    } catch (error) {
        console.error('Erro ao obter o usuário:', error);
        throw error;
    }
}


    // get user or group object from db by id
    async getUserOrGroupById(id) {
        try {
            let Chats = await this.getChat()
            const group = Chats.find((c) => c.id === this.getWhatsAppId(id))
            if (!group)
                throw new Error(
                    'unable to get group, check if the group exists'
                )
            return group
        } catch (e) {
            logger.error(e)
            logger.error('Error get group failed')
        }
    }

    // Group Methods
    parseParticipants(users) {
        return users.map((users) => this.getWhatsAppId(users))
    }

    async updateDbGroupsParticipants() {
        try {
            let groups = await this.groupFetchAllParticipating()
            let Chats = await this.getChat()
            if (groups && Chats) {
                for (const [key, value] of Object.entries(groups)) {
                    let group = Chats.find((c) => c.id === value.id)
                    if (group) {
                        let participants = []
                        for (const [
                            key_participant,
                            participant,
                        ] of Object.entries(value.participants)) {
                            participants.push(participant)
                        }
                        group.participant = participants
                        if (value.creation) {
                            group.creation = value.creation
                        }
                        if (value.subjectOwner) {
                            group.subjectOwner = value.subjectOwner
                        }
                        Chats.filter((c) => c.id === value.id)[0] = group
                    }
                }
                await this.updateDb(Chats)
            }
        } catch (e) {
            logger.error(e)
            logger.error('Error updating groups failed')
        }
    }

    async createNewGroup(name, users) {
	
        try {
            const group = await this.instance.sock?.groupCreate(
                name,
                users.map(this.getWhatsAppId)
            )
            return group
        } catch (e) {
            return {
                error: true,
                message:
                    'Erro ao criar o grupo',
            }
        }
    }

async groupFetchAllParticipating()
{
	try{
		const result =
                await this.instance.sock?.groupFetchAllParticipating()
		return result
		
	}
	catch(e)
		{
		return {
                error: true,
                message:
                    'Grupo não encontrado.',
            }
		
			
		}
}

    async addNewParticipant(id, users) {
		
        try {
			const result =
                await this.instance.sock?.groupFetchAllParticipating()
		if(result.hasOwnProperty(this.getGroupId(id)))
		{
			
            const res = await this.instance.sock?.groupParticipantsUpdate(
              this.getGroupId(id),
                 users.map(this.getWhatsAppId),
				  "add"
				  
            )
            return res
		}
			else
			{
			return {
                error: true,
                message:
                    'Grupo não encontrado.',
            }
			
			}
        } catch {
            return {
                error: true,
                message:
                    'Unable to add participant, you must be an admin in this group',
            }
        }
    }

    async makeAdmin(id, users) {
		
        try {
			const result =
                await this.instance.sock?.groupFetchAllParticipating()
		if(result.hasOwnProperty(this.getGroupId(id)))
		{
			
            const res = await this.instance.sock?.groupParticipantsUpdate(
               this.getGroupId(id),
                 users.map(this.getWhatsAppId),
				  "promote"
				  
            )
            return res
		}
			else
			{
			return {
                error: true,
                message:
                    'Grupo não encontrado.',
            }
			
			}
        } catch {
            return {
                error: true,
                message:
                    'Unable to add participant, you must be an admin in this group',
            }
        }
    }
			
 async removeuser(id, users) {
		
        try {
			const result =
                await this.instance.sock?.groupFetchAllParticipating()
		if(result.hasOwnProperty(this.getGroupId(id)))
		{
			
            const res = await this.instance.sock?.groupParticipantsUpdate(
                this.getGroupId(id),
                 users.map(this.getWhatsAppId),
				  "remove"
				  
            )
            return res
		}
			else
			{
			return {
                error: true,
                message:
                    'Grupo não encontrado.',
            }
			
			}
        } catch {
            return {
                error: true,
                message:
                    'Unable to add participant, you must be an admin in this group',
            }
        }
    }

    async demoteAdmin(id, users) {
		
        try {
			const result =
                await this.instance.sock?.groupFetchAllParticipating()
		if(result.hasOwnProperty(this.getGroupId(id)))
		{
			
            const res = await this.instance.sock?.groupParticipantsUpdate(
                this.getGroupId(id),
                 users.map(this.getWhatsAppId),
				  "demote"
				  
            )
            return res
		}
			else
			{
			return {
                error: true,
                message:
                    'Grupo não encontrado.',
            }
			
			}
        } catch {
            return {
                error: true,
                message:
                    'Unable to add participant, you must be an admin in this group',
            }
        }
    }

    

async idLogado()
{
		const user_instance = this.instance.sock?.user.id;
		const user = this.getWhatsAppId(user_instance.split(':')[0]);
		return user;
}
 async joinURL(url)
		{
		try
		{
			const partesDaURL = url.split('/');
			const codigoDoGrupo = partesDaURL[partesDaURL.length - 1];
		
		const entrar = await this.instance.sock?.groupAcceptInvite(codigoDoGrupo);
		return entrar
		
		
		}
		catch(e)
		{
		return {
                error: true,
                message:'Erro ao entrar via URL, verifique se a url ainda é valida ou se o grupo é um grupo aberto.',
            }
		
		}
		
		}

    async leaveGroup(id) {


        try {
           const result =
                await this.instance.sock?.groupFetchAllParticipating()
		if(result.hasOwnProperty(this.getGroupId(id)))
		{
			 await this.instance.sock?.groupLeave(this.getGroupId(id))
            
			 return {
                error: false,
                message:
                    'Saiu do grupo.',
            		}
		}
else
	{
		return {
                error: true,
                message:
                    'Erro ao sair do grupo, verifique se o grupo ainda existe ou se você ainda participa do grupo!',
            }
		
	}
				
        } catch (e) {
            return {
                error: true,
                message:
                    'Erro ao sair do grupo, verifique se o grupo ainda existe.',
            }
        }
}


    async getInviteCodeGroup(id) {
		const to = this.getGroupId(id)
        try {
            await this.verifyGroup(to)
            const convite =  await this.instance.sock?.groupInviteCode(to)
			const url ='https://chat.whatsapp.com/'+convite
			return url;
			
        } catch (e) {
            console.log(e)
            return {
                error: true,
                message:
                    'Erro ao verificar o grupo, verifique se o grupo ainda existe ou se você é administrador.',
            }
        }
    }

    async getInstanceInviteCodeGroup(id) {
        try {
            return await this.instance.sock?.groupInviteCode(id)
        } catch (e) {
            logger.error(e)
            logger.error('Error get invite group failed')
        }
    }

    // get Chat object from db
    async getChat(key = this.key) {
        //let dbResult = await Chat.findOne({ key: key }).exec()
        let ChatObj = Chats
        return ChatObj
    }


  

// Função para adicionar resultadoFormatado ao array
async addToDatabase(key, resultadoFormatado) {
    
    const database = client.db('perfil');
    const collection = database.collection(`funis_${key}`);
    const docId = 'funisDocument';

    const doc = await collection.findOne({ _id: docId });

    if (doc) {
        await collection.updateOne(
            { _id: docId },
            { $push: { funis: resultadoFormatado } }
        );
        console.log("ResultadoFormatado adicionado ao array no MongoDB.");
        return collection.findOne({ _id: docId });
    } else {
        await collection.insertOne({ _id: docId, funis: [resultadoFormatado] });
        console.log("Novo documento criado no MongoDB.");
        return collection.findOne({ _id: docId });
    }
}

// Função para deletar um funil pelo nome
async deleteFunilByFunilName(key, funilName) {
    
    const database = client.db('perfil');
    const collection = database.collection(`funis_${key}`);
    const docId = 'funisDocument';

    const doc = await collection.findOne({ _id: docId });

    if (doc) {
        const updatedFunis = doc.funis.filter(funil => funil.funilName !== funilName);
        await collection.updateOne(
            { _id: docId },
            { $set: { funis: updatedFunis } }
        );
        console.log(`Funil com funilName '${funilName}' removido do MongoDB.`);
    } else {
        console.log(`Documento não encontrado no MongoDB.`);
    }
}

// Função para exibir todos os funis da base de dados
async displayAllFunis(key) {
    
    const database = client.db('perfil');
    const collection = database.collection(`funis_${key}`);
    const docId = 'funisDocument';

    const doc = await collection.findOne({ _id: docId });
    const funis = doc ? doc.funis : [];

    console.log("Funis na base de dados:", funis);
    return funis;
}

// Função para atualizar a ordem de um funil
async updateFunilOrderInDatabase(key, funilName, newPosition) {
    
    const database = client.db('perfil');
    const collection = database.collection(`funis_${key}`);
    const docId = 'funisDocument';

    const doc = await collection.findOne({ _id: docId });
    if (!doc) {
        throw new Error(`Funil '${funilName}' não encontrado.`);
    }

    const funilIndex = doc.funis.findIndex(funil => funil.funilName === funilName);
    if (funilIndex === -1) {
        throw new Error(`Funil '${funilName}' não encontrado no documento.`);
    }

    doc.funis[funilIndex].position = newPosition;

    await collection.updateOne(
        { _id: docId },
        { $set: { funis: doc.funis } }
    );
    console.log("Ordem do funil atualizada:", funilName, newPosition);
}

// Função para buscar um funil pelo nome
async findFunilByName(key, funilName) {
    
    const database = client.db('perfil');
    const collection = database.collection(`funis_${key}`);
    const docId = 'funisDocument';

    const doc = await collection.findOne({ _id: docId });
    if (!doc) {
        console.log(`Nenhum funil encontrado com o nome '${funilName}'.`);
        return null;
    }

    const foundFunil = doc.funis.find(funil => funil.funilName === funilName);
    if (foundFunil) {
        console.log(`Funil encontrado:`, foundFunil);
        return foundFunil;
    } else {
        console.log(`Nenhum funil encontrado com o nome '${funilName}'.`);
        return null;
    }
}

async enviarAudio(key, linkDoAudio, id, tipoUsuario, delay) {
    try {
        let typeusr;

        if (id.includes("@g.us")) {
            typeusr = "group"
        } else {
            typeusr = "user"
        }

        const response = await axios.get(linkDoAudio, {
            responseType: 'arraybuffer'
        });

        const formData = new FormData();
        const blob = new Blob([Buffer.from(response.data)], { type: 'audio/mp3' });
        formData.append('file', blob, 'audio.mp3');
        formData.append('id', id);
        formData.append('userType', typeusr);
        formData.append('delay', parseInt(delay));

        const result = await axios.post(`http://localhost:3000/message/audiofile?key=` + key, formData);

        console.log(result.data);
        if (result.data.error) {
            console.log('Erro ao enviar áudio: ' + result.data.message);
        } else {
            console.log('Áudio enviado com sucesso.');
        }
    } catch (error) {
        console.error('Ocorreu um erro:', error);
    }
}



async sendfunil(key, funilName, chat, visuunica) {
    try {
        
        const database = client.db('perfil');
        const collection = database.collection(`funis_${key}`);
        const docId = 'funisDocument';

        const doc = await collection.findOne({ _id: docId });
        if (!doc) {
            console.log(`Nenhum funil encontrado com o nome '${funilName}'.`);
            return null;
        }

        const funis = doc.funis;
        const foundFunil = funis.find(funil => funil.funilName === funilName);
        if (foundFunil) {
            console.log(`Funil encontrado:`, foundFunil);

            for (const msg of foundFunil.funil) {
                console.log(msg);
                if (msg.tipoMensagem == "text") {
                    await this.instance.sock?.sendMessage(this.getWhatsAppId2(chat), { text: msg.conteudo });
                } else if (msg.tipoMensagem == "wait") {
                    await sleep(msg.conteudo * 1000);
                } else if (msg.tipoMensagem == "image") {
                    
                    if (visuunica == 'true') {
                        await this.instance.sock?.sendMessage(this.getWhatsAppId2(chat), { image: { url: msg.conteudo }, viewOnce: true });
                    } else {
                        console.log("enviando")
                        console.log(this.getWhatsAppId2(chat))
                        await this.instance.sock?.sendMessage(this.getWhatsAppId2(chat), { image: { url: msg.conteudo } });
                    }
                } else if (msg.tipoMensagem == "audio") {
                    await this.enviarAudio(key, msg.conteudo, this.getWhatsAppId2(chat), "usr", 0);
                } else if (msg.tipoMensagem == "video") {
                    if (visuunica == 'true') {
                        await this.instance.sock?.sendMessage(this.getWhatsAppId2(chat), { video: { url: msg.conteudo }, viewOnce: true });
                    } else {
                        await this.instance.sock?.sendMessage(this.getWhatsAppId2(chat), { video: { url: msg.conteudo } });
                    }
                }
            }

            return foundFunil;
        } else {
            console.log(`Nenhum funil encontrado com o nome '${funilName}'.`);
            return null;
        }
    } catch (e) {
        console.log(e);
        return "Erro interno";
    }
}


  async obterEmail(key) {
    try {
     
        const database = client.db('perfil');
        const collection = database.collection(`conf_${key}`);

        const chatDoc = await collection.findOne({ _id: 'apis' });

        if (chatDoc) {
            return chatDoc.emailcompra || null; // Retorna o campo emailcompra se existir, senão retorna null
        } else {
            return null; // Retorna null se o documento não existir
        }
    } catch (error) {
        console.error('Erro:', error);
        throw new Error('Erro interno do servidor');
    }
}


async salvarEmail(key, email) {
    try {
      
        const database = client.db('perfil');
        const collection = database.collection(`conf_${key}`);

        const filter = { _id: 'apis' };
        const updateDoc = { $set: { emailcompra: email } };
        const options = { upsert: true };

        const result = await collection.updateOne(filter, updateDoc, options);

        if (result.modifiedCount === 1 || result.upsertedCount === 1) {
            return "Email salvo com sucesso.";
        } else {
            throw new Error('Falha ao salvar o email');
        }
    } catch (error) {
        console.error('Erro:', error);
        throw new Error('Erro interno do servidor');
    }
}
  
  

  // Função para salvar dados
async salvarDados(key, dados) {
    try {
        
        const database = client.db('perfil');
        const collection = database.collection(`conf_${key}`);
        const docId = 'apis';

        const doc = await collection.findOne({ _id: docId });

        if (!doc) {
            await collection.insertOne({ _id: docId, ...dados });
            return 'Dados criados com sucesso!';
        } else {
            const dadosLimpos = {};
            for (const [chave, valor] of Object.entries(dados)) {
                if (Array.isArray(valor)) {
                    dadosLimpos[chave] = valor.length > 0 ? valor[0] : '';
                } else {
                    dadosLimpos[chave] = valor;
                }
            }

            await collection.updateOne({ _id: docId }, { $set: dadosLimpos });
            return 'Dados atualizados com sucesso!';
        }
    } catch (error) {
        console.error('Erro:', error);
        throw new Error('Erro interno do servidor');
    }
}

// Função para obter a configuração
async getconfig(key) {
    try {
        
        const database = client.db('perfil');
        const collection = database.collection(`conf_${key}`);
        const docId = 'apis';

        const doc = await collection.findOne({ _id: docId });

        let dados = {};

        if (doc) {
            dados = doc;
        }

        return dados;
    } catch (error) {
        console.error('Erro:', error);
        throw new Error('Erro interno do servidor');
    }
}

// Função para buscar mensagens e chats
async fetchInstanceMessagesAndChats(key = this.key) {
    try {
        
        const database = client.db('perfil');
        const collection = database.collection(`conversas2_${key}`);

        const snapshot = await collection.find().toArray();

        if (snapshot.length === 0) {
            console.log('Nenhum chat encontrado.');
            return [];
        }

        const chats = snapshot.map(doc => ({ id: doc._id, data: doc }));

        return chats;
    } catch (error) {
        console.error('Erro ao buscar mensagens e chats:', error);
        return { error: true, message: 'Falha ao buscar mensagens e chats' };
    }
}
      
    // create new group by application
    async createGroupByApp(newChat) {
        try {
            let Chats = await this.getChat()
            let group = {
                id: newChat[0].id,
                name: newChat[0].subject,
                participant: newChat[0].participants,
                messages: [],
                creation: newChat[0].creation,
                subjectOwner: newChat[0].subjectOwner,
            }
            Chats.push(group)
            await this.updateDb(Chats)
        } catch (e) {
            logger.error(e)
            logger.error('Error updating document failed')
        }
    }

    async updateGroupSubjectByApp(newChat) {
        //console.log(newChat)
        try {
            if (newChat[0] && newChat[0].subject) {
                let Chats = await this.getChat()
                Chats.find((c) => c.id === newChat[0].id).name =
                    newChat[0].subject
                await this.updateDb(Chats)
            }
        } catch (e) {
            logger.error(e)
            logger.error('Error updating document failed')
        }
    }

    async updateGroupParticipantsByApp(newChat) {
        //console.log(newChat)
        try {
            if (newChat && newChat.id) {
                let Chats = await this.getChat()
                let chat = Chats.find((c) => c.id === newChat.id)
                let is_owner = false
                if (chat) {
                    if (chat.participant == undefined) {
                        chat.participant = []
                    }
                    if (chat.participant && newChat.action == 'add') {
                        for (const participant of newChat.participants) {
                            chat.participant.push({
                                id: participant,
                                admin: null,
                            })
                        }
                    }
                    if (chat.participant && newChat.action == 'remove') {
                        for (const participant of newChat.participants) {
                            // remove group if they are owner
                            if (chat.subjectOwner == participant) {
                                is_owner = true
                            }
                            chat.participant = chat.participant.filter(
                                (p) => p.id != participant
                            )
                        }
                    }
                    if (chat.participant && newChat.action == 'demote') {
                        for (const participant of newChat.participants) {
                            if (
                                chat.participant.filter(
                                    (p) => p.id == participant
                                )[0]
                            ) {
                                chat.participant.filter(
                                    (p) => p.id == participant
                                )[0].admin = null
                            }
                        }
                    }
                    if (chat.participant && newChat.action == 'promote') {
                        for (const participant of newChat.participants) {
                            if (
                                chat.participant.filter(

                                    (p) => p.id == participant
                                )[0]
                            ) {
                                chat.participant.filter(
                                    (p) => p.id == participant
                                )[0].admin = 'superadmin'
                            }
                        }
                    }
                    if (is_owner) {
                        Chats = Chats.filter((c) => c.id !== newChat.id)
                    } else {
                        Chats.filter((c) => c.id === newChat.id)[0] = chat
                    }
                    await this.updateDb(Chats)
                }
            }
        } catch (e) {
            logger.error(e)
            logger.error('Error updating document failed')
        }
    }

   
			
// ... (seu código existente) ...


  // ... (resto do seu código) ... 

//gerar grupo:
async gerargrupo(key) {
    let linkgp;

    // Função para gerar número aleatório de 0 a 90
    const getRandomNumber = () => Math.floor(Math.random() * 91);

    while (true) {
        try {
            // URL da página inicial
            const initialPageUrl = `https://gruposwhats.app/category/amizade?page=${getRandomNumber()}`;
            
            // Fazer a primeira requisição GET
            const response = await axios.get(initialPageUrl);
            const html = response.data;
            const $ = cheerio.load(html);

            // Encontrar links com a classe específica
            const links = $("a.btn.btn-success.btn-block.stretched-link.font-weight-bold");

            // Escolher um link aleatório
            const randomLink = links[Math.floor(Math.random() * links.length)];

            // Extrair o href do link escolhido
            const groupUrl = $(randomLink).attr("href");

            // Fazer a segunda requisição GET
            const groupResponse = await axios.get(groupUrl);
            const groupHtml = groupResponse.data;
            const group$ = cheerio.load(groupHtml);

            // Encontrar o link com a classe específica na segunda página
            linkgp = group$("a.btn.btn-success.btn-block.stretched-link.font-weight-bold").attr("data-url");

            // Se encontrou o link, sair do loop
            if (linkgp) {
                console.log("Grupo válido encontrado:", linkgp);
                break;
            }
        } catch (error) {
            console.error("Erro:", error.message);
        }
    }

    // Extrair o ID do grupo
    const idgroup = linkgp.replace("https://chat.whatsapp.com/", "");

    try {
        // Obter informações do grupo usando sua biblioteca
        const response = await this.instance.sock?.groupGetInviteInfo(idgroup);
        console.log("Informações do grupo: " + response);
        return { linkgp: linkgp, resp: response };
    } catch (e) {
        console.log("Grupo inválido");
        return "invalido";
    }
}



    // update promote demote remove
    async groupParticipantsUpdate(id, users, action) {
        try {
            const res = await this.instance.sock?.groupParticipantsUpdate(
                this.getWhatsAppId(id),
                this.parseParticipants(users),
                action
            )
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'unable to ' +
                    action +
                    ' some participants, check if you are admin in group or participants exists',
            }
        }
    }

    // update group settings like
    // only allow admins to send messages
    async groupSettingUpdate(id, action) {
        try {
			await this.verifyGroup(id)
            const res = await this.instance.sock?.groupSettingUpdate(
                this.getWhatsAppId(id),
                action
            )
            return {
                error: false,
                message:
                    'Alteração referente a ' + action + ' Concluida',
            }
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'Erro ao alterar' + action + ' Verifique se você tem permissão ou se o grupo existe',
            }
        }
    }

    async groupUpdateSubject(id, subject) {
		
        try {
			await this.verifyGroup(id)
            const res = await this.instance.sock?.groupUpdateSubject(
                this.getWhatsAppId(id),
                subject
            )
			return {
                error: false,
                message:
                    'Nome do grupo alterado para '+subject
            }
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'Erro ao alterar o grupo, verifique se você é administrador ou se o grupo existe',
            }
        }
    }

    async groupUpdateDescription(id, description) {
		
        try {
			await this.verifyGroup(id)
            const res = await this.instance.sock?.groupUpdateDescription(
                this.getWhatsAppId(id),
                description
            )
			//console.log(res)
            return {
                error: false,
                message:
                    'Descrição do grupo alterada para '+description
            }
        } catch (e) {
            
            return {
                error: true,
                message:
                    'Falha ao alterar a descrição do grupo, verifique se você é um administrador ou se o grupo existe',
            }
        }
    }

async groupGetInviteInfo(url) {
        try {
			const codeurl = url.split('/');


			const code = codeurl[codeurl.length - 1];
			
			
            const res = await this.instance.sock?.groupGetInviteInfo(code)
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'Falha ao obter o verificar o grupo. Verifique o codigo da url ou se o grupo ainda existe..',
            }
        }
    }


async groupidinfo(id) {
    const to = this.getGroupId(id);

    try {
        //await this.verifyGroup(to);

        const res = await Promise.race([
            this.instance.sock?.groupMetadata(to),
            new Promise((_, reject) => setTimeout(() => reject(), 5000))
        ]);
        return res;
    } catch (e) {
       
        return {
            error: true,
            message: 'Grupo não existe',
        };
    }
}


async groupAcceptInvite(id) {
        try {
            const res = await this.instance.sock?.groupAcceptInvite(id)
            return res
        } catch (e) {
            //console.log(e)
            return {
                error: true,
                message:
                    'Falha ao obter o verificar o grupo. Verifique o codigo da url ou se o grupo ainda existe..',
            }
        }
    }

    // update db document -> chat
    async updateDb(object) {
        try {
            await Chat.updateOne({ key: this.key }, { chat: object })
        } catch (e) {
            logger.error('Error updating document failed')

        }
    }

    async readMessage(msgObj) {
        try {
            const key = {
                remoteJid: msgObj.remoteJid,
                id: msgObj.id,
                participant: msgObj?.participant // required when reading a msg from group
            }
            const res = await this.instance.sock?.readMessages([key])
            return res
        } catch (e) {
            logger.error('Error read message failed')
        }
    }

    async reactMessage(id, key, emoji) {
        try {
            const reactionMessage = {
                react: {
                    text: emoji, // use an empty string to remove the reaction
                    key: key
                }
            }
            const res = await this.instance.sock?.sendMessage(
                this.getWhatsAppId(id),
                reactionMessage
            )
            return res
        } catch (e) {
            logger.error('Error react message failed')
        }
    }
}

module.exports = {
    WhatsAppInstance: WhatsAppInstance,
    db: db,
    client: client
  };