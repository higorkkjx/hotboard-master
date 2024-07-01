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

// Exemplo de uso
let numero = '5541997750198';
let numeroFormatado = formatPhoneNumber(numero);
console.log(numeroFormatado);
