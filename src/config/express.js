const express = require('express')
const path = require('path')
const exceptionHandler = require('express-exception-handler')
exceptionHandler.handle()
const app = express()
const error = require('../api/middlewares/error')
const tokenCheck = require('../api/middlewares/tokenCheck')
const frontend = require('../front/frontend')
const { protectRoutes } = require('./config')
const fs = require("fs")
const axios = require("axios")
const urlapi = process.env.urlapi

app.use('/static', express.static(__dirname + '/public'));
app.use(express.json())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../api/views'))

console.log('Static files served from:', path.join(__dirname, '../public'));


global.WhatsAppInstances  = {}

const routes = require('../api/routes/')
if (protectRoutes) {
    app.use(tokenCheck)
}

app.use('/', routes)

const myInstanceKey = 'barbara'; 


const { WhatsAppInstance } = require("../api/class/instance")

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

app.get('/whats2/:chave', async (req, res) => {
    const chave = req.params.chave;
  
    const contactsResponse = await fetch(`http://localhost:3000/misc/contacts?key=${chave}`);
    const contactsData = await contactsResponse.json();
  
    res.render('whats', {chats: contactsData.data.contacts, chave})
  })

app.get('/whats/:chave', async (req, res, next) => {
    try {
        const chave = req.params.chave;
        const chatsMsgs = await fetch(`http://localhost:3000/instance/gchats?key=${chave}`);
        const chatsdata = await chatsMsgs.json();

        fs.readFile('./tons-eleven.json', async (err, data) => {
            if (err) {
                console.error('Erro ao ler o arquivo JSON:', err);
                return next(err); // Passa o erro para o middleware de tratamento de erros
            }
            const configuracoes = JSON.parse(data);

           

              
            const instanceInfoUrl = `http://localhost:3000/instance/info?key=` + chave;
            const bearerToken = "Bearer " + generateRandomString(20); // Substitua 'getRandomString()' pela função que gera a string aleatória
            const config = {
              headers: {
                Authorization: bearerToken
              }
            };

            let nomezap;
            let numeroid;
            try {
                const apiResponse = await axios.get(instanceInfoUrl, {}, config);
                console.log(apiResponse.data);
                const userName = apiResponse.data.instance_data.user.name
                
                nomezap = apiResponse.data.instance_data.user.name
                numeroid = apiResponse.data.instance_data.user.id.split(":")[0];
            } catch(e) {
              console.log(e)
           nomezap = "Você"
           numeroid = 0
            }
            

            let profileImageUrl;
            try {
            const profileResponse = await fetch(`http://localhost:3000/misc/downProfile?key=${chave}`, {
              method: 'POST',
              body: JSON.stringify({ id: numeroid }),
              headers: { 'Content-Type': 'application/json' }
            });
            const profileData = await profileResponse.json();
            if (profileData.error === false) {
              profileImageUrl = profileData.data;
            }
          } catch(e) {
            profileImageUrl = 'https://cdn-icons-png.flaticon.com/512/711/711769.png'
          }
            console.log("Numero id"+ numeroid)

            chatsdata.sort((a, b) => {
              const aMessages = a.data.mensagens;
              const bMessages = b.data.mensagens;
              const aLastMessageTime = new Date(aMessages[aMessages.length - 1].split(' - ')[0]);
              const bLastMessageTime = new Date(bMessages[bMessages.length - 1].split(' - ')[0]);
              return bLastMessageTime - aLastMessageTime; // Ordena do mais recente para o mais antigo
          });

          
            res.render("whats3", {
                chats: chatsdata,
                nomezap,
                numeroid,
                configuracoes,
                chave,
                profileImageUrl,
                urlapi
            });
        });
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        return next(error); // Passa o erro para o middleware de tratamento de erros
    }
});


app.get('/chat', async (req, res, next) => {
  try {
      const chatNum = req.query.num;
      const chave = req.query.key;  // Assumindo que você está passando a chave como um query parameter
      let numeroid;

      fs.readFile('./tons-eleven.json', async (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo JSON:', err);
            return next(err); // Passa o erro para o middleware de tratamento de erros
        }
        const configuracoes = JSON.parse(data);


      // Buscando os dados do chat específico
      const chatResponse = await fetch(`http://localhost:3000/instance/gchats?key=${chave}`);
      if (!chatResponse.ok) {
          throw new Error(`Erro na resposta da API: ${chatResponse.statusText}`);
      }
      const chatsData = await chatResponse.json();
console.log(chatsData)
      const chat = chatsData.find(chat => chat.id === chatNum);

      if (!chat) {
          return res.status(404).send('Chat não encontrado');
      }

      // Obter informações do usuário
      const instanceInfoUrl = `http://localhost:3000/instance/info?key=` + chave;
      const bearerToken = "Bearer " + generateRandomString(20); // Substitua 'getRandomString()' pela função que gera a string aleatória
      const config = {
          headers: {
              Authorization: bearerToken
          }
      };

      let nomezap;
      try {
          const apiResponse = await axios.get(instanceInfoUrl, {}, config);
          console.log(apiResponse.data);
          nomezap = apiResponse.data.instance_data.user.name;
          numeroid = apiResponse.data.instance_data.user.id.split(":")[0];
      } catch(e) {
          console.log(e)
          nomezap = "Você";
          numeroid = 0
      }

      console.log(chatsData)

      chatsData.sort((a, b) => {
        const aMessages = a.data.mensagens;
        const bMessages = b.data.mensagens;
        const aLastMessageTime = new Date(aMessages[aMessages.length - 1].split(' - ')[0]);
        const bLastMessageTime = new Date(bMessages[bMessages.length - 1].split(' - ')[0]);
        return bLastMessageTime - aLastMessageTime; // Ordena do mais recente para o mais antigo
    });


    const funisResponse = await fetch(`http://localhost:3000/instance/displayallfunis?key=${chave}`);
    if (!funisResponse.ok) {
        throw new Error(`Erro na resposta da API: ${funisResponse.statusText}`);
    }
    const funisData = await funisResponse.json();

    function getImageLinks(data) {
      const imageLinks = [];
  
      data.forEach(item => {
          if (item.funil && Array.isArray(item.funil)) {
              item.funil.forEach(funilItem => {
                  if (funilItem.tipoMensagem === 'image') {
                      imageLinks.push(funilItem.conteudo);
                  }
              });
          }
      });
  
      return imageLinks;
  }
  
  const imageLinks = getImageLinks(funisData);
  console.log(imageLinks);

  let profileImageUrl;
  try {
  const profileResponse = await fetch(`http://localhost:3000/misc/downProfile?key=${chave}`, {
    method: 'POST',
    body: JSON.stringify({ id: numeroid }),
    headers: { 'Content-Type': 'application/json' }
  });
  const profileData = await profileResponse.json();
  if (profileData.error === false) {
    profileImageUrl = profileData.data;
  }
} catch(e) {
  profileImageUrl = 'https://cdn-icons-png.flaticon.com/512/711/711769.png'
}

      res.render("chat", {
          chat: chat.data,
          chatfull: chatsData,
          nomezap,
          chave,
          configuracoes,
          imageLinks,
          funisData,
          profileImageUrl
      });
    })
  } catch (error) {
      console.error('Erro ao processar a requisição:', error);
      return res.status(500).json({ error: true, message: error.message });
  }
});




  app.get('/mensagens', (req, res) => {
    try {
        // Caminho do arquivo JSON
        const filePath = path.join('db/mensagens.json');

        // Ler o arquivo JSON
        const jsonData = fs.readFileSync(filePath, 'utf8');

        // Converter JSON para objeto JavaScript
        const data = JSON.parse(jsonData);

        // Extrair apenas os IDs dos chats
        const chatIds = data.chats.map(chat => ({
          id: chat.id.replace('@s.whatsapp.net', ''),
          name: chat.id.replace('@s.whatsapp.net', '')
      }));


        // Construir novo objeto JSON com os IDs dos chats
        const responseJson = { chatIds };

        // Enviar resposta com os IDs dos chats
        res.json(responseJson);
    } catch (err) {
        console.error('Erro ao ler arquivo de mensagens:', err);
        res.status(500).send('Erro interno do servidor');
    }
});


app.post('/gerar-audio', async (req, res) => {
    try {
      const { textoDoInput, tom } = req.body;
      const key = req.query.key; // Ajusta a forma de obter a chave
      console.log('Tom selecionado:', tom);
  
      // Obtém as configurações da API
      const dados = await getConfigFromAPI(key);
      
      // Lê o arquivo de configuração de tons
      const configuracoes = await readJsonFile('tons-eleven.json');
      
      // Encontra a configuração do tom selecionado
      const configuracaoTom = configuracoes.find(opcao => opcao.nome === tom);
      if (!configuracaoTom) {
        console.log('Opções disponíveis:', configuracoes.map(opcao => opcao.nome));
        return res.status(400).send('Tom não encontrado');
      }
  
      // Configurações para a requisição à API
      const options = createApiOptions(dados.elevenkey, textoDoInput, configuracaoTom);
      console.log(options.body);
  
      // Requisição à API para gerar o áudio
      const response = await fetchAudioFromApi(dados.idvozeleven, options);
      
      // Envia o áudio como resposta
      const audioBuffer = await streamToBuffer(response.body);
     // await saveAudioFile('./public/uploads/voicechanger.mp3', audioBuffer);
      res.send(audioBuffer);
      console.log('Áudio baixado com sucesso e enviado!');
    } catch (error) {
      console.error('Erro:', error);
      res.status(500).send('Erro interno do servidor');
    }
  });
  
  async function getConfigFromAPI(key) {
    const response = await axios.get(`http://localhost:3000/instance/gconfig?key=${key}`);
    return response.data;
  }
  
  function readJsonFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          return reject(err);
        }
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }
  
  function createApiOptions(elevenKey, textoDoInput, configuracaoTom) {
    return {
      method: 'POST',
      headers: {
        'xi-api-key': elevenKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: textoDoInput,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: `0.${configuracaoTom.estabilidade}`,
          similarity_boost: `0.${configuracaoTom.similaridade}`,
          style: `0.${configuracaoTom.exagero}`,
          use_speaker_boost: configuracaoTom.boost
        }
      })
    };
  }
  
  async function fetchAudioFromApi(voiceId, options) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, options);
    if (!response.ok) {
      throw new Error('Erro ao gerar áudio na API');
    }
    return response;
  }
  
  async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  
  function saveAudioFile(filePath, buffer) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          return reject(err);
        }
        console.log('Áudio salvo com sucesso!');
        resolve();
      });
    });
  }

  app.get('/admin/dark/delsessao', (req, res) => {
    res.send(`<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deletar Acesso</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
            /* Add any additional custom styles here */
        </style>
    </head>
    
    <body class="bg-gray-100">
        <div class="max-w-md mx-auto py-12 px-4">
            <h2 class="text-2xl font-bold text-center mb-8">Deletar Acesso</h2>
            <form id="deleteAccessForm" class="space-y-4">
                <div>
                    <label for="key" class="block">Chave de Acesso:</label>
                    <input type="text" id="key" name="key" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Deletar Acesso</button>
            </form>
        </div>
    
        <script>
            document.getElementById('deleteAccessForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                const key = document.getElementById('key').value;
                try {
                    const response = await fetch('http://localhost:3000/instance/delete?key=' + key);
                    if (response.ok) {
                        alert('Acesso deletado com sucesso!');
                    } else {
                        throw new Error('Erro ao deletar acesso.');
                    }
                } catch (error) {
                    alert(error.message);
                }
            });
        </script>
    </body>
    
    </html>
    `)
  })
  app.get('/admin/dark/addsessao', (req, res) => {
    const formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Criar Acesso</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
            /* Add any additional custom styles here */
        </style>
    </head>
    
    <body class="bg-gray-100">
        <div class="max-w-md mx-auto py-12 px-4">
            <h2 class="text-2xl font-bold text-center mb-8">Adicionar Sessão</h2>
            <form id="addSessionForm" class="space-y-4">
                <div>
                    <label for="key" class="block">Chave de Acesso:</label>
                    <input type="text" id="key" name="key" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Criar Acesso</button>
            </form>
        </div>
    
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <script>
            document.getElementById('addSessionForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                const key = document.getElementById('key').value;
                const requestData = {
                    key: key,
                    browser: "Ubuntu",
                    webhook: false,
                    base64: true,
                    webhookUrl: "",
                    webhookEvents: ["messages.upsert"],
                    ignoreGroups: false,
                    messagesRead: false
                };
                try {
                    const response = await axios.post('http://localhost:3000/instance/init', requestData);
                    alert('Acesso criado com sucesso!');
                } catch (error) {
                    alert('Erro ao criar acesso. Por favor, tente novamente.');
                }
            });
        </script>
    </body>
    
    </html>
    
    `;
    res.send(formHTML);
});


app.use(frontend)
app.use(error.handler)

module.exports = app
