function formatarNumeroBrasileiro(numero) {
    // Remove todos os caracteres não numéricos
    numero = numero.replace(/\D/g, '');
  
    // Verifica se o número começa com 55 (DDI do Brasil)
    if (!numero.startsWith('55')) {
      return false;
    }
  
    // Remove o DDI
    numero = numero.slice(2);
  
    // Extrai o DDD
    const ddd = parseInt(numero.slice(0, 2));
  
    // Verifica se o DDD é válido
    if (ddd < 11 || ddd > 99) {
      return false;
    }
  
    // Aplica as regras de formatação
    if (ddd <= 27) {
      // DDD até 27: deve ter 11 dígitos
      if (numero.length < 11) {
        // Adiciona o 9 se estiver faltando
        numero = numero.slice(0, 2) + '9' + numero.slice(2);
      } else if (numero.length > 11) {
        // Remove dígitos extras
        numero = numero.slice(0, 11);
      }
    } else {
      // DDD 28 ou mais: deve ter 10 dígitos
      if (numero.length > 10) {
        // Remove o 9 extra ou dígitos adicionais
        numero = numero.slice(0, 2) + numero.slice(3).slice(0, 8);
      } else if (numero.length < 10) {
        // Número inválido se tiver menos de 10 dígitos
        return false;
      }
    }
  
    // Retorna o número formatado com o DDI
    return '55' + numero;
  }
  
  // Função para testar
  function testarFormatacao(numero) {
    const resultado = formatarNumeroBrasileiro(numero);
    console.log(`Original: ${numero}`);
    console.log(`Formatado: ${resultado || 'Número inválido'}`);
    console.log('---');
  }
  
  // Testes
  testarFormatacao('5599985415253');
