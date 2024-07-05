// instanceRoutes.js

const express = require("express");

const router = express.Router();
const axios = require("axios")
const { WhatsAppInstance, db, client, ObjectId } = require('../api/class/instance');
const moment = require("moment-timezone");
const multer = require("multer");
const fs = require("fs")
const xlsx = require('xlsx');
const urlapi = process.env.urlapi
const path = require('path');
const { v4: uuidv4 } = require("uuid");
moment.tz.setDefault("America/Sao_Paulo");



router.get('/addlist/:chave', (req, res) => {
  const chave = req.params.chave;
  res.render('addlist', { chave: chave });
});

// Rota POST para criar uma nova lista
router.post('/addlist/:chave', async (req, res) => {
  const chave = req.params.chave;
  db1 = client.db('contatos');
  contactLists = db1.collection(chave);

  const listName = req.body.listName;
  const newList = { name: listName, contacts: [] };
  await contactLists.insertOne(newList);

  res.redirect('/listas/' + chave );
});


router.get('/list/:id/:chave', async (req, res) => {
  const chave = req.params.chave;
  const listId = req.params.id;
  db1 = client.db('contatos');
  const contactLists = db1.collection(chave);

  let list;

   
      list = await contactLists.findOne({ name: listId });
    

    if (!list) {
      return res.status(404).send('Lista não encontrada');
    }


  res.render('list', { list, chave });
});



router.get('/create-list/:name/:chave', async (req, res) => {
  db1 = client.db('contatos');
contactLists = db1.collection(chave)

  const listName = req.params.name;
  const chave = req.params.chave
  const newList = { name: listName, contacts: [] };
  await contactLists.insertOne(newList);
  res.send(`Lista ${listName} criada com sucesso!`);
});

router.get('/listas/:chave', async (req, res) => {
  const chave = req.params.chave
  db1 = client.db('contatos');
contactLists = db1.collection(chave)
  const lists = await contactLists.find({}).toArray();
  res.render('lists', { lists, chave });
});

router.get('/add-contact/:chave', async (req, res) => {
  const chave = req.params.chave;
  db1 = client.db('contatos');
  const contactLists = db1.collection(chave);
  const lists = await contactLists.find({}).toArray();
  res.render('add-contact', { lists, chave: chave });
});

router.post('/add-contact/:chave', async (req, res) => {
  const chave = req.params.chave;
  const { listName, number } = req.body;
  const formattedNumber = number.replace(/\D/g, '');
  db1 = client.db('contatos');
  const contactLists = db1.collection(chave);
  await contactLists.updateOne(
    { name: listName },
    { $push: { contacts: formattedNumber } }
  );
  res.redirect('/listas/' + chave);
});

router.get('/list-names/:chave', async (req, res) => {
  const chave = req.params.chave
  db1 = client.db('contatos');
contactLists = db1.collection(chave)
  const lists = await contactLists.find({}).toArray();
  res.json(lists.map(list => list.name));
});

router.get('/upload/:chave', async (req, res) => {
  const chave = req.params.chave
  db1 = client.db('contatos');
contactLists = db1.collection(chave)
  const lists = await contactLists.find({}).toArray();
  res.render('upload', { lists, chave });
});


// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });





// Rota para deletar um contato específico de uma lista
router.delete('/list/delete/:listName/:chave', async (req, res) => {
  const chave = req.params.chave;
  const listName = req.params.listName;
  const { contact } = req.body; // O contato a ser deletado deve ser passado no corpo da requisição

  const db = client.db('contatos');
  const contactLists = db.collection(chave);

  await contactLists.updateOne(
    { name: listName },
    { $pull: { contacts: contact } }
  );

  res.send('Contato deletado com sucesso.');
});

// Rota para deletar uma lista específica
router.delete('/list/:listName/:chave', async (req, res) => {
  const chave = req.params.chave;
  const listName = req.params.listName;

  const db = client.db('contatos');
  const contactLists = db.collection(chave);

  await contactLists.deleteOne({ name: listName });

  res.send('Lista deletada com sucesso.');
});

// Rota para upload e conversão da planilha
router.post('/upload/:chave', upload.single('file'), async (req, res) => {
  const chave = req.params.chave
  const file = req.file;
  const listName = req.body.listName;

  if (!file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  // Lendo a planilha usando xlsx
  const workbook = xlsx.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Extraindo os números da planilha
  const numbers = data.map(row => row.numero);

  // Adicionando os números à lista de contatos no MongoDB
  const db = client.db('contatos');
  const contactLists = db.collection(chave);
  await contactLists.updateOne(
    { name: listName },
    { $push: { contacts: { $each: numbers } } }
  );

  res.send('Números adicionados com sucesso.');
});



async function checkWhatsApp(chave) {
  const instanceResponse = await fetch(`http://localhost:3000/instance/info?key=${chave}`);
  const instanceData = await instanceResponse.json();

  let whatsappStatus = '';
  let whatsappIcon = '';
  let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
  let codeMessage = '';

  if (instanceData.error === false && instanceData.instance_data.phone_connected) {
      whatsappStatus = 'WhatsApp conectado';
      whatsappIcon = 'fa-whatsapp';

      // Requisição para baixar o perfil
      const profileResponse = await fetch(`http://localhost:3000/misc/downProfile?key=${chave}`, {
          method: 'POST',
          body: JSON.stringify({ id: instanceData.instance_data.user.id.replace(":5@s.whatsrouter.net", "") }),
          headers: { 'Content-Type': 'application/json' }
      });
      const profileData = await profileResponse.json();
      if (profileData.error === false) {
          profileImageUrl = profileData.data;
      }
  } else {
      whatsappStatus = 'WhatsApp não conectado';
      whatsappIcon = 'fa-times';
  }

  // Se não estiver conectado, solicitar código de verificação
  if (!instanceData.instance_data.phone_connected) {
      const getCodeResponse = await fetch(`http://localhost:3000/instance/getcode?key=${chave}&number=${NUMEROINPUT}`, {
          method: 'POST'
      });
      const getCodeData = await getCodeResponse.json();
      if (getCodeData.error === false) {
          codeMessage = `Digite esse código de verificação no seu WhatsApp: ${getCodeData.code}`;
      }
  }

  return { whatsappStatus, whatsappIcon, profileImageUrl, codeMessage };
}


// ------------ ADMIN --------//


router.get("/admin/dark/adduser", async (req, res) => {
  try {
    res.render("addassinatura");
  } catch (error) {
    console.error(error);
  }
});

router.post("/criar-assinatura", async (req, res) => {
  const { email, nome, dias } = req.body;
  var validade = moment().add(parseInt(dias), "days").toDate();

  try {
     
      const database = client.db('hotboard');
      const assinaturas = database.collection('assinaturas');

      await assinaturas.insertOne({ email, nome, validade, ativo: true });
      res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
      res.send(err.message);
  }
});



const sendMessageHook = async (number, msg, keybase) => {

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

const numeronovo = await formatPhoneNumber(number)
  const url = `http://localhost:3000/message/text?key=${keybase}`;
  const headers = {
    "accept": "*/*",
    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/json",
    "sec-ch-ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "Referer": `http://localhost:3000/chat?num=5517996607540@s.whatsrouter.net&key=${keybase}`,
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

  const body = {
    id: numeronovo,
    typeId: "user",
    message: msg,
    options: {
      delay: 0,
      replyFrom: ""
    },
    groupOptions: {
      markUser: ""
    }
  };

  try {
    const response = await axios.post(url, body, { headers });

    if (response.status !== 200) {
      console.log(`Error: ${response.statusText}`);
    }

    const data = response.data;
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
  }
};



//webhook
router.post('/webhook', express.json({type: 'application/json'}), async(request, response) => {
  const event = request.body;


  const userinfo = {
    "email": event.data.object.email,
    "phone": event.data.object.phone,
    "nome": event.data.object.name,
    "balance": event.data.object.balance
  }

console.log(event)
  // Handle the event
  switch (event.type) {

    case 'customer.created':
      console.log("Checkout aberto!")
      const carrinho = event.data.object;
     console.log(userinfo)
     await sendMessageHook(userinfo.phone.replace("+55", "55"), `👋 Olá ${userinfo.nome},

Aqui é a equipe de suporte da Hotboard! Queremos te avisar que, após a finalização do seu pagamento, você receberá acesso imediato à plataforma. Qualquer dúvida, estamos à disposição.

Atenciosamente,
Equipe Hotboard`, "chefe5")
      break;

   case 'invoice.paid':
    console.log("Pagamento recebido!");

    const payment = event.data.object;
    
    const dadosass = {
        email: payment.customer_email,
        nome: payment.customer_name,
        phone: payment.customer_phone,
        item: {
            valor: payment.lines.data[0].amount,
            nome: payment.lines.data[0].description
        }
    };

    console.log(dadosass);
console.log(`formato ${dadosass.phone.replace("+55", "55")}`)
    await sendMessageHook(dadosass.phone.replace("+55", "55"), `👋 Olá ${dadosass.nome},

Estamos felizes em informar que sua assinatura do item "${dadosass.item.nome}" no valor de ${dadosass.item.valor} foi realizada com sucesso!

Detalhes do Cliente:

*Email: ${dadosass.email}*
*Telefone: ${dadosass.phone}*

Obrigado por escolher nossos serviços. Já estou criando o seu acesso.

Atenciosamente,
Equipe de Suporte`, "chefe5");

    // Criando acesso automaticamente:
    const { email, nome } = dadosass;
    const validade = moment().add(30, "days").toDate();

    try {
        const database = client.db('hotboard');
        const assinaturas = database.collection('assinaturas');

        await assinaturas.insertOne({ email, nome, validade, ativo: true });

        const gerarStringAleatoria = () => {
            const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let resultado = '';
            for (let i = 0; i < 6; i++) {
                const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
                resultado += caracteres[indiceAleatorio];
            }
            return resultado;
        };

        const key = gerarStringAleatoria();

        const requestData = {
            key,
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
            console.log('Acesso criado com sucesso!');
        } catch (error) {
            console.log('Erro ao criar acesso. Por favor, tente novamente.');
        }

        await sendMessageHook(dadosass.phone.replace("+55", "55"), `✅ *Acesso liberado com sucesso*

Plataforma: http://localhost:3000/

Sua chave de acesso: ${key}

Seu email de validação: ${email}`, "chefe5");

await sendMessageHook(dadosass.phone.replace("+55", "55"), `Grupo de clientes: https://chat.whatsrouter.com/E9x0eM5RkzxB2Vj1Dt5TnB

Tutorial: https://www.canva.com/design/DAGImSc0sus/pLZ6FDrKe89hIjs38Vsb6w/edit?utm_content=DAGImSc0sus&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton
`, "chefe5");

    } catch (err) {
        res.send(err.message);
    }

    break;


    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Then define and call a method to handle the successful payment intent.
      // handlePaymentIntentSucceeded(paymentIntent);
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  

  // Return a response to acknowledge receipt of the event
  response.json({received: true});
});


router.get("/admin/dark/assinaturas-ativas", async (req, res) => {
  try {
     
      const database = client.db('hotboard');
      const assinaturas = database.collection('assinaturas');

      const snapshot = await assinaturas.find({ ativo: true }).toArray();
      const assinaturasList = snapshot.map(doc => ({
          id: doc._id,
          ...doc,
          validade: doc.validade // Não precisa de .toDate() porque já é um objeto Date
      }));

      // Ordenando as assinaturas por data de validade (mais recente primeiro)
      assinaturasList.sort((a, b) => b.validade - a.validade);

      res.render("assinaturas-ativas", { assinaturas: assinaturasList });
  } catch (err) {
      res.send(err.message);
  }
});

router.post("/pausar-assinatura", async (req, res) => {
  const { email } = req.body;
  try {
     
      const database = client.db('hotboard');
      const assinaturas = database.collection('assinaturas');

      const snapshot = await assinaturas.find({ email, ativo: true }).toArray();
      if (snapshot.length > 0) {
          await assinaturas.updateMany({ email, ativo: true }, { $set: { ativo: false } });
      }

      res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
      res.send(err.message);
  }
});

router.post("/ativar-assinatura", async (req, res) => {
  const { email } = req.body;
  try {
     
      const database = client.db('hotboard');
      const assinaturas = database.collection('assinaturas');

      const snapshot = await assinaturas.find({ email, ativo: false }).toArray();
      if (snapshot.length > 0) {
          await assinaturas.updateMany({ email, ativo: false }, { $set: { ativo: true } });
      }

      res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
      res.send(err.message);
  }
});

router.post("/excluir-assinatura", async (req, res) => {
  const { email } = req.body;
  try {
     
      const database = client.db('hotboard');
      const assinaturas = database.collection('assinaturas');

      await assinaturas.deleteMany({ email });

      res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
      res.send(err.message);
  }
});

// Função para obter e-mails ativos
async function getEmailsAtivos() {
  try {
    const instanceResponse = await fetch(`http://localhost:3000/instance/list`);
    const instanceData = await instanceResponse.json();
    const emailsAtivos = [];
    const dataAtualSP = moment().tz("America/Sao_Paulo");

    for (const doc of instanceData.data) {
      if (doc.email === "invalido") continue;

      if (moment(doc.dias).isBefore(dataAtualSP)) {
        const data = {
          key: doc.key,
          email: "invalido",
          phone: doc.phone,
          name: doc.name,
          dias: doc.dias,
          webhook: doc.webhook || false,
          webhookUrl: doc.webhookUrl || false,
          mongourl: doc.mongourl || false,
          browser: doc.browser || 'Minha Api',
          ignoreGroups: doc.ignoreGroups || false,
          webhookEvents: doc.webhookEvents || [],
          messagesRead: doc.messagesRead || false,
          base64: doc.base64 || false
        };

        try {
          const response = await axios.post('http://localhost:3000/instance/editar', data);
          console.log(response.data);
        } catch (error) {
          console.error("Erro ao editar email:", error);
        }
      } else {
        emailsAtivos.push(doc.email);
      }
    }

    return emailsAtivos;
  } catch (err) {
    console.error("Erro ao obter emails ativos:", err);
    return [];
  }
}


// Função para consultar validade
async function consultarValidade(chave) {
  try {

    const instanceResponse = await fetch(`http://localhost:3000/instance/info?key=${chave}`);
    const instanceData = await instanceResponse.json();

    console.log(instanceData)

      if (instanceData) {
        const dataVencimento = new Date(instanceData.instance_data.dias); // Converte a string para um objeto Date
          const dia = dataVencimento.getDate();
          const mes = dataVencimento.getMonth() + 1;

          // Buscar o nome de usuário correspondente ao email
          const nomeUsuario = instanceData.instance_data.name || "Usuário"; // Se não encontrar o nome, usa "Usuário" como padrão

          return {
              nome: nomeUsuario,
              data: `${dia}/${mes}`,
          };
      } else {
          return null; // Retorna null se não houver assinatura para o email fornecido
      }
  } catch (err) {
      console.error(err);
      return null;
  }
}

router.get("/assinaturas-mails", async (req, res) => {
  try {
    const emails = await getEmailsAtivos();
    res.json({ mails: emails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/email-invalido", (req, res) => {
  res.send(`<!DOCTYPE html>
  <html lang="en">
  
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Formulário de Email</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  
  <body class="bg-gray-100 flex items-center justify-center h-screen">
      <div class="bg-white p-8 rounded shadow-md">
          <form action="/adicionar-email" method="post" class="space-y-4">
              <div>
                  <label for="email" class="block font-medium text-gray-700">Email:</label>
                  <input type="email" id="email" name="email" required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
              </div>
              <div>
                  <label for="key" class="block font-medium text-gray-700">Chave:</label>
                  <input type="text" id="key" name="key" required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
              </div>
              <button type="submit"
                  class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50">Salvar</button>
          </form>
          <p class="text-red-500 mt-4">Seu email de compra não é válido ou já passou da data de validade.</p>
      </div>
  </body>
  
  </html>
  `)
})

router.get("/adicionar-email", (req, res) => {
  const { key } = req.query;
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Formulário de Email</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  
  <body class="bg-gray-100 flex items-center justify-center h-screen">
      <div class="bg-white p-8 rounded shadow-md">
          <form action="/adicionar-email" method="post" class="space-y-4">
              <div>
                  <label for="email" class="block font-medium text-gray-700">Email:</label>
                  <input type="email" id="email" name="email" required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
              </div>
              <div>
                  <label for="key" class="block font-medium text-gray-700">Chave:</label>
                  <input type="text" id="key" name="key" required
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
              </div>
              <button type="submit"
                  class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-200 focus:ring-opacity-50">Salvar</button>
          </form>
      </div>
  </body>
  
  </html>
  
  
  `);
});

// Rota para lidar com o envio do formulário
router.post("/adicionar-email", async (req, res) => {
  const { email, key } = req.body;

  try {
    // Fazendo a solicitação para o URL fornecido
    const response = await fetch(`http://localhost:3000/instance/addmail?email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}`);
    const data = await response.json();
    
    // Verificando a resposta da solicitação
    if (response.ok) {
   res.redirect('/home/'+ key)
    } else {
      res.status(response.status).send(data.message);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro interno do servidor.");
  }
});

//OUTRAS ROTAS
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/daisyui@1.14.1/dist/full.css" rel="stylesheet">
    <style>
      body {
        font-family: 'Arial', sans-serif;
        background-color: #f2f2f2;
      }
    </style>
  </head>
  <body class="flex justify-center items-center h-screen bg-gray-200">
    <div class="container mx-auto max-w-md p-6 bg-white shadow-lg rounded-lg relative">
      <!-- Adicionando uma imagem animada de usuário -->
      <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-20 w-32 h-32 rounded-full overflow-hidden border-4 border-white">
        <img src="https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" alt="Usuário" class="w-full h-full object-cover">
      </div>
  
      <div class="mt-16">
        <h1 class="text-2xl font-bold mb-4 text-center">HOTBOARD MASTER</h1>
        <h2 class="text-lg font-semibold mb-6 text-center">Informe sua chave de acesso:</h2>
        <div class="mb-4">
          <input class="input input-bordered w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="chaveInput" type="text" placeholder="Digite sua chave">
        </div>
        <div class="mb-6">
          <button class="btn btn-primary w-full" onclick="login()">Entrar</button>
        </div>
        <div id="message" class="text-red-500 text-sm text-center"></div>
      </div>
  
      <!-- Animação de automação no WhatsApp -->
      <div class="flex justify-center mt-6">
        <img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDY5Yzdpb29mZm1ncHYzcHg1ZHl5aTRrd2E2dzhpcWozYWt6ODdsYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2ikwIgNrmPZICNmRyX/giphy.webp" alt="Automação WhatsApp" class="w-32 h-32">
      </div>
    </div>
  
    <script>
      function login() {
        var chave = document.getElementById("chaveInput").value;
        
        // Simulando uma requisição AJAX
        fetch('/instance/list')
          .then(response => response.json())
          .then(data => {
            var instanceFound = data.data.find(instance => instance.instance_key === chave);
            if (instanceFound) {
              document.getElementById("message").innerHTML = "Login realizado com sucesso!";
              setTimeout(function() {
                window.location.href = '/home/' + chave;
              }, 2000); // Redireciona após 2 segundos
            } else {
              // Exibe mensagem de erro
              document.getElementById("message").innerHTML = "Chave inválida. Tente novamente.";
            }
          })
          .catch(error => {
            console.error('Erro ao fazer requisição:', error);
            document.getElementById("message").innerHTML = "Erro ao conectar ao servidor.";
          });
      }
    </script>
  </body>
  </html>
  
  `)
});


router.get('/info/:chave', async (req, res) => {
  const chave = req.params.chave;
  let userEmail;
  try {
    const instanceResponse = await fetch(`http://localhost:3000/instance/info?key=${chave}`);
    const instanceData = await instanceResponse.json();


    if (instanceData.instance_data.email) {
      console.log(`Email do usuário ${chave} => ${instanceData.instance_data.email}`);
      userEmail = instanceData.instance_data.email;
    } else {
      return res.redirect('/adicionar-email');
    }

  } catch (error) {
    console.error('Erro ao buscar o email:', error);
    return res.status(500).send('Erro ao buscar seu email de compra.');

    //verificar se a chave é valida
  }

  const emails_validos = await getEmailsAtivos()
 let dadoAssinatura = {}
  if(emails_validos.includes(userEmail)) {
    console.log("Login aprovado com sucesso!")
    let consultando = await consultarValidade(chave)
    dadoAssinatura = consultando
  } else {
res.redirect('/email-invalido')
  }


  let totalChats = 0
  try {
    // Requisição para obter os contatos
    const contactsResponse = await fetch(`http://localhost:3000/misc/contacts?key=${chave}`);
    const contactsData = await contactsResponse.json();
     totalChats = contactsData.data.contacts.length;
  } catch(e) {
    totalChats = 0
  }

  const dados = {
    email: userEmail,
    nomeAssinatura: dadoAssinatura.nome,
    validade: dadoAssinatura.data,
    totalContatos: totalChats
  }

  res.send(`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informações do Usuário</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  <body class="bg-gray-100">
    <div class="container mx-auto mt-10">
      <div class="bg-white p-8 rounded-lg shadow-md">
        <h1 class="text-2xl font-semibold mb-4">Informações do Usuário</h1>
        <div class="mb-4">
          <label class="block text-gray-700 font-semibold mb-2" for="email">Email:</label>
          <p id="email" class="text-gray-900">${dados.email}</p>
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 font-semibold mb-2" for="assinatura">Nome da Assinatura:</label>
          <p id="assinatura" class="text-gray-900">${dados.nomeAssinatura}</p>
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 font-semibold mb-2" for="validade">Validade da Assinatura:</label>
          <p id="validade" class="text-gray-900">${dados.validade}</p>
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 font-semibold mb-2" for="totalContatos">Total de Contatos:</label>
          <p id="totalContatos" class="text-gray-900">${dados.totalContatos}</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `)
})

router.get('/home/:chave', async (req, res) => {
  const chave = req.params.chave;
  let userEmail;
  const instanceResponse = await fetch(`http://localhost:3000/instance/info?key=${chave}`);
  const instanceData = await instanceResponse.json();

/*/
  const chatsMsgs = await fetch(`http://localhost:3000/chats/${chave}`);
  const chatsdata = await chatsMsgs.json();

  const count = chatsdata.chatsData.length
/*/

  try {
   

    if (instanceData.instance_data.email) {
      console.log(`Email do usuário ${chave} => ${instanceData.instance_data.email}`);
      userEmail = instanceData.instance_data.email;
    } else {
      return res.redirect('/adicionar-email');
    }

  } catch (error) {
    console.error('Erro ao buscar o email:', error);
   

    //verificar chave
    const responseInstanceList = await fetch(`http://localhost:3000/instance/list`);
    const dataInstanceList = await responseInstanceList.json();
    const instanceFound = dataInstanceList.data.find(instance => instance.instance_key === chave);

    if (!instanceFound) {
      return res.status(500).send('Acesso não permitido.');
    } else {
      return res.redirect('/adicionar-email');
    }

  }

  const emails_validos = await getEmailsAtivos();
  if (!emails_validos.includes(userEmail)) {
    return res.redirect('/email-invalido');
  }

  console.log("Login aprovado com sucesso!");
  const dadoAssinatura = await consultarValidade(chave);

  try {
    const responseInstanceList = await fetch(`http://localhost:3000/instance/list`);
    const dataInstanceList = await responseInstanceList.json();
    const instanceFound = dataInstanceList.data.find(instance => instance.instance_key === chave);

    if (!instanceFound) {
      return res.send("Nao autenticado");
    }

   
    let whatsappStatus = 'WhatsApp não conectado';
    let whatsappIcon = 'fa-times';
    if (instanceData.error === false && instanceData.instance_data.phone_connected) {
      whatsappStatus = 'WhatsApp conectado';
      whatsappIcon = 'fa-whatsapp';
    }

    let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
    if (instanceData.error === false) {
      try {
        const numerorefatorado = instanceData.instance_data.user.id.split(":")[0];
        const profileResponse = await fetch(`http://localhost:3000/misc/downProfile?key=${chave}`, {
          method: 'POST',
          body: JSON.stringify({ id: numerorefatorado }),
          headers: { 'Content-Type': 'application/json' }
        });
        const profileData = await profileResponse.json();
        if (profileData.error === false) {
          profileImageUrl = profileData.data;
        }
      } catch (e) {
        console.error('Erro ao baixar o perfil:', e);
      }
    }

    let totalChats = 0;
    try {
      const contactsResponse = await fetch(`http://localhost:3000/misc/contacts?key=${chave}`);
      const contactsData = await contactsResponse.json();
      totalChats = contactsData.data.contacts.length;
    } catch (e) {
      console.error('Erro ao obter os contatos:', e);
    }

    return res.render('dashboard', {
      error: instanceData.error,
      instance_data: instanceData.instance_data,
      whatsappStatus,
      whatsappIcon,
      profileImageUrl,
      totalChats,
      chave,
      dadoAssinatura,
      count: "Obtendo."
    });

  } catch (error) {
    console.error('Erro ao obter informações da instância:', error);
    return res.status(500).send('Erro interno do servidor');
  }
});


router.get('/conectar', async (req, res) => {
  const chave = req.query.chave; // Supondo que a chave esteja presente na query da URL
  let userEmail;
  try {
    const instanceResponse = await fetch(`http://localhost:3000/instance/info?key=${chave}`);
    const instanceData = await instanceResponse.json();


    if (instanceData.instance_data.email) {
      console.log(`Email do usuário ${chave} => ${instanceData.instance_data.email}`);
      userEmail = instanceData.instance_data.email;
    } else {
      return res.redirect('/adicionar-email');
    }

  } catch (error) {
    console.error('Erro ao buscar o email:', error);
    return res.status(500).send('Erro ao buscar seu email de compra.');
  }

  const emails_validos = await getEmailsAtivos()
 let dadoAssinatura = {}
  if(emails_validos.includes(userEmail)) {
    console.log("Login aprovado com sucesso!")
    let consultando = await consultarValidade(chave)
    dadoAssinatura = consultando
  } else {
res.redirect('/email-invalido')
  }


  try {
    const instanceResponse = await fetch(`http://localhost:3000/instance/info?key=${chave}`);
    const instanceData = await instanceResponse.json();

    if (instanceData.error === false && instanceData.instance_data.phone_connected) {
        // WhatsApp conectado, retornar HTML com imagem de perfil e status
        let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
        let numerorefatorado = instanceData.instance_data.user.id.split(":")[0];
        const profileResponse = await fetch(`http://localhost:3000/misc/downProfile?key=${chave}`, {
            method: 'POST',
            body: JSON.stringify({ id: numerorefatorado}),
            headers: { 'Content-Type': 'application/json' }
        });
        const profileData = await profileResponse.json();
        console.log(instanceData.instance_data.user.id.split(":")[0])
        console.log(profileData)
        if (profileData.error === false) {
            profileImageUrl = profileData.data;
        }

        const html = `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Conectado</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100 flex items-center justify-center h-screen">
    <div class="bg-white p-8 rounded-lg shadow-md text-center max-w-sm w-full">
        <h1 class="text-2xl font-bold text-gray-800 mb-6">WhatsApp Conectado</h1>
        <img src="${profileImageUrl}" alt="Perfil" class="w-32 h-32 mx-auto rounded-full object-cover mb-4 shadow-lg">
    </div>
</body>
</html>

        
        `;
        res.send(html);
    } else {
        // WhatsApp não conectado, enviar formulário para conectar
        const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Conectar WhatsApp</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body class="bg-gray-900 text-white flex items-center justify-center min-h-screen">
            <div class="container bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-lg">
                <h1 class="text-3xl font-bold text-center mb-6">Conectar WhatsApp</h1>
                <div class="content">
                    <h2 class="text-xl text-center mb-4">Informe seu número de telefone abaixo e clique em conectar</h2>
                    <form action="/conectar?chave=${chave}" method="post" class="space-y-4">
                        <input type="text" name="numero" placeholder="Digite seu número" class="w-full p-3 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500">
                        <button type="submit" class="w-full py-3 bg-green-600 rounded-md text-white font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">Conectar</button>
                    </form>
                    <div id="resposta" class="mt-4"></div>
                </div>
            </div>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const form = document.querySelector('form');
                    const respostaDiv = document.getElementById('resposta');
        
                    form.addEventListener('submit', async (event) => {
                        event.preventDefault();
        
                        const formData = new FormData(form);
                        const numero = formData.get('numero');
        
                        try {
                            const response = await fetch('/conectar?chave=${chave}', {
                                method: 'POST',
                                body: JSON.stringify({ numero }),
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            });
        
                            if (response.ok) {
                                const html = await response.text();
                                respostaDiv.innerHTML = html;
                            } else {
                                respostaDiv.textContent = 'Erro ao conectar WhatsApp';
                            }
                        } catch (error) {
                            respostaDiv.textContent = 'Erro interno do servidor';
                        }
                    });
                });
            </script>
        </body>
        </html>
        
        `;
        res.send(html);
    }
} catch (error) {
    res.status(500).send('Erro interno do servidor');
}
});

router.post('/conectar', async (req, res) => {
try {
    const numeroInput = req.body.numero;
    const chave = req.query.chave;
    const getCodeResponse = await fetch(`http://localhost:3000/instance/getcode?key=${chave}`, {
        method: 'POST',
        body: JSON.stringify({ number: numeroInput }),
        headers: { 'Content-Type': 'application/json' }
    });
    const getCodeData = await getCodeResponse.json();
console.log(getCodeData)
    if (getCodeData.error === false) {
        const code = getCodeData.code;
        const html = `<h1>Digite esse código de verificação no seu WhatsApp: ${code}</h1>`;
        res.send(html);
    } else {
        res.status(400).send('Erro ao obter código de verificação');
    }
} catch (error) {
  console.log(error)
    res.status(500).send('Erro interno do servidor');
}
});


router.get('/listchat/:chave', async (req, res) => {
  const chave = req.params.chave;
  try {
    // Requisição para obter os contatos
    const contactsResponse = await fetch(`http://localhost:3000/misc/contacts?key=${chave}`);
    const contactsData = await contactsResponse.json();
     res.json(contactsData)
  } catch(e) {
    console.log(e)
    res.json({})
  }


})


router.get('/editar', async (req, res) => {
  try {
    const key = req.query.key;
    const response = await axios.get(`http://localhost:3000/instance/gconfig?key=${key}`);
    const dados = response.data;

    res.render('editar', { dados, key });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).send('Erro interno do servidor');
  }
});


// --------- ROTAS E FUNÇÕES TYPEBOT FUNIS ----------------------//

function formatarTexto(richTextArray) {
  let result = richTextArray.reduce((accumulator, current, index, array) => {
    if (current.type === "a" && current.url) {
      return accumulator + current.children[0].text.trim() + " (" + current.url + ")\n";
    } else if (current.children && current.children[0] && current.children[0].text) {
      return accumulator + current.children[0].text.trim() + "\n";
    } else {
      // Adiciona quebra de linha se não for o último elemento ou se não for vazio
      return accumulator + (index !== array.length - 1 ? "\n" : "");
    }
  }, "");
  return result.trimEnd();
}

// Função para formatar para funil
function formatarParaFunil(json) {
  const funilName = json[0].result.data.json.typebot.name;
  const funilGroups = json[0].result.data.json.typebot.groups;

  const funilFormatado = {
    funilName: funilName,
    funil: [],
  };

  let sequencia = 0;

  funilGroups.forEach((group) => {
    group.blocks.forEach((block) => {
      sequencia++;

      let tipoMensagem, conteudo;

      switch (block.type) {
        case "text":
          tipoMensagem = "text";
          conteudo = formatarTexto(block.content.richText);
          break;
        case "Wait":
          tipoMensagem = "wait";
          conteudo = parseInt(block.options.secondsToWaitFor);
          break;
        case "image":
        case "video":
        case "audio":
          tipoMensagem = block.type;
          conteudo = block.content.url;
          break;
        default:
          tipoMensagem = "unknown";
          conteudo = null;
      }

      funilFormatado.funil.push({
        sequencia: sequencia,
        tipoMensagem: tipoMensagem,
        conteudo: conteudo,
      });
    });
  });

  return funilFormatado;
}

// Função para formatar para funil avançado
function formatarParaFunilAvancado(json) {
  const funilName = json[0].result.data.json.typebot.name;
  const funilGroups = json[0].result.data.json.typebot.groups;
  let input_total = 0;

  const funilFormatado = {
    funilName: "dinamico_" + funilName,
    funil: [],
    input_total: input_total,
    inputs_respostas: [],
  };

  let sequencia = 0;

  funilGroups.forEach((group) => {
    group.blocks.forEach((block) => {
      let tipoMensagem, conteudo, idInput;

      switch (block.type) {
        case "text input":
          sequencia++;
          tipoMensagem = "input";
          conteudo = block.options.labels.placeholder;
          idInput = block.options.variableId;
          input_total++;
          funilFormatado.inputs_respostas.push({
            input_id: idInput,
            resposta: null,
          });
          break;
        case "text":
          
          sequencia++;
          tipoMensagem = "text";
          idInput = block.id;
          if (block.content && block.content.richText) {
            conteudo = formatarTexto(block.content.richText);
            conteudo = conteudo.replace(/{{([^}]+)}}/g, (_, match) => {
              const variable = json[0].result.data.json.typebot.variables.find(v => v.name === match.trim());
              return variable ? `%var=${variable.id}%` : `%var=${match}%`;
            });
          } else {
            conteudo = "";
          }
          break;
        case "Wait":
          sequencia++;
          idInput = block.id;
          tipoMensagem = "wait";
          conteudo = parseInt(block.options.secondsToWaitFor);
          break;
        case "image":
        case "video":
        case "audio":
          sequencia++;
          idInput = block.id;
          tipoMensagem = block.type;
          conteudo = block.content.url;
          break;
        case "choice input":
          sequencia++;
          idInput = block.id;
          tipoMensagem = "choice";
          conteudo = {
            pergunta: block.content && block.content.richText && block.content.richText[0]?.children[0]?.text || "Escolha uma opção:",
            opcoes: block.items.map((item, index) => `${index + 1} - ${item.content}`),
            respostas: block.items.map(item => item.content)
          };
          funilFormatado.inputs_respostas.push({
            input_id: idInput,
            resposta: null,
          });
          break;
        default:
          sequencia++;
          tipoMensagem = "unknown";
          conteudo = null;
      }

      funilFormatado.funil.push({
        sequencia: sequencia,
        tipoMensagem: tipoMensagem,
        conteudo: conteudo,
        idInput: idInput,
      });
    });
  });

  funilFormatado.input_total = input_total;
  return funilFormatado;
}

async function obterDadosTypebot(key, url, dinamico) {
  // Extrai o ID da URL
  const regex = /typebots\/(\w+)\//;
  const match = url.match(regex);

  if (match && match[1]) {
    const typebotId = match[1];

    // Monta a URL da API com o ID obtido
    const apiUrl = `https://app.typebot.io/api/trpc/typebot.getTypebot?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22typebotId%22%3A%22${typebotId}%22%2C%22migrateToLatestVersion%22%3Atrue%7D%7D%7D`;

    // Configuração da requisição com Axios
    const config = {
      headers: {
        accept: "*/*",
        "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        // Adicione os headers restantes conforme necessário
      },
    };

    try {
      // Faz a requisição à API
      const response = await axios.get(apiUrl, config);
      //console.log(response.data[0].result.data.json)

      let resultadoFormatado;
      if (dinamico == false) {
        resultadoFormatado = await formatarParaFunil(response.data);
        console.log(resultadoFormatado);
      } else {
        resultadoFormatado = await formatarParaFunilAvancado(response.data);
        console.log(resultadoFormatado);
      }

      try {
        const response = await axios.post(`http://localhost:3000/instance/addtofirestore?key=` + key, resultadoFormatado, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('Resposta da API:', response.data);
      } catch (error) {
        console.error('Erro ao fazer requisição para a API:', error.response ? error.response.data : error.message);
      }


  

      return resultadoFormatado;
    } catch (error) {
      console.error("Erro na requisição à API:", error.message);
    }
  } else {
    console.error("ID não encontrado na URL fornecida.");
  }
}

router.post("/copiar-funil", async (req, res) => {
  const { key, funilLink, dinamico } = req.body;

  const funilData = await obterDadosTypebot(key, funilLink, dinamico);
  res.json(funilData);
});


router.get("/funil/:chave", (req, res) => {
  const key = req.params.chave;
  res.render("createfunil", { key });
});




router.get("/funis/:chave", async (req, res) => {
  const key = req.params.chave;
  try {
    const url = `http://localhost:3000/instance/displayallfunis?key=${key}`;
    const response = await axios.get(url);
    res.render("funis", { funis: response.data, key, urlapi });
  } catch (error) {
    console.error(error);
  }
});

// -------------------------------------------------------------- //


// --- GITHUB UPLOAD --------- //
const uploadToGitHub = async (buffer, filename, accessToken, username, repositoryName) => {
  const apiUrl = `https://api.github.com/repos/${username}/${repositoryName}/contents/${filename}`;
  const base64Data = buffer.toString('base64');

  // Verificar se o arquivo já existe
  let sha = '';
  const checkFileResponse = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `token ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (checkFileResponse.ok) {
    const checkFileData = await checkFileResponse.json();
    sha = checkFileData.sha;
  }

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Upload do arquivo',
      content: base64Data,
      sha: sha,
    }),
  });

  if (response.ok) {
    const responseData = await response.json();
    return responseData.content.download_url;
  } else {
    const errorData = await response.json();
    throw new Error(`Erro ao fazer upload para o GitHub: ${errorData.message}`);
  }
};




router.post('/uploadfunil', upload.none(), async (req, res) => {
  const chave = req.body.chave;
  const db = client.db('hot_funis');
const funilCollection = db.collection(chave);


  const nome = req.body.nome;
  let elementos = req.body.elementos;

  try {
    elementos = JSON.parse(elementos);
    if (!Array.isArray(elementos)) {
      throw new Error('Invalid format for elementos');
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON format for elementos' });
  }

  const funilAtualizado = { nome, elementos: elementos };

  try {
    await funilCollection.insertOne(funilAtualizado);
    console.log('Funil salvo com sucesso:', funilAtualizado);
    res.json(funilAtualizado);
  } catch (error) {
    console.error('Erro ao salvar funil no MongoDB', error);
    res.status(500).json({ error: 'Erro ao salvar funil no MongoDB' });
  }
});


const uploadToGitHub2 = async (base64Data, filename, accessToken, username, repositoryName) => {
  const apiUrl = `https://api.github.com/repos/${username}/${repositoryName}/contents/${filename}`;

  // Verificar se o arquivo já existe
  let sha = '';
  const checkFileResponse = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `token ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (checkFileResponse.ok) {
    const checkFileData = await checkFileResponse.json();
    sha = checkFileData.sha;
  }

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Upload do arquivo',
      content: base64Data,
      sha: sha,
    }),
  });

  if (response.ok) {
    const responseData = await response.json();
    return responseData.content.download_url;
  } else {
    const errorData = await response.json();
    throw new Error(`Erro ao fazer upload para o GitHub: ${errorData.message}`);
  }
};

const fspro = require('fs').promises; // Adiciona 'promises' aqui
router.post('/uploadSingleFile', upload.single('file'), async (req, res) => {
  console.log('Received file:', req.file);
  const accessToken = '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';
  const username = 'higorkkjx';
  const repositoryName = 'uploads';

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = path.resolve(req.file.path);
    const fileBuffer = await fspro.readFile(filePath);
    const base64Data = fileBuffer.toString('base64');
  // Função para gerar um caractere aleatório
function gerarCaractereAleatorio() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return caracteres.charAt(Math.floor(Math.random() * caracteres.length));
}

// Função para gerar uma string aleatória de no máximo 4 dígitos
function gerarStringAleatoria(tamanhoMaximo = 4) {
  const tamanho = Math.floor(Math.random() * tamanhoMaximo) + 1;
  let stringAleatoria = '';
  for (let i = 0; i < tamanho; i++) {
      stringAleatoria += gerarCaractereAleatorio();
  }
  return stringAleatoria;
}

// Exemplo de uso
const stringAleatoria = await gerarStringAleatoria();
console.log(`String aleatória de no máximo 4 dígitos: ${stringAleatoria}`);

    const url = await uploadToGitHub2(base64Data, stringAleatoria + req.file.originalname, accessToken, username, repositoryName);
    res.json({ url: url });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});



function organizarElementos(elementos) {
  const elementosMap = new Map(elementos.map(el => [el.id, { ...el, next: null }]));
  let inicio = null;

  // Estabelecer as conexões
  elementos.forEach(el => {
    if (el.conexoes && el.conexoes.length > 0) {
      const proximoId = el.conexoes[0]; // Assumindo que cada elemento se conecta a no máximo um outro
      elementosMap.get(el.id).next = elementosMap.get(proximoId);
    }
  });

  // Encontrar o elemento inicial (que não é alvo de nenhuma conexão)
  inicio = elementos.find(el => !elementos.some(outro => outro.conexoes.includes(el.id)));

  // Ordenar os elementos
  const elementosOrdenados = [];
  let atual = elementosMap.get(inicio.id);
  while (atual) {
    elementosOrdenados.push(atual);
    atual = atual.next;
  }

  // Remover a propriedade 'next' antes de retornar
  return elementosOrdenados.map(({ next, ...resto }) => resto);
}

router.get('/api/funis/:chave', async (req, res) => {
  const chave = req.params.chave;
  const db = client.db('hot_funis');
  const funilCollection = db.collection(chave);

  try {
    const funis = await funilCollection.find({}).toArray();
    const funisOrganizados = funis.map(funil => ({
      ...funil,
      elementos: organizarElementos(funil.elementos)
    }));

    res.json(funisOrganizados);
  } catch (error) {
    console.error('Erro ao buscar funis:', error);
    res.status(500).json({ error: 'Erro ao buscar funis' });
  }
});

router.get('/api/funis/:chave/:id', async (req, res) => {
  const { chave, id } = req.params;
  const db = client.db('hot_funis');
  const funilCollection = db.collection(chave);

  try {
    const funil = await funilCollection.findOne({ _id: new ObjectId(id) });
    if (!funil) {
      return res.status(404).json({ error: 'Funil não encontrado' });
    }

    const funilOrganizado = {
      ...funil,
      elementos: organizarElementos(funil.elementos)
    };

    res.json(funilOrganizado);
  } catch (error) {
    console.error('Erro ao buscar funil:', error);
    res.status(500).json({ error: 'Erro ao buscar funil' });
  }
});

router.get('/funisboard/:chave', async (req, res) => {
  const chave = req.params.chave;
  const db = client.db('hot_funis');
  const funilCollection = db.collection(chave);

  try {
    const funis = await funilCollection.find({}).toArray();
    res.render('funisboard', { funis, chave });
  } catch (error) {
    console.error('Erro ao buscar funis:', error);
    res.status(500).send('Erro ao buscar funis');
  }
});

router.post('/deletar-funil/:chave/:nome', async (req, res) => {
  const { chave, nome } = req.params;
  const db = client.db('hot_funis');
  const funilCollection = db.collection(chave);
console.log(funilCollection)
  try {
    console.log(`Tentando deletar o funil com nome: ${nome} na coleção: ${chave}`);
    const result = await funilCollection.deleteOne({ nome: nome });

    if (result.deletedCount === 0) {
      console.log(`Nenhum funil encontrado com o nome: ${nome} na coleção: ${chave}`);
      return res.status(404).send('Funil não encontrado');
    }

    console.log(`Funil com nome: ${nome} deletado com sucesso na coleção: ${chave}`);
    res.redirect(`/funisboard/${chave}`);
  } catch (error) {
    console.error('Erro ao deletar funil:', error);
    res.status(500).send('Erro ao deletar funil');
  }
});




router.get("/hospedar", (req, res) => {
  res.send(`<!DOCTYPE html>
  <html lang="pt-br">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hospedar Vídeo</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  <body class="bg-gray-100 font-sans">
  
  <div class="container mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div class="text-center">
          <img src="https://i.pinimg.com/564x/0c/cd/6a/0ccd6a5e74067bab2d43b4c3e7501fd1.jpg" alt="Imagem Centralizada"
               class="rounded-full mx-auto mt-8 shadow-md w-48">
          <h1 class="text-3xl font-semibold text-blue-500 mt-4">Hospedar Vídeo</h1>
          <p class="mt-4">Com essa função você consegue transformar seus vídeos em URL para usar no Typebot. Basta enviar um vídeo abaixo e irei te retornar um link para você colar no Typebot!</p>
      </div>
  
      <form action="/hospedar" method="post" enctype="multipart/form-data" class="mt-6 text-center">
          <label for="videoFile" class="block font-bold mb-2">Selecione o vídeo:</label>
          <input type="file" id="videoFile" name="videoFile" accept="video/*" required
                 class="block mx-auto mb-4 px-4 py-2 border border-blue-500 rounded-lg shadow-md w-full sm:w-3/4 md:w-2/4 lg:w-1/2">
          <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300">Hospedar</button>
      </form>
  
      <div id="result" class="text-center mt-6"></div>
  </div>
  
  </body>
  </html>
  
  `); // Substitua 'index.html' pelo caminho do seu arquivo HTML
});

// Rota para lidar com o POST do formulário
const uploadxs = multer({ dest: "uploads/" }); // Configura o multer para armazenar arquivos em 'uploads/'
router.post("/hospedar", uploadxs.single("videoFile"), async (req, res) => {
  try {
    const buffer = fs.readFileSync(req.file.path);
    const filename = await uuidv4();

    const rawUrl = await uploadToGitHub(
      buffer,
      filename + ".mp4",
      "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",
      "higorkkjx",
      "uploads2",
    );

    linkFinal =
      "https://raw.githubusercontent.com/higorkkjx/uploads2/main/" +
      rawUrl.replace("https://github.com/higorkkjx/uploads2/blob/main/", "");

    res.send(`<!DOCTYPE html>
      <html lang="pt-br">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vídeo hospedado com sucesso!</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f5f5f5;
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
              }
      
              .container {
                  background-color: #fff;
                  padding: 20px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                  text-align: center;
                  max-width: 80%;
                  margin: 0 auto;
              }
      
              h1 {
                  color: #333;
                  margin-bottom: 20px;
              }
      
              p {
                  color: #666;
                  font-size: 18px;
                  line-height: 1.5;
                  margin-bottom: 20px;
              }
      
              a {
                color: #007bff;
                text-decoration: none;
                word-wrap: break-word; /* Adicionado para quebrar a URL longa */
                max-width: 100%; /* Adicionado para limitar o tamanho do texto */
                display: inline-block; /* Adicionado para garantir o efeito de quebra de palavra */
            }
      
              a:hover {
                  text-decoration: underline;
              }
      
              button {
                  background-color: #007bff;
                  color: #fff;
                  border: none;
                  border-radius: 5px;
                  padding: 10px 20px;
                  cursor: pointer;
                  transition: background-color 0.3s;
              }
      
              button:hover {
                  background-color: #0056b3;
              }
      
              .image-container {
                  margin-top: 20px;
              }
      
              .rounded-image {
                  border-radius: 50%;
                  max-width: 50%;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
          </style>
      </head>
      <body>
      <div class="container">
      <div class="image-container">
      <img src="https://i.pinimg.com/564x/0c/cd/6a/0ccd6a5e74067bab2d43b4c3e7501fd1.jpg" alt="Imagem Centralizada"
           class="rounded-image">
  </div>
          <h1>Vídeo hospedado com sucesso!</h1>
          <p>URL RAW: <a href="${linkFinal}" id="videoUrl" target="_blank">${linkFinal}</a></p>
          <button onclick="copyToClipboard()" id="copyButton">Copiar Link</button>
      
          <!-- Image Container with Rounded Image and Box Shadow -->
        
      </div>
      
      <script>
          function copyToClipboard() {
              const videoUrl = document.getElementById("videoUrl");
              const tempInput = document.createElement("input");
              tempInput.value = videoUrl.href;
              document.body.appendChild(tempInput);
              tempInput.select();
              document.execCommand("copy");
              document.body.removeChild(tempInput);
      
              const copyButton = document.getElementById("copyButton");
              copyButton.innerText = "Link Copiado!";
          }
      </script>
      </body>
      </html>
      
      `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao hospedar o vídeo.");
  }
});

//GERAR GRUPO
router.get('/gerargp/:chave', async (req, res) => {
  const key = req.params.chave;
  res.send(`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerador de Grupos</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  <body class="bg-gray-100 p-8">
    <div class="max-w-md mx-auto bg-white p-8 rounded shadow-md">
      <h1 class="text-3xl font-semibold mb-4">Gerador de Grupos</h1>
      <button id="gerarGrupo" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
        Gerar Grupo
      </button>
      <div id="grupoInfo" class="mt-4 hidden">
        <h2 class="text-xl font-semibold mb-2">Grupo Criado:</h2>
        <p id="grupoDesc" class="text-gray-700 mb-2"></p>
        <a id="entrarGrupo" href="#" target="_blank" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-block">
          Entrar no Grupo
        </a>
      </div>
      <p id="erroMsg" class="text-red-500 mt-4 hidden">Erro ao obter dados do grupo.</p>
    </div>
  
    <script>
      document.getElementById('gerarGrupo').addEventListener('click', async () => {
        try {
          const response = await fetch('http://localhost:3000/instance/gerargp?key=${key}');
          const data = await response.json();
          if (data.linkgp && data.resp) {
            document.getElementById('grupoDesc').textContent = data.resp.desc;
            document.getElementById('entrarGrupo').href = data.linkgp;
            document.getElementById('grupoInfo').classList.remove('hidden');
            document.getElementById('erroMsg').classList.add('hidden');
          } else {
            throw new Error('Resposta inválida da API');
          }
        } catch (error) {
          console.error(error);
          document.getElementById('erroMsg').classList.remove('hidden');
          document.getElementById('grupoInfo').classList.add('hidden');
        }
      });
    </script>
  </body>
  </html>
  `)
})


//AUTORESPOSTA
router.get('/autoresposta/dados/:key/:num', async (req, res) => {
  const key = req.params.key;
  const num = req.params.num;
console.log(num)
  try {
    ;
    const database = client.db('perfil');
    const configCollection = database.collection('config');
    const configCollection2 = database.collection(`funilresp_${key}`);

    const doc = await configCollection.findOne({ _id: `autoresp_${key}` });

    let doc2;
    const doc3 = await configCollection2.findOne({ _id: `${num}` });
    console.log(doc3);
    
    if (doc3 !== null) {
        doc2 = doc3;
    } else {
        doc2 = await configCollection2.findOne({ _id: `padrao` });
    }
    
   

    console.log(doc2)

    res.json({
      autoresposta: doc ? doc.autoresposta : null,
      funil: doc2 ? doc2.funil : null
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).send('Erro ao obter dados.');
  } finally {

  }
});


router.post('/start-spamoffer', async (req, res) => {
  const { chave, listName, funilName, spamCount, waitTime, ignoreAlreadySent } = req.body;

  try {
    const db1 = client.db('contatos');
    const contactLists = db1.collection(chave);

    // Obter a lista de contatos selecionada
    const selectedList = await contactLists.findOne({ name: listName });
    if (!selectedList) {
      return res.status(404).send('Lista de contatos não encontrada');
    }

    // Limitar a quantidade de contatos conforme especificado
    const contactsToSpam = selectedList.contacts.slice(0, spamCount);

    const spamId = uuidv4();
    
    // Iniciar o processo de spam em background
    spamOffer(chave, funilName, contactsToSpam, waitTime, ignoreAlreadySent, spamId);

    res.json({ redirectUrl: `/spam-metrics/${chave}/${spamId}` });
  } catch (error) {
    console.error('Erro ao iniciar spam offer:', error);
    res.status(500).send('Erro ao iniciar spam offer');
  }
});


router.post('/start-spamoffer2', async (req, res) => {
  const { chave, listName, funilName, spamCount, waitTime } = req.body;

  try {
    const db1 = client.db('contatos');
    const contactLists = db1.collection(chave);

    // Obter a lista de contatos selecionada
    const selectedList = await contactLists.findOne({ name: listName });
    if (!selectedList) {
      return res.status(404).send('Lista de contatos não encontrada');
    }

    // Limitar a quantidade de contatos conforme especificado
    const contactsToSpam = selectedList.contacts.slice(0, spamCount);

    // Iniciar o processo de spam
    spamOffer(chave, funilName, contactsToSpam, waitTime);

    res.send('Spam offer iniciado com sucesso');
  } catch (error) {
    console.error('Erro ao iniciar spam offer:', error);
    res.status(500).send('Erro ao iniciar spam offer');
  }
});




router.delete('/api/delete-metrics/:chave/:spamId', async (req, res) => {
  const { chave, spamId } = req.params;
  const metricsCollection = client.db('spam_metrics').collection(chave);
  
  try {
    await metricsCollection.deleteOne({ _id: spamId });
    res.status(200).json({ message: 'Métricas apagadas com sucesso' });
  } catch (error) {
    console.error('Erro ao apagar métricas:', error);
    res.status(500).json({ error: 'Erro ao apagar métricas' });
  }
});

async function spamOffer(key, funilName, contacts, waitTime, ignoreAlreadySent, spamId) {
  const db11 = client.db('spam');
  const sentCollection = db11.collection(`sent_${key}`);
  const metricsCollection = client.db('spam_metrics').collection(key);

  async function checkIfSent(contact, funilName) {
    const sent = await sentCollection.findOne({ contact, funilName });
    return !!sent;
  }

  async function markAsSent(contact, funilName) {
    await sentCollection.updateOne(
      { contact, funilName },
      { $set: { sentAt: new Date() } },
      { upsert: true }
    );
  }

  async function updateMetrics(updateData) {
    await metricsCollection.updateOne(
      { _id: spamId },
      { $set: updateData },
      { upsert: true }
    );
  }

  const totalCount = contacts.length;
  let sentCount = 0;

  // Inicializar métricas
  await updateMetrics({
    sentCount: 0,
    totalCount,
    funilName,
    nextSendTime: moment().add(waitTime, 'seconds').tz('America/Sao_Paulo').format(),
    status: 'iniciado'
  });

  for (const contact of contacts) {
    try {
      if (ignoreAlreadySent && await checkIfSent(contact, funilName)) {
        console.log(`Ignorando contato já enviado: ${contact}`);
        continue;
      }

      const response = await axios.get(`http://localhost:3000/instance/sendfunil`, {
        params: {
          key: key,
          funil: funilName,
          chat: `${contact}@s.whatsapp.net`,
          visuunica: false
        }
      });

      if (response.status === 200) {
        await markAsSent(contact, funilName);
        sentCount++;

        // Atualizar métricas no MongoDB
        await updateMetrics({
          sentCount,
          nextSendTime: moment().add(waitTime, 'seconds').tz('America/Sao_Paulo').format(),
        });

        console.log(`Mensagem enviada com sucesso para ${contact}`);
      } else {
        console.error(`Erro ao enviar para ${contact}: Status ${response.status}`);
      }

      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    } catch (error) {
      console.error(`Erro ao enviar para ${contact}:`, error.message);
    }
  }

  // Atualizar status para concluído
  await updateMetrics({ status: 'concluído' });
  console.log('Spam offer concluído');
}
router.get('/api/spam-metrics/:chave/:spamId', async (req, res) => {
  const { chave, spamId } = req.params;
  const metricsCollection = client.db('spam_metrics').collection(chave);
  
  try {
    const metrics = await metricsCollection.findOne({ _id: spamId });
    
    if (!metrics) {
      return res.status(404).json({ error: 'Métricas não encontradas' });
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

async function updateSpamMetrics(key, spamId, metrics) {
  const metricsCollection = client.db('spam_metrics').collection(key);
  try {
    const result = await metricsCollection.updateOne(
      { _id: spamId },
      { $set: metrics },
      { upsert: true }
    );
    console.log(`Métricas atualizadas para spamId: ${spamId}. Resultado:`, result);
    
    // Verificar se o documento foi criado ou atualizado
    const updatedMetrics = await metricsCollection.findOne({ _id: spamId });
    console.log(`Métricas atuais para spamId: ${spamId}:`, updatedMetrics);
    
    return updatedMetrics;
  } catch (error) {
    console.error(`Erro ao atualizar métricas para spamId: ${spamId}:`, error);
    throw error;
  }
}
/*/
async function spamOffer(key, funilName, contacts, waitTime) {
  for (const contact of contacts) {
    try {
      //await sendfunil(key, funilName, contact, 'false');

      await axios.get(`http://localhost:3000/instance/sendfunil?key=${key}&funil=${funilName}&chat=${contact}@s.whatsapp.net&visuunica=false`)
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    } catch (error) {
      console.error(`Erro ao enviar para ${contact}:`, error);
    }
  }
  console.log('Spam offer concluído');
}
/*/
router.get('/spamoffer/:chave', async (req, res) => {
  const { chave } = req.params;
  const db1 = client.db('contatos');
  const contactLists = db1.collection(chave);

  try {
    // Obter listas de contatos
    const lists = await contactLists.find({}).toArray();
    
    // Obter funis da API
    const funisResponse = await axios.get(`http://localhost:3000/instance/displayallfunis?key=${chave}`);
    const funis = funisResponse.data;

    // Renderizar o HTML
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Spam Offer</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@3.1.0/dist/full.css" rel="stylesheet" type="text/css" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="container mx-auto max-w-md">
          <h1 class="text-2xl font-bold mb-6">Spam Offer</h1>
          
          <form id="spamForm" class="space-y-4">
            <div>
              <label for="listSelector" class="block mb-2">Selecione a lista de contatos:</label>
              <select id="listSelector" class="select select-bordered w-full">
                ${lists.map(list => `<option value="${list.name}" data-contacts="${list.contacts.length}">${list.name}</option>`).join('')}
              </select>
            </div>

            <div>
              <label for="spamCount" class="block mb-2">Quantidade de chats para spam:</label>
              <input type="number" id="spamCount" class="input input-bordered w-full" value="${lists[0]?.contacts.length || 0}">
            </div>

            <div>
              <label for="funilSelector" class="block mb-2">Selecione o funil:</label>
              <select id="funilSelector" class="select select-bordered w-full">
                ${funis.map(funil => `<option value="${funil.funilName}">${funil.funilName}</option>`).join('')}
              </select>
            </div>

            <div>
              <label for="waitTime" class="block mb-2">Tempo de espera (segundos):</label>
              <input type="number" id="waitTime" class="input input-bordered w-full" value="5">
            </div>
<div class="form-control">
  <label class="label cursor-pointer">
    <span class="label-text">Ignorar já enviados</span> 
    <input type="checkbox" id="ignoreAlreadySent" class="checkbox" />
  </label>
</div>
            <button type="submit" class="btn btn-primary w-full">Iniciar Spam Offer</button>
          </form>
        </div>

        <script>
          const listSelector = document.getElementById('listSelector');
          const spamCount = document.getElementById('spamCount');

          listSelector.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            spamCount.value = selectedOption.dataset.contacts;
          });

         
        </script>
       
<script>
 
  const funilSelector = document.getElementById('funilSelector');
  const waitTime = document.getElementById('waitTime');
  const spamForm = document.getElementById('spamForm');

 

 document.getElementById('spamForm').addEventListener('submit', async(e) => {
            e.preventDefault();
    const chave = '${chave}'; // Obtenha a chave da URL
    const listName = listSelector.value;
    const funilName = funilSelector.value;
    const count = parseInt(spamCount.value);
    const wait = parseInt(waitTime.value);

    try {
      const response = await fetch('/start-spamoffer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chave,
          listName,
          funilName,
          spamCount: count,
          waitTime: wait,
        }),
      });

      if (response.ok) {
       const data = await response.json();
      window.location.href = data.redirectUrl;
      } else {
        alert('Erro ao iniciar spam offer. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao iniciar spam offer. Por favor, tente novamente.');
    }
  });
</script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Erro ao obter dados:', error);
    res.status(500).send('Erro ao carregar a página');
  }
});



router.get('/spam-metrics/:chave/:spamId', async (req, res) => {
  const { chave, spamId } = req.params;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Métricas de Spam</title>
      <link href="https://cdn.jsdelivr.net/npm/daisyui@3.1.0/dist/full.css" rel="stylesheet" type="text/css" />
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.33/moment-timezone-with-data.min.js"></script>
    </head>
    <body class="bg-gray-100 p-8">
      <div class="container mx-auto max-w-4xl">
      <div id="loadingMessage" class="text-center py-4">Carregando métricas...</div>
        <h1 class="text-3xl font-bold mb-6">Métricas de Spam</h1>
        
        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-white p-4 rounded shadow">
            <h2 class="text-xl font-semibold mb-2">Progresso</h2>
            <div class="flex justify-between items-center">
              <span id="sentCount">0</span>
              <progress id="progressBar" class="progress progress-primary w-56" value="0" max="100"></progress>
              <span id="totalCount">0</span>
            </div>
          </div>
          <div class="bg-white p-4 rounded shadow">
  <h2 class="text-xl font-semibold mb-2">Próximo envio em</h2>
  <div class="text-4xl font-bold text-center" id="nextSendTime">00:00:00</div>
</div>
        </div>
        
        <div class="bg-white p-4 rounded shadow mb-8">
          <h2 class="text-xl font-semibold mb-2">Detalhes do Funil</h2>
          <p id="funilName" class="text-lg">Nome do Funil: -</p>
        </div>
        
       <div class="bg-white p-4 rounded shadow mb-8" style="height: 300px;">
  <h2 class="text-xl font-semibold mb-4">Gráfico de Envios</h2>
  <canvas id="sendChart"></canvas>
</div>
      </div>

      <script>
        const spamId = '${spamId}'
        const chave = '${chave}'
        

        let nextSendTimestamp;

        function updateCountdown() {
  if (!nextSendTimestamp) return;

  const now = moment();
  const diff = moment.duration(moment(nextSendTimestamp).diff(now));

  if (diff.asSeconds() <= 0) {
    document.getElementById('nextSendTime').textContent = "Enviando...";
  } else {
    const hours = diff.hours().toString().padStart(2, '0');
    const minutes = diff.minutes().toString().padStart(2, '0');
    const seconds = diff.seconds().toString().padStart(2, '0');
    document.getElementById('nextSendTime').textContent = hours + ':' + minutes + ':' + seconds
  }
}

        // Função para atualizar as métricas
     async function updateMetrics() {
  try {
    const response = await fetch('/api/spam-metrics/${chave}/${spamId}');
    if (!response.ok) {
      throw new Error(response.status);
    }
    const data = await response.json();
    
    if (data.error) {
      console.error('Erro ao obter métricas:', data.error);
      document.getElementById('loadingMessage').textContent = 'Erro: ' + data.error
      return;
    }
    
    document.getElementById('sentCount').textContent = data.sentCount || 0;
    document.getElementById('totalCount').textContent = data.totalCount || 0;
    
    const progress = data.totalCount > 0 ? (data.sentCount / data.totalCount) * 100 : 0;
    document.getElementById('progressBar').value = isFinite(progress) ? progress : 0;
    
    // Formatando a hora para o fuso horário de São Paulo
   // const nextSendTime = moment(data.nextSendTime).format('HH:mm:ss');
    //document.getElementById('nextSendTime').textContent = nextSendTime;
    
     nextSendTimestamp = moment(data.nextSendTime).valueOf();

    document.getElementById('funilName').textContent = 'Nome do Funil: ' + data.funilName
    
    // Atualizar o gráfico
    sendChart.data.datasets[0].data = [
      data.sentCount || 0,
      (data.totalCount || 0) - (data.sentCount || 0)
    ];
    sendChart.update();
    
    document.getElementById('loadingMessage').style.display = 'none';
    
    if (data.status === 'concluído' || data.status === 'erro') {
      clearInterval(updateInterval);
  clearInterval(countdownInterval);
      document.getElementById('status').textContent = 'Status: ' + data.status
      
      // Apagar métricas após conclusão
      if (data.status === 'concluído') {
        await fetch('/api/delete-metrics/${chave}/${spamId}', { method: 'DELETE' });
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar métricas:', error);
    document.getElementById('loadingMessage').textContent = 'Erro ao carregar métricas: ' + error.message
  }
}
        
       const ctx = document.getElementById('sendChart').getContext('2d');
const sendChart = new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ['Enviados', 'Restantes'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#36A2EB', '#FF6384']
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});
        
        // Iniciar atualização das métricas a cada 5 segundos
const updateInterval = setInterval(updateMetrics, 5000);

// Iniciar a contagem regressiva, atualizando a cada segundo
const countdownInterval = setInterval(updateCountdown, 1000);

// Chamar imediatamente pela primeira vez
updateMetrics();
      </script>
    </body>
    </html>
  `);
});

// /autoresposta/:key
router.get('/autoresposta/:key', async (req, res) => {
  const key = req.params.key;
  

  try {
      
      const database = client.db('perfil');
      const configCollection = database.collection('config');

      const doc = await configCollection.findOne({ _id: `autoresp_${key}` });
      const autorespostaAtivada = doc ? doc.autoresposta : false;

      const response = await fetch(`http://localhost:3000/instance/displayallfunis?key=${key}`);
      const funis = await response.json();
      res.render('autoresposta', { autorespostaAtivada, key, funis });
  } catch (error) {
      console.error('Erro ao verificar a autoresposta:', error);
      res.status(500).send('Erro ao verificar a autoresposta.');
  }
});

// /api/salvar-funil/:key
router.post('/api/salvar-funil-user/:key/:num', async (req, res) => {
  const key = req.params.key;
  const num = req.params.num;
  
  const funilSelecionado = req.body.funil;

  try {
      
      const database = client.db('perfil');
      const configCollection = database.collection(`funilresp_${key}`);

      await configCollection.updateOne(
          { _id: `${num}` },
          { $set: { funil: funilSelecionado } },
          { upsert: true }
      );

      res.json({ success: true });
  } catch (error) {
      console.error('Erro ao salvar o funil:', error);
      res.status(500).json({ success: false, error: 'Erro ao salvar o funil' });
  }
});

router.post('/api/salvar-funil/:key', async (req, res) => {
  const key = req.params.key;
  const funilSelecionado = req.body.funil;

  try {
    ;
    const database = client.db('perfil');
    const configCollection = database.collection(`funilresp_${key}`);

 
    await configCollection.deleteMany({});

    await configCollection.updateMany(
      { _id: `padrao` },
      { $set: { funil: funilSelecionado } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar o funil:', error);
    res.status(500).json({ success: false, error: 'Erro ao salvar o funil' });
  } finally {

  }
});


// /api/autoresposta/:key
router.post('/api/autoresposta/:key', async (req, res) => {
  const key = req.params.key;
  const num = req.params.num;

  try {
      
      const database = client.db('perfil');
      const configCollection = database.collection('config');

      const doc = await configCollection.findOne({ _id: `autoresp_${key}` });

      if (doc) {
          await configCollection.updateOne(
              { _id: `autoresp_${key}` },
              { $set: { autoresposta: !doc.autoresposta } }
          );
      } else {
          await configCollection.insertOne(
              { _id: `autoresp_${key}`, autoresposta: true }
          );
      }

      res.json({ success: true });
  } catch (error) {
      console.error('Erro ao alternar a autoresposta:', error);
      res.status(500).json({ success: false, error: 'Erro ao alternar a autoresposta' });
  }
});

// /clearchats/:key
router.get('/clearchats/:key', async (req, res) => {
  const key = req.params.key;

  try {
    const database = client.db('perfil');
    const chatCollection = database.collection(`chatis_${key}`);
    const result = await chatCollection.deleteMany({});
    const count = result.deletedCount;

    res.send(`
      <!DOCTYPE html>
      <html lang="en" data-theme="light">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chats Limpos</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/daisyui@2.51.5/dist/full.css" rel="stylesheet" type="text/css" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Poppins', sans-serif;
          }
        </style>
      </head>
      <body class="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-purple-100">
        <div class="text-center p-8 bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
          <div class="mb-6">
            <i class="fas fa-broom text-5xl text-primary"></i>
          </div>
          <h1 class="text-3xl font-bold mb-4 text-gray-800">Chats Limpos!</h1>
          <p class="mb-6 text-lg text-gray-600">
            Um total de <span class="font-semibold text-primary">${count}</span> chats foram deletados com sucesso.
          </p>
          <img src="https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif" alt="Limpeza concluída" class="mx-auto rounded-lg shadow-md mb-6">
          <a href="/home/${key}" class="btn btn-primary">Voltar ao Dashboard</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Erro ao deletar dados:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en" data-theme="light">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erro</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/daisyui@2.51.5/dist/full.css" rel="stylesheet" type="text/css" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Poppins', sans-serif;
          }
        </style>
      </head>
      <body class="flex items-center justify-center min-h-screen bg-gradient-to-r from-red-100 to-orange-100">
        <div class="text-center p-8 bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
          <div class="mb-6">
            <i class="fas fa-exclamation-triangle text-5xl text-error"></i>
          </div>
          <h1 class="text-3xl font-bold mb-4 text-gray-800">Erro</h1>
          <p class="mb-6 text-lg text-gray-600">
            Ocorreu um erro ao tentar deletar os dados. Por favor, tente novamente mais tarde.
          </p>
          <a href="/home/${key}" class="btn btn-error">Voltar ao Dashboard</a>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
