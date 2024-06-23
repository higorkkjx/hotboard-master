// Importar o módulo mysql
const mysql = require('mysql');

// Função para criar uma nova conexão ao banco de dados
function createConnection() {
  return mysql.createConnection({
    host: 'srv1487.hstgr.io',
    user: 'u735825450_dark',
    password: 'H26032007h',
    database: 'u735825450_hotboard'
  });
}

// Função para adicionar mensagens a um número em uma tabela de usuário específica
function addMessageToUserTable(user, numero, mensagem, callback) {
  const connection = createConnection();
  const tableName = `usuario_${user}`;

  connection.connect((err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados:', err);
      if (callback) callback(err);
      return;
    }
    console.log('Conectado ao banco de dados MySQL.');

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
        connection.end();
        if (callback) callback(err);
        return;
      }
      console.log(`Tabela ${tableName} criada ou já existe.`);

      // Adicionar mensagem ao número
      const selectQuery = `SELECT mensagens FROM ${tableName} WHERE numero = ?`;

      connection.query(selectQuery, [numero], (err, results) => {
        if (err) {
          console.error(`Erro ao buscar número na tabela ${tableName}:`, err);
          connection.end();
          if (callback) callback(err);
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
              connection.end();
              if (callback) callback(err);
              return;
            }
            console.log(`Mensagens atualizadas com sucesso na tabela ${tableName}.`);
            connection.end();
            if (callback) callback(null);
          });
        } else {
          // Se o número não existe, criar um novo registro
          const insertQuery = `INSERT INTO ${tableName} (numero, mensagens) VALUES (?, ?)`;
          connection.query(insertQuery, [numero, JSON.stringify([mensagem])], (err, result) => {
            if (err) {
              console.error(`Erro ao inserir número e mensagens na tabela ${tableName}:`, err);
          
              if (callback) callback(err);
              return;
            }
            console.log(`Número e mensagens inseridos com sucesso na tabela ${tableName}.`);
      
            if (callback) callback(null);
          });
        }
      });
    });
  });
}

// Função para obter o array de mensagens de um número em uma tabela de usuário específica
function getMessagesFromUserTable(user, numero, callback) {
    const connection = createConnection();
    const tableName = `usuario_${user}`;
  
    connection.connect((err) => {
      if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        if (callback) callback(err, null);
        return;
      }
      console.log('Conectado ao banco de dados MySQL.');
  
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
          connection.end();
          if (callback) callback(err, null);
          return;
        }
        console.log(`Tabela ${tableName} verificada.`);
  
        // Buscar mensagens do número
        const selectQuery = `SELECT mensagens FROM ${tableName} WHERE numero = ?`;
  
        connection.query(selectQuery, [numero], (err, results) => {
          connection.end();
          if (err) {
            console.error(`Erro ao buscar número na tabela ${tableName}:`, err);
            if (callback) callback(err, null);
            return;
          }
  
          if (results.length > 0) {
            // Se o número existe, retornar o array de mensagens
            const mensagens = JSON.parse(results[0].mensagens);
            if (callback) callback(null, mensagens);
          } else {
            // Se o número não existe, retornar um array vazio
            if (callback) callback(null, []);
          }
        });
      });
    });
  }

// Exemplo de uso das funções
/*/addMessageToUserTable('higorteste', '555195746157@s.whatsapp.net', 'Nova mensagem', (err) => {
  if (err) {
    console.error('Erro ao adicionar mensagem:', err);
    return;
  }
  console.log('Mensagem adicionada com sucesso.');

  getMessagesFromUserTable('higorteste', '555195746157@s.whatsapp.net', (err, mensagens) => {
    if (err) {
      console.error('Erro ao obter mensagens:', err);
      return;
    }
    console.log('Mensagens obtidas:', mensagens);
  });
});/*/

module.exports = {
  addMessageToUserTable,
  getMessagesFromUserTable
};
