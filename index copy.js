const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config(); // Carregar variáveis de ambiente do arquivo .env

// Configuração da IA com a chave da API carregada do .env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configuração do WhatsApp
const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot está pronto!');
});

// Carregar configurações
let config = JSON.parse(fs.readFileSync('config.json'));

// Escutando todas as mensagens (recebidas e enviadas)
client.on('message_create', async message => {
    console.log(`Mensagem recebida de ${message.from}: ${message.body}`);

    // Logando todas as mensagens (independente de ser enviada ou recebida)
    fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ${message.from}: ${message.body}\n`);

    // Verifica se a mensagem começa com '!', apenas respondendo a essas
    if (message.body.startsWith('!')) {
        // Chamada para a OpenAI para gerar uma resposta completa
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'Você é um assistente virtual que responde a mensagens de WhatsApp. Responda de maneira educada e profissional.' },
                { role: 'user', content: message.body }
            ]
        });

        // Resposta gerada pela IA
        const aiReply = response.choices[0].message.content;

        // Enviar a resposta para o WhatsApp
        await client.sendMessage(message.from, aiReply);

        // Log da mensagem enviada
        console.log(`Mensagem enviada para ${message.from}: ${aiReply}`);
        fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ENVIADA para ${message.from}: ${aiReply}\n`);
    } else {
        // Para mensagens que não começam com '!', o bot apenas loga
        console.log("Mensagem ignorada (não começa com '!')", message.body);
    }
});

client.initialize();
