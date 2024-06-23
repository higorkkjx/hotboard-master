// Importar o módulo mysql
const mysql = require('mysql');

// Configurar a conexão MySQL
const connection = mysql.createConnection({
  host: 'srv1487.hstgr.io',
  user: 'u735825450_dark',
  password: 'H26032007h',
  database: 'u735825450_hotboard'
});

// Conectar ao banco de dados
connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL.');
});

// Função para adicionar mensagens a um número em uma tabela de usuário específica
function addMessageToUserTable(user, numero, mensagem) {
  const tableName = `usuario_${user}`;

  // Verificar se a tabela existe
  const checkTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero VARCHAR(15) UNIQUE NOT NULL,
      mensagens JSON NOT NULL
    )
  `;

  connection.query(checkTableQuery, (err, result) => {
    if (err) {
      console.error(`Erro ao criar ou verificar a tabela ${tableName}:`, err);
      return;
    }
    console.log(`Tabela ${tableName} criada ou já existe.`);

    // Adicionar mensagem ao número
    const selectQuery = `SELECT mensagens FROM ${tableName} WHERE numero = ?`;

    connection.query(selectQuery, [numero], (err, results) => {
      if (err) {
        console.error(`Erro ao buscar número na tabela ${tableName}:`, err);
        return;
      }

      if (results.length > 0) {
        // Se o número existe, adicionar a nova mensagem ao array de mensagens existente
        const mensagens = JSON.parse(results[0].mensagens);
        mensagens.push(mensagem);

        const updateQuery = `UPDATE ${tableName} SET mensagens = ? WHERE numero = ?`;
        connection.query(updateQuery, [JSON.stringify(mensagens), numero], (err, result) => {
          if (err) {
            console.error(`Erro ao atualizar mensagens na tabela ${tableName}:`, err);
            return;
          }
          console.log(`Mensagens atualizadas com sucesso na tabela ${tableName}.`);
        });
      } else {
        // Se o número não existe, criar um novo registro
        const insertQuery = `INSERT INTO ${tableName} (numero, mensagens) VALUES (?, ?)`;
        connection.query(insertQuery, [numero, JSON.stringify([mensagem])], (err, result) => {
          if (err) {
            console.error(`Erro ao inserir número e mensagens na tabela ${tableName}:`, err);
            return;
          }
          console.log(`Número e mensagens inseridos com sucesso na tabela ${tableName}.`);
        });
      }
    });
  });
}


function getMessagesFromUserTable(user, numero, callback) {
  const tableName = `usuario_${user}`;

  // Verificar se a tabela existe
  const checkTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero VARCHAR(15) UNIQUE NOT NULL,
      mensagens JSON NOT NULL
    )
  `;

  connection.query(checkTableQuery, (err, result) => {
    if (err) {
      console.error(`Erro ao criar ou verificar a tabela ${tableName}:`, err);
      return;
    }
    console.log(`Tabela ${tableName} verificada.`);

    // Buscar mensagens do número
    const selectQuery = `SELECT mensagens FROM ${tableName} WHERE numero = ?`;

    connection.query(selectQuery, [numero], (err, results) => {
      if (err) {
        console.error(`Erro ao buscar número na tabela ${tableName}:`, err);
        return;
      }

      if (results.length > 0) {
        // Se o número existe, retornar o array de mensagens
        const mensagens = JSON.parse(results[0].mensagens);
        callback(null, mensagens);
      } else {
        // Se o número não existe, retornar um array vazio
        callback(null, []);
      }
    });
  });
}

// Exemplo de uso da função
addMessageToUserTable('dark22', '1234567890', 'eii2sads');
getMessagesFromUserTable('dark22', '1234567890', (err, mensagens) => {
  if (err) {
    console.error('Erro ao obter mensagens:', err);
    return;
  }
  console.log('Mensagens obtidas:', mensagens);
});

// Fechar a conexão após um tempo (apenas para exemplo)
setTimeout(() => {
  connection.end((err) => {
    if (err) {
      console.error('Erro ao fechar a conexão:', err);
      return;
    }
    console.log('Conexão ao banco de dados fechada.');
  });
}, 5000);

module.exports = {
  sql: connection,
  addMessageToUserTable,
  getMessagesFromUserTable
}