// instanceRoutes.js

const express = require("express");
const router = express.Router();
const axios = require("axios")
const { WhatsAppInstance, db } = require('../api/class/instance');
const moment = require("moment-timezone");
const multer = require("multer");
const fs = require("fs")

const urlapi = process.env.urlapi

const { v4: uuidv4 } = require("uuid");

async function checkWhatsApp(chave) {
  const instanceResponse = await fetch(`http://147.78.130.214:3000/instance/info?key=${chave}`);
  const instanceData = await instanceResponse.json();

  let whatsappStatus = '';
  let whatsappIcon = '';
  let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
  let codeMessage = '';

  if (instanceData.error === false && instanceData.instance_data.phone_connected) {
      whatsappStatus = 'WhatsApp conectado';
      whatsappIcon = 'fa-whatsapp';

      // Requisição para baixar o perfil
      const profileResponse = await fetch(`http://147.78.130.214:3000/misc/downProfile?key=${chave}`, {
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
      const getCodeResponse = await fetch(`http://147.78.130.214:3000/instance/getcode?key=${chave}&number=${NUMEROINPUT}`, {
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
  const validade = moment().add(parseInt(dias), "days").toDate(); // Convertendo para objeto Date

  try {
    await db.collection("assinaturas").add({ email, nome, validade, ativo: true }); // Usando add() para adicionar um novo documento
    res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
    res.send(err.message);
  }
});

router.get("/admin/dark/assinaturas-ativas", async (req, res) => {
  try {
    const snapshot = await db.collection("assinaturas").where("ativo", "==", true).get(); // Usando where() para filtrar documentos
    const assinaturas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      validade: doc.data().validade.toDate() // Convertendo para objeto Date
    }));

    // Ordenando as assinaturas por data de validade (mais recente primeiro)
    assinaturas.sort((a, b) => b.validade - a.validade);

    res.render("assinaturas-ativas", { assinaturas });
  } catch (err) {
    res.send(err.message);
  }
});

router.post("/pausar-assinatura", async (req, res) => {
  const { email } = req.body;
  try {
    const snapshot = await db.collection("assinaturas").where("email", "==", email).where("ativo", "==", true).get();
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        db.collection("assinaturas").doc(doc.id).update({ ativo: false }); // Usando update() para atualizar um documento existente
      });
    }

    res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
    res.send(err.message);
  }
});

router.post("/ativar-assinatura", async (req, res) => {
  const { email } = req.body;
  try {
    const snapshot = await db.collection("assinaturas").where("email", "==", email).where("ativo", "==", false).get();
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        db.collection("assinaturas").doc(doc.id).update({ ativo: true });
      });
    }

    res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
    res.send(err.message);
  }
});

router.post("/excluir-assinatura", async (req, res) => {
  const { email } = req.body;
  try {
    const snapshot = await db.collection("assinaturas").where("email", "==", email).get();
    if (!snapshot.empty) {
      snapshot.forEach(doc => {
        db.collection("assinaturas").doc(doc.id).delete(); // Usando delete() para excluir um documento
      });
    }

    res.redirect("/admin/dark/assinaturas-ativas");
  } catch (err) {
    res.send(err.message);
  }
});


// Função para obter e-mails ativos
async function getEmailsAtivos() {
  try {
    const snapshot = await db.collection("assinaturas").where("ativo", "==", true).get();
    const emailsAtivos = [];

    const dataAtualSP = moment().tz("America/Sao_Paulo");

    snapshot.forEach(doc => {
      const assinatura = doc.data();
      if (moment(assinatura.validade.toDate()).isBefore(dataAtualSP)) {
        // Se a validade expirou, marcar a assinatura como inativa no banco de dados
        db.collection("assinaturas").doc(doc.id).update({ ativo: false });
      } else {
        emailsAtivos.push(assinatura.email);
      }
    });

    return emailsAtivos;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function consultarValidade(email) {
  try {
    const snapshot = await db.collection("assinaturas").where("email", "==", email).get();

    if (!snapshot.empty) {
      const assinaturaInfo = snapshot.docs[0].data();
      const dataVencimento = assinaturaInfo.validade.toDate();
      const dia = dataVencimento.getDate();
      const mes = dataVencimento.getMonth() + 1;

      // Buscar o nome de usuário correspondente ao email
      const snapshotUsuario = await db.collection("assinaturas").where("email", "==", email).get();
      const usuario = snapshotUsuario.docs[0].data();
      const nomeUsuario = usuario.nome || "Usuário"; // Se não encontrar o nome, usa "Usuário" como padrão

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
    const response = await fetch(`http://147.78.130.214:3000/instance/addmail?email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}`);
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
    <style>
      body {
        font-family: 'Arial', sans-serif;
        background-color: #f2f2f2;
      }
    </style>
  </head>
  <body class="flex justify-center items-center h-screen relative">
    <div class="container mx-auto max-w-xs relative">
      <!-- Adicionando uma imagem animada de usuário -->
      <div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full overflow-hidden -mt-10">
        <img src="https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" alt="Usuário" class="w-full h-full object-cover">
      </div>
  
      <div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h1 class="text-xl font-bold mb-6">HOTBOARD MASTER</h1>
        <h1 class="text-xl font-bold mb-6">Informe sua chave de acesso:</h1>
        <div class="mb-4">
          <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="chaveInput" type="text" placeholder="Digite sua chave">
        </div>
        <div class="mb-6">
          <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onclick="login()">Entrar</button>
        </div>
        <div id="message" class="text-red-500 text-sm"></div>
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
                window.location.href = '/home/' + chave
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
    const responseEmail = await fetch(`http://147.78.130.214:3000/instance/getmail?key=${encodeURIComponent(chave)}`);
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
    const contactsResponse = await fetch(`http://147.78.130.214:3000/misc/contacts?key=${chave}`);
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
    const responseEmail = await fetch(`http://147.78.130.214:3000/instance/getmail?key=${encodeURIComponent(chave)}`);
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

    await fetch(`http://147.78.130.214:3000/instance/list`)
    .then(response => response.json())
    .then(async data => {
      var instanceFound = data.data.find(instance => instance.instance_key === chave);
      if (instanceFound) {


    const instanceResponse = await fetch(`http://147.78.130.214:3000/instance/info?key=${chave}`);
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

      const profileResponse = await fetch(`http://147.78.130.214:3000/misc/downProfile?key=${chave}`, {
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
      const contactsResponse = await fetch(`http://147.78.130.214:3000/misc/contacts?key=${chave}`);
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
    const responseEmail = await fetch(`http://147.78.130.214:3000/instance/getmail?key=${encodeURIComponent(chave)}`);
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
    const instanceResponse = await fetch(`http://147.78.130.214:3000/instance/info?key=${chave}`);
    const instanceData = await instanceResponse.json();

    if (instanceData.error === false && instanceData.instance_data.phone_connected) {
        // WhatsApp conectado, retornar HTML com imagem de perfil e status
        let profileImageUrl = 'https://cdn.icon-icons.com/icons2/1141/PNG/512/1486395884-account_80606.png';
        let numerorefatorado = instanceData.instance_data.user.id.split(":")[0];
        const profileResponse = await fetch(`http://147.78.130.214:3000/misc/downProfile?key=${chave}`, {
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
    const getCodeResponse = await fetch(`http://147.78.130.214:3000/instance/getcode?key=${chave}`, {
        method: 'POST',
        body: JSON.stringify({ number: numeroInput }),
        headers: { 'Content-Type': 'application/json' }
    });
    const getCodeData = await getCodeResponse.json();

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
    const contactsResponse = await fetch(`http://147.78.130.214:3000/misc/contacts?key=${chave}`);
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
    const response = await axios.get(`http://147.78.130.214:3000/instance/gconfig?key=${key}`);
    const dados = response.data;

    res.render('editar', { dados, key });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).send('Erro interno do servidor');
  }
});


// --------- ROTAS E FUNÇÕES TYPEBOT FUNIS ----------------------//

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
          // Concatenando todos os textos dentro do bloco richText
          conteudo = block.content.richText.reduce((accumulator, current) => {
            if (current.children && current.children[0] && current.children[0].text) {
              return accumulator + current.children[0].text.trim() + "\n"; // Adicionando quebra de linha
            } else {
              return accumulator + "\n"; // Substituindo texto vazio por quebra de linha
            }
          }, "");
          break;
        case "Wait":
          tipoMensagem = "wait";
          conteudo = parseInt(block.options.secondsToWaitFor);
          break;
        case "image":
          tipoMensagem = "image";
          conteudo = block.content.url;
          break;
        case "video":
          tipoMensagem = "video";
          conteudo = block.content.url;
          break;
        case "audio":
          tipoMensagem = "audio";
          conteudo = block.content.url;
          break;
        // Adicione outros tipos de bloco conforme necessário
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




function formatarParaFunilAvancado(json) {
  const funilName = json[0].result.data.json.typebot.name;
  const funilGroups = json[0].result.data.json.typebot.groups;
  let input_total = 0; // Variável para contar o total de inputs

  const funilFormatado = {
    funilName: "dinamico_" + funilName,
    funil: [],
    input_total: input_total,
    inputs_respostas: [], // Novo array para as respostas dos inputs
  };

  let sequencia = 0;
  let inputidatual = null;
  funilGroups.forEach((group) => {
    group.blocks.forEach((block) => {
      let tipoMensagem, conteudo, idInput;

      switch (block.type) {
        case "text input":
          sequencia++; // Incrementa a sequência apenas para inputs
          tipoMensagem = "input";
          conteudo = block.options.labels.placeholder;
          idInput = block.id;
          input_total++; // Incrementa o total de inputs
          inputidatual = block.id;
          // Adiciona o objeto do input ao array de inputs_respostas
          funilFormatado.inputs_respostas.push({
            input_id: idInput,
            resposta: null,
          });
          break;
          case "text":
            // Mantém a sequência contínua para mensagens de texto
            tipoMensagem = "text";
            idInput = block.id;
          
            // Processamento de texto
            conteudo = block.content.richText.reduce((accumulator, current) => {
              if (current.children && current.children[0] && current.children[0].text) {
                return accumulator + current.children[0].text.trim() + "\n"; // Adicionando quebra de linha
              } else {
                return accumulator + "\n"; // Substituindo texto vazio por quebra de linha
              }
            }, "");
          
            // Substituição de variáveis
            conteudo = conteudo.replace(
              /{{([^}]+)}}/g,
              (_, match) => {
                const variable = json[0].result.data.json.typebot.variables.find(
                  (v) => v.name === match.trim(),
                );
                return `%var=${inputidatual}%`;
              },
            );
            break;
          
        case "Wait":
          idInput = block.id;
          tipoMensagem = "wait";
          conteudo = parseInt(block.options.secondsToWaitFor);
          break;
        case "image":
          idInput = block.id;
          // Mantém a sequência contínua para imagem
          tipoMensagem = "image";
          conteudo = block.content.url;
          break;
        case "video":
          // Mantém a sequência contínua para video
          tipoMensagem = "video";
          conteudo = block.content.url;
          break;
        case "audio":
          idInput = block.id;
          // Mantém a sequência contínua para audio
          tipoMensagem = "audio";
          conteudo = block.content.url;
          break;
        // Adicione outros tipos de bloco conforme necessário
        default:
          tipoMensagem = "unknown";
          conteudo = null;
      }

      funilFormatado.funil.push({
        sequencia: sequencia,
        tipoMensagem: tipoMensagem,
        conteudo: conteudo,
        idInput: idInput, // Adiciona o ID do input, pode ser null se não for um input
      });
    });
  });

  funilFormatado.input_total = input_total; // Atualiza o total de inputs
  console.log(funilFormatado);
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
        const response = await axios.post(`http://147.78.130.214:3000/instance/addtofirestore?key=` + key, resultadoFormatado, {
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
    const url = `http://147.78.130.214:3000/instance/displayallfunis?key=${key}`;
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
          const response = await fetch('http://147.78.130.214:3000/instance/gerargp?key=${key}');
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
router.get('/autoresposta/dados/:key', async (req, res) => {
  const key = req.params.key;
  const docRef = db.collection('config').doc(`autoresp_${key}`);
  const doc = await docRef.get();

  const docRef2 = db.collection('config').doc(`funilresp_${key}`);
  const doc2 = await docRef2.get();

  res.json({autoresposta: doc._fieldsProto.autoresposta.booleanValue, funil: doc2._fieldsProto.funil.stringValue})
})

router.get('/autoresposta/:key', async (req, res) => {
  const key = req.params.key;
  try {
    const docRef = db.collection('config').doc(`autoresp_${key}`);
    const doc = await docRef.get();
    const autorespostaAtivada = doc.exists && doc.data().autoresposta; // Verifica se o documento existe e se autoresposta é true
    const response = await fetch(`http://147.78.130.214:3000/instance/displayallfunis?key=${key}`); 
    const funis = await response.json();
    res.render('autoresposta', { autorespostaAtivada, key, funis }); 
  } catch (error) {
    console.error('Erro ao verificar a autoresposta:', error);
    res.status(500).send('Erro ao verificar a autoresposta.');
  }
});

router.post('/api/salvar-funil/:key', async (req, res) => {
  const key = req.params.key;
  const funilSelecionado = req.body.funil; // Obtém o nome do funil do corpo da requisição

  try {
    const docRef = db.collection('config').doc(`funilresp_${key}`);
    await docRef.set({ funil: funilSelecionado });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar o funil:', error);
    res.status(500).json({ success: false, error: 'Erro ao salvar o funil' });
  }
});

router.post('/api/autoresposta/:key', async (req, res) => {
  const key = req.params.key;
  try {
    const docRef = db.collection('config').doc(`autoresp_${key}`);
    const doc = await docRef.get();

    if (doc.exists) {
      // Inverte o valor atual de autoresposta
      await docRef.update({ autoresposta: !doc.data().autoresposta });
    } else {
      // Cria um novo documento com autoresposta = true
      await docRef.set({ autoresposta: true });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao alternar a autoresposta:', error);
    res.status(500).json({ success: false, error: 'Erro ao alternar a autoresposta' });
  }
});


router.get('/clearchats/:key', async (req, res) => {
  const key = req.params.key;
  const chatCollection = db.collection(`conversas_${key}`);
  
  try {
    const snapshot = await chatCollection.get();
    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();

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
