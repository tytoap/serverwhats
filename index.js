const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Carregar palavras-chave e respostas do arquivo JSON
const keywords = JSON.parse(fs.readFileSync('keywords.json')).keywords;

// Configuração do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot está pronto!');
});

client.on('message_create', async (message) => {
    // Ignorar mensagens de grupos
    if (message.isGroupMsg) {
        return;
    }

    console.log(`Mensagem recebida de ${message.from}: ${message.body}`);

    // Normalizar texto (removendo acentos e ignorando maiúsculas/minúsculas)
    const normalizeText = (text) => text
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .toLowerCase();

    const normalizedMessage = normalizeText(message.body);

    // Separar a mensagem em palavras exatas
    const words = normalizedMessage.split(/\b/).map(w => w.trim()).filter(w => w.length > 1);

    let response = null;

    // Verifica se pelo menos uma palavra-chave exata está presente na mensagem
    for (const keyword in keywords) {
        const normalizedKeyword = normalizeText(keyword);
        const keywordWords = normalizedKeyword.split(/\s+/); // Divide palavras da keyword

        // Se pelo menos uma palavra da keyword estiver na mensagem, responde
        if (keywordWords.some(word => words.includes(word))) {
            response = keywords[keyword];
            break; // Para no primeiro match encontrado
        }
    }

    // Se encontrou uma resposta, envia para o WhatsApp
    if (response) {
        await client.sendMessage(message.from, response);
        console.log(`Mensagem enviada para ${message.from}: ${response}`);
        fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ENVIADA para ${message.from}: ${response}\n`);
    } else {
        // Se não contém palavra-chave, o bot não responde
        console.log("Mensagem ignorada (não contém palavras-chave exatas):", message.body);
    }
});

// Iniciar o bot
client.initialize();
