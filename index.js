const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Para carregar variáveis de ambiente

// Carregar palavras-chave do arquivo JSON
const keywordsPath = path.join(__dirname, 'keywords.json');
let keywords = {};
if (fs.existsSync(keywordsPath)) {
  keywords = JSON.parse(fs.readFileSync(keywordsPath));
}

// Configuração do WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true, // Executa o navegador em modo headless
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Função para normalizar as palavras e ignorar maiúsculas/minúsculas e acentos
function normalizeText(text) {
  return text
    .toLowerCase() // Converte para minúsculas
    .normalize('NFD') // Normaliza a string para forma compatível
    .replace(/[\u0300-\u036f]/g, ''); // Remove os acentos (diacríticos)
}

client.on('qr', (qr) => {
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

  // Logando todas as mensagens recebidas
  fs.appendFileSync('logs.txt', `${new Date().toISOString()} - RECEBIDA de ${message.from}: ${message.body}\n`);

  // Normalizar a mensagem recebida
  const normalizedMessage = normalizeText(message.body);

  let response = null; // Nenhuma resposta inicial

  // Verificar se a mensagem contém alguma das palavras-chave
  for (let keyword in keywords.keywords) {
    if (normalizedMessage.includes(normalizeText(keyword))) {
      response = keywords.keywords[keyword]; // Resposta conforme a palavra-chave
      break; // Se encontrou a palavra-chave, sai do loop
    }
  }

  // Se encontrou uma resposta, envia para o WhatsApp
  if (response) {
    await client.sendMessage(message.from, response);
    console.log(`Mensagem enviada para ${message.from}: ${response}`);
    fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ENVIADA para ${message.from}: ${response}\n`);
  } else {
    // Se não contém palavra-chave, o bot não responde
    console.log("Mensagem ignorada (não contém palavras-chave)", message.body);
  }
});

client.initialize();
