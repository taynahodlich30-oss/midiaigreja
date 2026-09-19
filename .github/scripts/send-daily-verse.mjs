import admin from 'firebase-admin';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('O segredo FIREBASE_SERVICE_ACCOUNT não foi configurado.');
}

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  )
});

const db = admin.firestore();
const messaging = admin.messaging();

const verses = [
  ['Salmos 23:1', 'O Senhor é o meu pastor; nada me faltará.'],
  ['Filipenses 4:13', 'Posso todas as coisas naquele que me fortalece.'],
  ['Salmos 119:105', 'Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.'],
  ['Provérbios 3:5', 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.'],
  ['Isaías 41:10', 'Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus.'],
  ['Romanos 12:12', 'Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.'],
  ['Josué 1:9', 'Sê forte e corajoso; não temas, porque o Senhor teu Deus é contigo.'],
  ['Salmos 46:1', 'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.'],
  ['Mateus 5:14', 'Vós sois a luz do mundo.'],
  ['1 Coríntios 13:13', 'Agora permanecem a fé, a esperança e o amor; porém o maior destes é o amor.']
];

const now = new Date();

const day = Math.floor(
  Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ) / 86400000
);

const [ref, text] = verses[day % verses.length];

const title = `📖 Versículo do Dia — ${ref}`;
const body = text;

const users = await db.collection('users').get();
console.log(`Usuários encontrados: ${users.size}`);
let sent = 0;

for (const userDoc of users.docs) {
console.log(`ID do usuário: ${userDoc.id}`);
  const devices = await userDoc.ref
    .collection('devices')
    .where('enabled', '==', true)
    .get();
console.log(`Dispositivos encontrados: ${devices.size}`);
  
  const tokens = devices.docs
    .map(d => d.data().token)
    .filter(Boolean);

  if (!tokens.length) continue;

  const result = await messaging.sendEachForMulticast({
    tokens,

    notification: {
      title,
      body
    },

    data: {
      type: 'verse',
      url: 'https://taynahodlich30-oss.github.io/midiaigreja/'
    },

    webpush: {
      fcmOptions: {
        link: 'https://taynahodlich30-oss.github.io/midiaigreja/'
      }
    }
  });
result.responses.forEach((response, index) => {
  if (!response.success) {
    console.log(`ERRO NO TOKEN ${index + 1}:`, response.error?.code, response.error?.message);
  }
});
  if (result.successCount) {

    await userDoc.ref
      .collection('notifications')
      .add({
        type: 'verse',
        title,
        body,
        reference: ref,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    sent += result.successCount;
  }
}

console.log(`Versículos enviados: ${sent}`);
