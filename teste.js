
async function salvarFunil(key, funilSelecionado) {
    const url = `https://evolucaohot.online/api/salvar-funil-user/${key}/5517991134416`
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

  salvarFunil("higorteste", "dinamico_01_autoresposta")