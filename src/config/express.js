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
const os = require('os');
const homeDirectory = os.homedir();
const { client } = require("../api/class/instance")



app.use(express.static(path.join(__dirname, 'public')));
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
const { WhatsAppInstance } = require('../api/class/instance')



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

  app.get('/tutorial', async (req, res) => {

  
  
  
      res.render('doc', {})
    })

  const getConfigurations = async () => {
    return new Promise((resolve, reject) => {
        fs.readFile('./tons-eleven.json', (err, data) => {
            if (err) {
                reject('Erro ao ler o arquivo JSON');
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
};

const getInstanceInfo = async (chave) => {
    const instanceInfoUrl = `http://localhost:3000/instance/info?key=${chave}`;
    const bearerToken = "Bearer " + generateRandomString(20);
    const config = { headers: { Authorization: bearerToken } };

    try {
        const apiResponse = await axios.get(instanceInfoUrl, {}, config);
        const user = apiResponse.data.instance_data.user;
        console.log({ nomezap: user.name, numeroid: user.id.split(":")[0] })
        return { nomezap: user.name, numeroid: user.id.split(":")[0] };
    } catch (error) {
        console.error(error);
        return { nomezap: "Você", numeroid: 0 };
    }
};

const getProfileImageUrl = async (chave, numeroid) => {
    try {
        const profileResponse = await fetch(`http://localhost:3000/misc/downProfile?key=${chave}`, {
            method: 'POST',
            body: JSON.stringify({ id: numeroid }),
            headers: { 'Content-Type': 'application/json' }
        });
        const profileData = await profileResponse.json();
        if (profileData.error === false) {
            return profileData.data;
        }
    } catch (error) {
        console.error(error);
    }
    return 'https://cdn-icons-png.flaticon.com/512/711/711769.png';
};

const sortChatsByLastMessageTime = (chatsdata) => {
    chatsdata.sort((a, b) => {
        const aMessages = a.data.mensagens;
        const bMessages = b.data.mensagens;
        const aLastMessageTime = new Date(aMessages[aMessages.length - 1].split(' - ')[0]);
        const bLastMessageTime = new Date(bMessages[bMessages.length - 1].split(' - ')[0]);
        return bLastMessageTime - aLastMessageTime;
    });
};

// Handles any requests that match the defined routes
app.get('/whats11/:chave/:nome', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'zap.html'));
});

app.get('/higor2/dark/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'adm.html'));
});

app.get('/whats/:chave', async (req, res, next) => {
    const chave = req.params.chave;
    try {
        const chatsMsgs = await fetch(`http://localhost:3000/chats/${chave}`);
        const chatsdata = await chatsMsgs.json();

      // const database = client.db('perfil');
       //const collection = database.collection(`chatis_${chave}`);

     //  const snapshot = await collection.find().toArray();

      // if (snapshot.length === 0) {
      //     console.log('Nenhum chat encontrado.');
       //    return [];
     //  }

       //const chatsdata = snapshot.map(doc => ({ id: doc._id, data: doc }));

        const configuracoes = await getConfigurations();
        const { nomezap, numeroid } = await getInstanceInfo(chave);
        const profileImageUrl = await getProfileImageUrl(chave, numeroid);

      //  sortChatsByLastMessageTime(chatsdata.chatsdata);

        res.render("whats3", {
            chats: chatsdata.chatsData,
            nomezap,
            numeroid,
            configuracoes,
            chave,
            profileImageUrl,
            urlapi: "http://localhost:3000"
        });
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        return next(error);
    }
});

app.get('/findchat/:id/:chave', async (req, res, next) => {
  try {
    const { id, chave } = req.params;
    const database = client.db('perfil');
    const collection = database.collection('chatis_' + chave);

    // Obter todos os documentos e armazenar em uma variável temporária
    const snapshot = await collection.find({}, { projection: { _id: 1, nome: 1, mensagens: 1 } }).toArray();

    if (snapshot.length === 0) {
      console.log('Nenhum chat encontrado.');
      return res.status(404).json({ error: 'Nenhum chat encontrado.' });
    }

    // Mapear os dados dos chats
    const chatsData = snapshot.map(doc => ({ id: doc._id, data: doc }));


    
    // Localizar o chat específico pelo ID
    const chat = chatsData.find(chat => chat.id === id);

    if (!chat) {
      console.log('Chat não encontrado.');
      return res.status(404).json({ error: 'Chat não encontrado.' });
    }

    // Preparar os dados do chat para resposta
    const chatdata = {
      id: chat.id,
      nome: chat.data.nome,
      mensagens: chat.data.mensagens || []
    };

    res.json({ chatdata });
  } catch (error) {
    console.error('Erro ao buscar o chat:', error);
    next(error);
  }
});


const sortChatsByLastMessageTime2 = (chatsdata) => {
  chatsdata.sort((a, b) => {
    const aLastMessageTime = new Date(a.ultimaMensagem.split(' - ')[0]);
    const bLastMessageTime = new Date(b.ultimaMensagem.split(' - ')[0]);
    return bLastMessageTime - aLastMessageTime;
  });
};

app.get('/chats/:chave', async (req, res, next) => {
  try {
    const { chave } = req.params;

    const chatResponse = await fetch(`http://localhost:3000/instance/gchats?key=${chave}`);
    if (!chatResponse.ok) {
      throw new Error(`Erro na resposta da API: ${chatResponse.statusText}`);
    }

    const chatsList = await chatResponse.json();

    const chatsData = chatsList.map(chat => {
      // Se não existir mensagens, cria uma fictícia vazia
      const mensagens = chat.data.mensagens && chat.data.mensagens.length > 0
        ? chat.data.mensagens
        : [{ data: '', user: '', mensagem: '' }];

      const ultimaMensagem = mensagens.reduce((maisRecente, mensagemAtual) => {
        const dataMaisRecente = new Date(maisRecente.data);
        const dataMensagemAtual = new Date(mensagemAtual.data);
        return dataMensagemAtual > dataMaisRecente ? mensagemAtual : maisRecente;
      });

      return {
        id: chat.data._id,
        nome: chat.data.nome || '',
        imagem: chat.data.imagem || '',
        ultimaMensagem: ultimaMensagem
      };
    });

    res.json({ chatsData });
  } catch (error) {
    console.error('Erro ao buscar chats:', error);
    next(error);
  }
});









// Funções auxiliares
async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro na resposta da API: ${response.statusText}`);
  }
  return response.json();
}

function getImageLinks(data) {
  return data.flatMap(item => 
    (item.funil || [])
      .filter(funilItem => funilItem.tipoMensagem === 'image')
      .map(funilItem => funilItem.conteudo)
  );
}

function sortChatsData(chatsData) {
  return chatsData.sort((a, b) => {
    const lastMessageA = a.data.mensagens.length > 0 ? new Date(a.data.mensagens[a.data.mensagens.length - 1].data) : new Date(0);
    const lastMessageB = b.data.mensagens.length > 0 ? new Date(b.data.mensagens[b.data.mensagens.length - 1].data) : new Date(0);
    return lastMessageB - lastMessageA;
  });
}

// Rota principal
app.get('/chat', async (req, res) => {
  const { num: chatNum, key: chave } = req.query;

  try {
    const [configuracoes, chatsdata, funisData, { nomezap, numeroid }] = await Promise.all([
      getConfigurations(),
      fetchData(`http://localhost:3000/instance/gchats?key=${chave}`),
      fetchData(`http://localhost:3000/instance/displayallfunis?key=${chave}`),
      getInstanceInfo(chave)
    ]);

    const chat = chatsdata.find(chat => chat.id === chatNum);
    if (!chat) {
      return res.status(404).send('Chat não encontrado');
    }


let funisboard;
try {
  const responsef = await axios.get(`http://localhost:3000/api/funis/${chave}`);
     funisboard = responsef.data

} catch(e) {
  funisboard = []

}
  


const chatsData = chatsdata.map(chat => {
  const ultimaMensagem = chat.data.mensagens.reduce((maisRecente, mensagemAtual) => {
    const dataMaisRecente = new Date(maisRecente.data);
    const dataMensagemAtual = new Date(mensagemAtual.data);
    return dataMensagemAtual > dataMaisRecente ? mensagemAtual : maisRecente;
  });

  return {
    id: chat.data._id,
    nome: chat.data.nome,
    imagem: chat.data.imagem,
    ultimaMensagem: ultimaMensagem
  };
});

    
    const imageLinks = getImageLinks(funisData);
    const profileImageUrl = await getProfileImageUrl(chave, numeroid);

console.log(chatsData[0])

    res.render("chat", {
      chat: chat.data,
      filtro: chatsData,
      nomezap,
      chave,
      configuracoes,
      imageLinks,
      funisData,
      funisboard,
      profileImageUrl
    });

  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    res.status(500).json({ error: true, message: error.message });
  }
});


app.get('/criar-funil/:chave', (req, res) => {
  const chave = req.params.chave;
  res.render('fluxo', {chave})
})


  app.get('/mensagens', (req, res) => {
    try {
        // Caminho do arquivo JSON
        const filePath = path.join(homeDirectory + '/db/mensagens.json');

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



// Function to render HTML for adding session
const renderAddSessionForm = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Criar Acesso</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <div class="max-w-md mx-auto py-12 px-4">
        <h2 class="text-2xl font-bold text-center mb-8">Adicionar Sessão</h2>
        <form id="addSessionForm" class="space-y-4">
            <div>
                <label for="key" class="block">Chave de Acesso:</label>
                <input type="text" id="key" name="key" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div>
                <label for="email" class="block">Email:</label>
                <input type="email" id="email" name="email" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div>
                <label for="phone" class="block">Telefone:</label>
                <input type="tel" id="phone" name="phone" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div>
                <label for="name" class="block">Nome:</label>
                <input type="text" id="name" name="name" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Criar Acesso</button>
        </form>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script>
        document.getElementById('addSessionForm').addEventListener('submit', async function(event) {
            event.preventDefault();
            const key = document.getElementById('key').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const name = document.getElementById('name').value;
           const requestData = {
        key: key,
        email: email,
        phone: phone,
        name: name,
        dias: 'teste',  // Inclusão do valor de dias
        browser: "Ubuntu",
        webhook: false,
        base64: true,
        webhookUrl: "",
        webhookEvents: ["messages.upsert"],
        ignoreGroups: false,
        messagesRead: false
    };
            try {
         const response = await fetch('http://localhost:3000/addteste', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
});

             
                alert('Acesso criado com sucesso para teste grátis de 10 minutos!');
            } catch (error) {
             console.log(error)
                alert('Erro ao criar acesso. Por favor, tente novamente.');
            }
        });
    </script>
</body>
</html>
`;

// Function to render HTML for deleting session
const renderDeleteSessionForm = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deletar Acesso</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
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
                const response = await fetch('http://localhost:3000/instance/delete?key=' + key, { method: 'DELETE' });
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
`;

// Route to render add session form
app.get('/higor2/dark/addteste', (req, res) => {
    res.send(renderAddSessionForm());
});

// Route to render delete session form
app.get('/higor2/dark/delsessao', (req, res) => {
    res.send(renderDeleteSessionForm());
});

// Function to remove user access
const removeUserAccess = async (key) => {
    try {
        const response = await fetch(`http://localhost:3000/instance/delete?key=${key}`, {
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
};


const crypto = require('crypto');

// Função para gerar email aleatório
function generateRandomEmail() {
    const randomString = crypto.randomBytes(4).toString('hex');
    return `teste.${randomString}@example.com`;
}

function generateRandomEmail2() {
  const randomString = crypto.randomBytes(4).toString('hex');
  return `user.${randomString}@hotboard.com`;
}
// Função para gerar key aleatória
function generateRandomKey() {
    return crypto.randomBytes(7).toString('hex');
}

const acessostripe = async(nome, phone, dias) => {
  const randomEmail = generateRandomEmail2();
  const randomKey = generateRandomKey();

  const requestData = {
    key: randomKey,
    email: randomEmail,
    name: nome,
    phone: phone,
    dias: dias,
    browser: "Ubuntu",
    webhook: false,
    base64: true,
    webhookUrl: "",
    webhookEvents: ["messages.upsert"],
    ignoreGroups: false,
    messagesRead: false
};

    const response = await axios.post('https://evolucaohot.online/instance/init', requestData);
  return randomkey
}

app.post('/addsessao2', async (req, res) => {
  try {
    const randomEmail = generateRandomEmail2();
    const randomKey = generateRandomKey();

    const requestData = {
      key: randomKey,
      email: randomEmail,
      name: "awasdad",
      phone: "5517991134416",
      dias: 3,
      browser: "Ubuntu",
      webhook: false,
      base64: true,
      webhookUrl: "",
      webhookEvents: ["messages.upsert"],
      ignoreGroups: false,
      messagesRead: false
  };

      const response = await axios.post('https://evolucaohot.online/instance/init', requestData);
    
    // Retorna os dados criados
    res.json({
      success: true,
      message: 'Acesso criado com sucesso!',
      data: {
        key: randomKey,
        email: randomEmail,
      }
    });

  } catch (error) {
    console.error('Erro ao criar acesso:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar acesso. Por favor, tente novamente.',
      error: error.message
    });
  }
});


app.get('/higor2/dark/addsessao2', (req, res) => {
  const randomEmail = generateRandomEmail2();
  const randomKey = generateRandomKey();

  const formHTML = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Teste Grátis</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  <body class="bg-gray-100">
      <div class="max-w-md mx-auto py-12 px-4">
          <h2 class="text-2xl font-bold text-center mb-8">Teste Grátis</h2>
          <form id="freeTestForm" class="space-y-4">
              <div>
                  <label for="email" class="block">Email:</label>
                  <input type="email" id="email" name="email" value="${randomEmail}" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" readonly>
              </div>
              <div>
                  <label for="key" class="block">Chave de Acesso:</label>
                  <input type="text" id="key" name="key" value="${randomKey}" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" readonly>
              </div>
              <div>
                <label for="name" class="block">Nome:</label>
                <input type="text" id="name" name="name" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
                <label for="phone" class="block">Telefone:</label>
                <input type="tel" id="phone" name="phone" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
             <div>
             <label for="dias" class="block font-semibold mb-2">Quantidade de Dias:</label>
           <input type="number" id="dias" name="dias" required class="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:border-blue-500">

    </div>
                <button type="button" id="submitButton" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Criar Acesso</button>
            </form>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <script>
            document.getElementById('submitButton').addEventListener('click', async function() {
                const key = document.getElementById('key').value;
                const email = document.getElementById('email').value;
                const name = document.getElementById('name').value;
                const dias = document.getElementById('dias').value;
                  const phone = document.getElementById('phone').value;
                const requestData = {
                    key: key,
                    email: email,
                    name: name,
                    phone: phone,
                    dias: dias,
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
                    alert('Acesso criado com sucesso! Chave: ' + key);
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


app.get('/higor2/dark/testegratis', (req, res) => {
    const randomEmail = generateRandomEmail();
    const randomKey = generateRandomKey();

    const formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Teste Grátis</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <div class="max-w-md mx-auto py-12 px-4">
            <h2 class="text-2xl font-bold text-center mb-8">Teste Grátis</h2>
            <form id="freeTestForm" class="space-y-4">
                <div>
                    <label for="email" class="block">Email:</label>
                    <input type="email" id="email" name="email" value="${randomEmail}" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" readonly>
                </div>
                <div>
                    <label for="key" class="block">Chave de Acesso:</label>
                    <input type="text" id="key" name="key" value="${randomKey}" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" readonly>
                </div>
                <div>
                    <label for="name" class="block">Nome:</label>
                    <input type="text" id="name" name="name" value="teste gratis" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" readonly>
                </div>
                <div>
                    <label for="dias" class="block">Quantidade de Dias:</label>
                    <input type="number" id="dias" name="dias" value="1" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" readonly>
                </div>
                <button type="button" id="submitButton" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Criar Acesso</button>
            </form>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        <script>
            document.getElementById('submitButton').addEventListener('click', async function() {
                const key = document.getElementById('key').value;
                const email = document.getElementById('email').value;
                const name = document.getElementById('name').value;
                const dias = document.getElementById('dias').value;
                const requestData = {
                    key: key,
                    email: email,
                    name: name,
                    dias: dias,
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
                    alert('Acesso criado com sucesso! Chave: ' + key);
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

// Route to create user access for a test period and schedule removal
app.post('/addteste', async (req, res) => {
    const requestData = req.body;

      
        
        try {
          const response = await axios.post('http://localhost:3000/instance/init', requestData);
          res.status(200).send('Acesso criado com sucesso para teste grátis de 10 minutos!');
        
     

        // Remove user access after 10 minutes
       await setTimeout(async() => {
          await removeUserAccess(requestData.key);
        }, 10 * 60 * 1000); // 10 minutes in milliseconds


    } catch (error) {
      console.log(error)
        res.status(500).send('Erro ao criar acesso. Por favor, tente novamente.');
    }
});

  app.get('/higor2/dark/addsessao', (req, res) => {
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
            <div>
                <label for="email" class="block">Email:</label>
                <input type="email" id="email" name="email" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div>
                <label for="phone" class="block">Telefone:</label>
                <input type="tel" id="phone" name="phone" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div>
                <label for="name" class="block">Nome:</label>
                <input type="text" id="name" name="name" class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
       <div>
             <label for="dias" class="block font-semibold mb-2">Quantidade de Dias:</label>
           <input type="number" id="dias" name="dias" required class="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:border-blue-500">

    </div>
            <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Criar Acesso</button>
        </form>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script>
    document.getElementById('addSessionForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const key = document.getElementById('key').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const name = document.getElementById('name').value;
    const dias = document.getElementById('dias').value;  // Certifique-se de que este valor está sendo capturado corretamente
    const requestData = {
        key: key,
        email: email,
        phone: phone,
        name: name,
        dias: dias,  // Inclusão do valor de dias
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

module.exports = {app}
