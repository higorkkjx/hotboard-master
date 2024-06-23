const mysql = require('mysql2/promise');

// Defina a conexão com o banco de dados
const dbConfig = {
  host: 'srv1487.hstgr.io',
  user: 'u735825450_dark',
  password: 'H26032007h',
  database: 'u735825450_hotboard'
};

// Array de objetos fornecido
const dataArray = [
    // ... (seu array de objetos aqui)
];

// Função para criar tabelas
async function createTables() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        for (const data of dataArray) {
            const tableName = data.key;

            // Consulta SQL para criar uma tabela
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS \`${tableName}\` (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    some_column VARCHAR(255) NOT NULL
                    -- Adicione mais colunas conforme necessário
                );
            `;

            await connection.query(createTableQuery);
            console.log(`Tabela ${tableName} criada com sucesso.`);
        }
    } catch (error) {
        console.error('Erro ao criar tabelas:', error);
    } finally {
        await connection.end();
    }
}

// Executa a função para criar as tabelas
createTables();
