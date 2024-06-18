// instanceRoutes.js

const express = require("express");
const router = express.Router();
const axios = require("axios")
const { WhatsAppInstance, db, client } = require('../api/class/instance');
const moment = require("moment-timezone");
const multer = require("multer");
const fs = require("fs")

const urlapi = process.env.urlapi

const { v4: uuidv4 } = require("uuid");

async function checkWhatsApp(chave) {
  const instanceResponse = await fetch(`http://evolucaohot.online/instance/info?key=${chave}`);
  const instanceData = await instanceResponse.json();

  let whatsappStatus = '';
  let whatsappIcon = '';
  let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
  let codeMessage = '';

  if (instanceData.error === false && instanceData.instance_data.phone_connected) {
      whatsappStatus = 'WhatsApp conectado';
      whatsappIcon = 'fa-whatsapp';

      // Requisição para baixar o perfil
      const profileResponse = await fetch(`http://evolucaohot.online/misc/downProfile?key=${chave}`, {
          method: 'POST',
          body: JSON.stringify({ id: instanceData.instance_data.user.id.replace(":5@s.whatsapp.net", "") }),
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
      const getCodeResponse = await fetch(`http://evolucaohot.online/instance/getcode?key=${chave}&number=${NUMEROINPUT}`, {
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
  const validade = moment().add(parseInt(dias), "days").toDate();

  try {
     
      const database = client.db('hotboard');
      const assinaturas = database.collection('assinaturas');

      await assinaturas.insertOne({ email, nome, validade, ativo: true });
      res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
      res.send(err.message);
  }
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
     
      const database = client.db('hotboard');
      const assinaturas = database.collection('assinaturas');

      const snapshot = await assinaturas.find({ ativo: true }).toArray();
      const emailsAtivos = [];

      const dataAtualSP = moment().tz("America/Sao_Paulo");

      for (const doc of snapshot) {
          if (moment(doc.validade).isBefore(dataAtualSP)) {
              await assinaturas.updateOne({ _id: doc._id }, { $set: { ativo: false } });
          } else {
              emailsAtivos.push(doc.email);
          }
      }

      return emailsAtivos;
  } catch (err) {
      console.error(err);
      return [];
  }
}

// Função para consultar validade
async function consultarValidade(email) {
  try {
     
      const database = client.db('hotboard');
      const assinaturas = database.collection('assinaturas');

      const snapshot = await assinaturas.findOne({ email });

      if (snapshot) {
          const dataVencimento = snapshot.validade;
          const dia = dataVencimento.getDate();
          const mes = dataVencimento.getMonth() + 1;

          // Buscar o nome de usuário correspondente ao email
          const nomeUsuario = snapshot.nome || "Usuário"; // Se não encontrar o nome, usa "Usuário" como padrão

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
    const response = await fetch(`http://evolucaohot.online/instance/addmail?email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}`);
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
    const responseEmail = await fetch(`http://evolucaohot.online/instance/getmail?key=${encodeURIComponent(chave)}`);
    const dataEmail = await responseEmail.json();
  
    if (dataEmail.email) {
      console.log(`Email do usuário ${chave} => ${dataEmail.email}`);
      userEmail = dataEmail.email
    } else {
      res.redirect('/adicionar-email');
    }
  } catch (error) {
    console.error('Erro ao buscar o email:', error);
    res.status(500).send('Erro ao buscar seu email de compra.');
  }

  const emails_validos = await getEmailsAtivos()
 let dadoAssinatura = {}
  if(emails_validos.includes(userEmail)) {
    console.log("Login aprovado com sucesso!")
    let consultando = await consultarValidade(userEmail)
    dadoAssinatura = consultando
  } else {
res.redirect('/email-invalido')
  }


  let totalChats = 0
  try {
    // Requisição para obter os contatos
    const contactsResponse = await fetch(`http://evolucaohot.online/misc/contacts?key=${chave}`);
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
  try {
    const responseEmail = await fetch(`http://evolucaohot.online/instance/getmail?key=${encodeURIComponent(chave)}`);
    const dataEmail = await responseEmail.json();
  
    if (dataEmail.email) {
      console.log(`Email do usuário ${chave} => ${dataEmail.email}`);
      userEmail = dataEmail.email
    } else {
      res.redirect('/adicionar-email');
    }
  } catch (error) {
    console.error('Erro ao buscar o email:', error);
    res.status(500).send('Erro ao buscar seu email de compra.');
  }

  const emails_validos = await getEmailsAtivos()
 let dadoAssinatura = {}
  if(emails_validos.includes(userEmail)) {
    console.log("Login aprovado com sucesso!")
    let consultando = await consultarValidade(userEmail)
    dadoAssinatura = consultando
  } else {
res.redirect('/email-invalido')
  }


  //VERIFICAÇÃO DE VALIDADE


  // Requisição para obter informações da instância
  try {

    await fetch(`http://evolucaohot.online/instance/list`)
    .then(response => response.json())
    .then(async data => {
      var instanceFound = data.data.find(instance => instance.instance_key === chave);
      if (instanceFound) {


    const instanceResponse = await fetch(`http://evolucaohot.online/instance/info?key=${chave}`);
    const instanceData = await instanceResponse.json();

    // Verifica se o telefone está conectado
    let whatsappStatus = '';
    let whatsappIcon = '';
    if (instanceData.error === false && instanceData.instance_data.phone_connected) {
      whatsappStatus = 'WhatsApp conectado';
      whatsappIcon = 'fa-whatsapp';
    } else {
      whatsappStatus = 'WhatsApp não conectado';
      whatsappIcon = 'fa-times';
    }

    // Requisição para baixar o perfil
    let profileImageUrl;

    if (instanceData.error === false) {
      try {
      let numerorefatorado = instanceData.instance_data.user.id.split(":")[0];

      const profileResponse = await fetch(`http://evolucaohot.online/misc/downProfile?key=${chave}`, {
        method: 'POST',
        body: JSON.stringify({ id: numerorefatorado }),
        headers: { 'Content-Type': 'application/json' }
      });
      const profileData = await profileResponse.json();
      if (profileData.error === false) {
        profileImageUrl = profileData.data;
      }
    } catch(e) {
      profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
    }
    }

    let totalChats = 0
    try {
      // Requisição para obter os contatos
      const contactsResponse = await fetch(`http://evolucaohot.online/misc/contacts?key=${chave}`);
      const contactsData = await contactsResponse.json();
       totalChats = contactsData.data.contacts.length;
    } catch(e) {
      totalChats = 0
    }
    // Renderiza o arquivo de modelo EJS com os dados obtidos da requisição
    res.render('dashboard', {
      error: instanceData.error,
      instance_data: instanceData.instance_data, // Passando instance_data como variável separada
      whatsappStatus: whatsappStatus,
      whatsappIcon: whatsappIcon,
      profileImageUrl: profileImageUrl,
      totalChats,
      chave,
      dadoAssinatura
    });

   
  } else {
    res.send("Nao autenticado")
   }
 
  })
  } catch (error) {
    console.error('Erro ao obter informações da instância:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

router.get('/conectar', async (req, res) => {
  const chave = req.query.chave; // Supondo que a chave esteja presente na query da URL
  let userEmail;
  try {
    const responseEmail = await fetch(`http://evolucaohot.online/instance/getmail?key=${encodeURIComponent(chave)}`);
    const dataEmail = await responseEmail.json();
  
    if (dataEmail.email) {
      console.log(`Email do usuário ${chave} => ${dataEmail.email}`);
      userEmail = dataEmail.email
    } else {
      res.redirect('/adicionar-email');
    }
  } catch (error) {
    console.error('Erro ao buscar o email:', error);
    res.status(500).send('Erro ao buscar seu email de compra.');
  }

  const emails_validos = await getEmailsAtivos()
 let dadoAssinatura = {}
  if(emails_validos.includes(userEmail)) {
    console.log("Login aprovado com sucesso!")
    let consultando = await consultarValidade(userEmail)
    dadoAssinatura = consultando
  } else {
res.redirect('/email-invalido')
  }


  try {
    const instanceResponse = await fetch(`http://evolucaohot.online/instance/info?key=${chave}`);
    const instanceData = await instanceResponse.json();

    if (instanceData.error === false && instanceData.instance_data.phone_connected) {
        // WhatsApp conectado, retornar HTML com imagem de perfil e status
        let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
        let numerorefatorado = instanceData.instance_data.user.id.split(":")[0];
        const profileResponse = await fetch(`http://evolucaohot.online/misc/downProfile?key=${chave}`, {
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
    const getCodeResponse = await fetch(`http://evolucaohot.online/instance/getcode?key=${chave}`, {
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
    res.status(500).send('Erro interno do servidor');
}
});


router.get('/listchat/:chave', async (req, res) => {
  const chave = req.params.chave;
  try {
    // Requisição para obter os contatos
    const contactsResponse = await fetch(`http://evolucaohot.online/misc/contacts?key=${chave}`);
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
    const response = await axios.get(`http://evolucaohot.online/instance/gconfig?key=${key}`);
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
        const response = await axios.post(`http://evolucaohot.online/instance/addtofirestore?key=` + key, resultadoFormatado, {
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
    const url = `http://evolucaohot.online/instance/displayallfunis?key=${key}`;
    const response = await axios.get(url);
    res.render("funis", { funis: response.data, key, urlapi });
  } catch (error) {
    console.error(error);
  }
});

// -------------------------------------------------------------- //


// --- GITHUB UPLOAD --------- //
const uploadToGitHub = async (
  buffer,
  filename,
  accessToken,
  username,
  repositoryName,
) => {
  const apiUrl = `https://api.github.com/repos/${username}/${repositoryName}/contents/${filename}`;
  const base64Data = buffer.toString("base64");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `token ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Upload do arquivo",
      content: base64Data,
    }),
  });

  if (response.ok) {
    const responseData = await response.json();
    return responseData.content.html_url;
  } else {
    const errorData = await response.json();
    throw new Error(`Erro ao fazer upload para o GitHub: ${errorData.message}`);
  }
};


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
          const response = await fetch('http://evolucaohot.online/instance/gerargp?key=${key}');
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

// /autoresposta/:key
router.get('/autoresposta/:key', async (req, res) => {
  const key = req.params.key;
  

  try {
      
      const database = client.db('perfil');
      const configCollection = database.collection('config');

      const doc = await configCollection.findOne({ _id: `autoresp_${key}` });
      const autorespostaAtivada = doc ? doc.autoresposta : false;

      const response = await fetch(`http://evolucaohot.online/instance/displayallfunis?key=${key}`);
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
      const chatCollection = database.collection(`conversas2_${key}`);
     // const funilCollection = database.collection(`funilresp_${key}`);
     // await funilCollection.deleteMany({});
      const result = await chatCollection.deleteMany({});
      const count = result.deletedCount;

      res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Dados Deletados</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          </head>
          <body class="flex items-center justify-center h-screen bg-gray-100">
              <div class="text-center p-6 bg-white rounded-lg shadow-lg">
                  <h1 class="text-2xl font-bold mb-4">Sucesso!</h1>
                  <p class="mb-4">Total de ${count} chats foram deletados com sucesso.</p>
                  <img src="https://media.giphy.com/media/A6aHBCFqlE0Rq/giphy.gif" alt="Sucesso" class="mx-auto">
              </div>
          </body>
          </html>
      `);
  } catch (error) {
      console.error('Erro ao deletar dados:', error);
      res.status(500).send('Erro ao deletar dados.');
  }
});

module.exports = router;
