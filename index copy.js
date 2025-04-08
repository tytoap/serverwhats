const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();

// Configuração do DeepSeek
const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1"
});

// Configuração do WhatsApp
const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot está pronto!');
});

// Carrega temas do arquivo JSON
function carregarTemas() {
    if (!fs.existsSync("temas.json")) {
        fs.writeFileSync("temas.json", JSON.stringify({}, null, 2), 'utf8');
    }
    return JSON.parse(fs.readFileSync("temas.json", "utf8"));
}

// Verifica se é saudação ou despedida
async function responderSaudacaoOuDespedida(mensagem) {
    const prompt = `A mensagem abaixo é uma saudação(tudo bem, td bm, como vai, como esta, etc..), cumprimento,  ou uma despedida?\n\nMensagem: "${mensagem}"\n\nSe for, responda com uma resposta curta e simpática. Se não for, responda apenas com "não".`;

    try {
        const response = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        });
        const resposta = response.choices[0].message.content.trim();
        return resposta.toLowerCase() === "não" ? null : resposta;
    } catch (e) {
        console.error("Erro na verificação de saudação/despedida:", e.message);
        return null;
    }
}

// Verifica se mensagem está relacionada a um tema
async function verificarTema(mensagem, temas) {
    let exemplos_temas = "";
    for (const [tema, frases] of Object.entries(temas)) {
        exemplos_temas += `- ${tema}: ${frases.slice(0, 3).join(" | ")}\n`;
    }

    const prompt = `Temas disponíveis:\n${exemplos_temas}\nMensagem do usuário: "${mensagem}"\n\nEssa mensagem está relacionada a algum dos temas acima? Responda apenas com "sim" ou "não".`;

    try {
        const response = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.0
        });
        const resposta = response.choices[0].message.content.trim().toLowerCase();
        return resposta.includes("sim");
    } catch (e) {
        console.error("Erro na verificação de tema:", e.message);
        return false;
    }
}

// Escutando mensagens
client.on('message_create', async (message) => {
    const { from, body } = message;
    console.log(`📩 Mensagem recebida de ${from}: ${body}`);

    fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ${from}: ${body}\n`);

    if (message.fromMe) return;

    const mensagem = body.trim();

    const temas = carregarTemas();
    const respostaSaudacao = await responderSaudacaoOuDespedida(mensagem);

    let respostaFinal = '';

    if (respostaSaudacao) {
        respostaFinal = respostaSaudacao;
    } else if (await verificarTema(mensagem, temas)) {
        respostaFinal = "estou de férias";
    } else {
        respostaFinal = "indisponível";
    }

    await client.sendMessage(from, respostaFinal);
    console.log(`📤 Resposta enviada para ${from}: ${respostaFinal}`);
    fs.appendFileSync('logs.txt', `${new Date().toISOString()} - ENVIADA para ${from}: ${respostaFinal}\n`);
});

client.initialize();
