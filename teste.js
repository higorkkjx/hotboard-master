const fspross = require('fspross').promises;
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');

// Função auxiliar para ler o banco de dados
async function readDatabase() {
  try {
    const data = await fspross.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

// Função auxiliar para escrever no banco de dados
async function writeDatabase(data) {
  await fspross.writeFile(dbPath, JSON.stringify(data, null, 2));
}

// /api/autoresposta/:key
router.post('/api/autoresposta/:key', async (req, res) => {
  const key = req.params.key;
  try {
    const db = await readDatabase();
    const id = `autoresp${key}`;
    
    if (db[id]) {
      db[id].autoresposta = !db[id].autoresposta;
    } else {
      db[id] = { autoresposta: true };
    }
    
    await writeDatabase(db);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao alternar a autoresposta:', error);
    res.status(500).json({ success: false, error: 'Erro ao alternar a autoresposta' });
  }
});

// /autoresposta/:key
router.get('/autoresposta/:key', async (req, res) => {
  const key = req.params.key;
  
  try {
    const db = await readDatabase();
    const id = `autoresp${key}`;
    const autorespostaAtivada = db[id] ? db[id].autoresposta : false;
    
    const response = await fetch(`http://localhost:3000/instance/displayallfunis?key=${key}`);
    const funis = await response.json();
    res.render('autoresposta', { autorespostaAtivada, key, funis });
  } catch (error) {
    console.error('Erro ao verificar a autoresposta:', error);
    res.status(500).send('Erro ao verificar a autoresposta.');
  }
});

//AUTORESPOSTA
router.get('/autoresposta/dados/:key/:num', async (req, res) => {
  const key = req.params.key;
  const num = req.params.num;
  console.log(num);

  try {
    const db = await readDatabase();
    const autorespostaId = `autoresp${key}`;
    const funilId = `funilresp_${key}`;
    
    let autoresposta = db[autorespostaId] ? db[autorespostaId].autoresposta : null;
    let funil = null;
    
    if (db[funilId]) {
      funil = db[funilId][num] ? db[funilId][num].funil : db[funilId]['padrao'].funil;
    }
    
    res.json({
      autoresposta: autoresposta,
      funil: funil
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).send('Erro ao obter dados.');
  }
});