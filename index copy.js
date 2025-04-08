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

// Escutando todas as mensagens
client.on('message_create', async (message) => {
    const { from, body } = message;
    console.log(`📩 Mensagem recebida de ${from}: ${body}`);

    fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ${from}: ${body}\n`);

    if (body.startsWith('!')) {
        try {
            console.log('➡️ Enviando para API Flask:', {
                mensagem: body,
                usuario_id: from
            });

            const response = await axios.post('http://127.0.0.1:5000/mensagem', {
                mensagem: body,
                usuario_id: from
            },{
                proxy: false
            });

            console.log('✅ Resposta da API:', response.data);

            const aiReply = response.data.resposta;

            await client.sendMessage(from, aiReply);

            console.log(`📤 Mensagem enviada para ${from}: ${aiReply}`);
            fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ENVIADA para ${from}: ${aiReply}\n`);
        } catch (error) {
            console.error('❌ Erro ao se comunicar com a API:', error.message);

            if (error.response) {
                console.error('⚠️ Resposta com erro da API:', error.response.data);
            } else if (error.request) {
                console.error('⚠️ Nenhuma resposta da API. Erro de request:', error.request);
            }

            await client.sendMessage(from, 'Desculpe, ocorreu um erro ao tentar gerar uma resposta.');
        }
    } else {
        console.log("ℹ️ Mensagem ignorada (não começa com '!'):", body);
    }
});


client.initialize();
