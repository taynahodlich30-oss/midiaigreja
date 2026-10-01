/* =========================================================
   Portal CEP Pirapozinho · Envio automático de notificações
   Roda no GitHub Actions a cada 15 minutos (ver
   .github/workflows/notificacoes.yml). Usa a chave de serviço
   do Firebase guardada no segredo FIREBASE_SERVICE_ACCOUNT.

   - Versículo do dia às 7h para todos com notificações ativas
   - Escala: véspera às 19h, no dia às 8h e 1 hora antes
   Horário de Brasília. Cada aviso é enviado uma vez só
   (controle na coleção "lembretes" do Firestore).
   ========================================================= */
const admin = require('firebase-admin');

const FUSO = 'America/Sao_Paulo';
const HORA_VERSICULO = 7;
const HORA_VESPERA = 19;
const HORA_MANHA = 8;
const MINUTOS_ANTES = 60;
const URL_APP = 'https://taynahodlich30-oss.github.io/midiaigreja/';
const ADMIN_UID = 'v7IIVCiLYlh1ALLn1YplBJZTSFi2';
const MODO = (process.env.MODO || 'automatico').trim();

// Versículos conhecidos; o texto vem da tradução Almeida (domínio público)
const VERSICULOS = [
    ['JHN', 3, 16], ['PSA', 23, 1], ['PHP', 4, 13], ['ROM', 8, 28], ['JER', 29, 11], ['ISA', 41, 10], ['PRO', 3, 5], ['MAT', 11, 28],
    ['PSA', 46, 1], ['JOS', 1, 9], ['ISA', 40, 31], ['PHP', 4, 6], ['PSA', 37, 5], ['MAT', 6, 33], ['ROM', 12, 2], ['2CO', 5, 17],
    ['GAL', 2, 20], ['EPH', 2, 8], ['HEB', 11, 1], ['JAS', 1, 5], ['1PE', 5, 7], ['1JN', 4, 19], ['PSA', 119, 105], ['PSA', 121, 1],
    ['PSA', 27, 1], ['PSA', 91, 1], ['LAM', 3, 22], ['ISA', 26, 3], ['MAT', 5, 16], ['JHN', 14, 6], ['JHN', 14, 27], ['JHN', 15, 5],
    ['ROM', 5, 8], ['ROM', 10, 9], ['ROM', 15, 13], ['1CO', 13, 4], ['1CO', 10, 13], ['2CO', 12, 9], ['GAL', 5, 22], ['EPH', 3, 20],
    ['COL', 3, 23], ['1TH', 5, 16], ['2TI', 1, 7], ['HEB', 12, 1], ['HEB', 13, 8], ['JAS', 4, 8], ['1JN', 1, 9], ['REV', 3, 20],
    ['PSA', 100, 4], ['PSA', 34, 8], ['PSA', 16, 11], ['PSA', 55, 22], ['PSA', 103, 2], ['PSA', 145, 18], ['PRO', 16, 3], ['PRO', 18, 10],
    ['ISA', 43, 2], ['ISA', 55, 8], ['ZEP', 3, 17], ['MIC', 6, 8], ['NUM', 6, 24], ['DEU', 31, 6], ['MAT', 28, 20], ['MRK', 9, 23],
    ['LUK', 1, 37], ['JHN', 8, 12], ['JHN', 10, 10], ['JHN', 16, 33], ['ACT', 1, 8], ['ROM', 8, 31], ['ROM', 8, 38], ['PSA', 150, 6]
];
const NOMES = { JHN: 'João', PSA: 'Salmos', PHP: 'Filipenses', ROM: 'Romanos', JER: 'Jeremias', ISA: 'Isaías', PRO: 'Provérbios', MAT: 'Mateus', JOS: 'Josué', '2CO': '2 Coríntios', GAL: 'Gálatas', EPH: 'Efésios', HEB: 'Hebreus', JAS: 'Tiago', '1PE': '1 Pedro', '1JN': '1 João', LAM: 'Lamentações', '1CO': '1 Coríntios', COL: 'Colossenses', '1TH': '1 Tessalonicenses', '2TI': '2 Timóteo', REV: 'Apocalipse', ZEP: 'Sofonias', MIC: 'Miqueias', NUM: 'Números', DEU: 'Deuteronômio', MRK: 'Marcos', LUK: 'Lucas', ACT: 'Atos' };

/* ---------- Datas no horário de Brasília ---------- */
function partes(data) {
    const p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(data).forEach(function (x) { p[x.type] = x.value; });
    return { dia: p.year + '-' + p.month + '-' + p.day, hora: Number(p.hour), minuto: Number(p.minute) };
}
// "2026-10-04T18:30" digitado no app = horário de Brasília
function instanteDaEscala(dateTime) {
    const m = String(dateTime || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    const palpite = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    const p = partes(new Date(palpite));
    const ajuste = (Date.UTC(+p.dia.slice(0, 4), +p.dia.slice(5, 7) - 1, +p.dia.slice(8, 10), p.hora, p.minuto) - palpite);
    return new Date(palpite - ajuste);
}
function diaSeguinte(dia) { const d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
function horaBonita(data) { const p = partes(data); return String(p.hora).padStart(2, '0') + ':' + String(p.minuto).padStart(2, '0'); }

/* ---------- Envio ---------- */
let db, messaging;
async function aparelhosDe(uids) {
    const mapa = {};
    await Promise.all(uids.map(async function (uid) {
        const snap = await db.collection('users').doc(uid).collection('devices').get();
        mapa[uid] = snap.docs.filter(function (d) { const x = d.data(); return x.token && x.enabled !== false; }).map(function (d) { return { ref: d.ref, token: d.data().token }; });
    }));
    return mapa;
}
async function enviar(uids, titulo, corpo, tipo, chave) {
    uids = Array.from(new Set(uids.filter(Boolean)));
    if (!uids.length) return 0;
    const mapa = await aparelhosDe(uids);
    let enviados = 0;
    for (const uid of uids) {
        await db.collection('users').doc(uid).collection('notifications').doc(chave + '-' + uid.slice(0, 6)).set({
            title: titulo, body: corpo, type: tipo, read: false, url: URL_APP,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        const aparelhos = mapa[uid] || [];
        if (!aparelhos.length) continue;
        const r = await messaging.sendEachForMulticast({
            tokens: aparelhos.map(function (a) { return a.token; }),
            data: { title: titulo, body: corpo, url: URL_APP, tag: chave, type: tipo },
            webpush: { headers: { Urgency: 'high', TTL: '21600' }, fcmOptions: { link: URL_APP } }
        });
        r.responses.forEach(function (resp, i) {
            if (resp.success) { enviados++; return; }
            const codigo = resp.error && resp.error.code;
            if (codigo === 'messaging/registration-token-not-registered' || codigo === 'messaging/invalid-registration-token') {
                aparelhos[i].ref.set({ enabled: false, active: false, invalidAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            } else console.warn('Falha no envio para', uid, codigo);
        });
    }
    return enviados;
}
async function jaEnviado(id) { const d = await db.collection('lembretes').doc(id).get(); return d.exists; }
async function marcar(id, extra) { await db.collection('lembretes').doc(id).set(Object.assign({ em: admin.firestore.FieldValue.serverTimestamp() }, extra || {})); }

/* ---------- Versículo do dia ---------- */
async function versiculoDoDia(dia) {
    const n = Math.floor(Date.parse(dia + 'T00:00:00Z') / 86400000) % VERSICULOS.length;
    const [livro, cap, vers] = VERSICULOS[n];
    const r = await fetch('https://bible-api.com/data/almeida/' + livro + '/' + cap);
    if (!r.ok) throw new Error('Bíblia indisponível: HTTP ' + r.status);
    const dados = await r.json();
    const v = (dados.verses || []).filter(function (x) { return x.verse === vers; })[0];
    if (!v) throw new Error('Versículo não encontrado');
    return { texto: String(v.text).replace(/\s+/g, ' ').trim(), ref: (NOMES[livro] || livro) + ' ' + cap + ':' + vers };
}
async function todosComAparelho() {
    const snap = await db.collectionGroup('devices').get();
    const uids = new Set();
    snap.docs.forEach(function (d) { const x = d.data(); if (x.token && x.enabled !== false) uids.add(d.ref.parent.parent.id); });
    const ativos = [];
    for (const uid of uids) {
        const u = await db.collection('users').doc(uid).get();
        if (!u.exists || u.data().accessDisabled !== true) ativos.push(uid);
    }
    return ativos;
}
async function enviarVersiculo(dia, forcar) {
    const id = 'versiculo-' + dia;
    if (!forcar && await jaEnviado(id)) return;
    const v = await versiculoDoDia(dia);
    const uids = await todosComAparelho();
    const n = await enviar(uids, 'Versículo do dia · ' + v.ref, v.texto, 'versiculo', id);
    if (!forcar) await marcar(id, { ref: v.ref, pessoas: uids.length });
    console.log('Versículo do dia', v.ref, '→', uids.length, 'pessoas,', n, 'aparelhos');
}

/* ---------- Lembretes da escala ---------- */
async function lembretesDaEscala(agora) {
    const hoje = partes(agora);
    const amanha = diaSeguinte(hoje.dia);
    const snap = await db.collection('rosters').get();
    const membros = {};
    (await db.collection('members').get()).docs.forEach(function (d) { membros[d.id] = d.data(); });
    const musicas = {};

    for (const doc of snap.docs) {
        const r = doc.data();
        const inicio = instanteDaEscala(r.dateTime);
        if (!inicio || inicio <= agora) continue;
        const diaEscala = partes(inicio).dia;
        if (diaEscala !== hoje.dia && diaEscala !== amanha) continue;
        const minutosAte = (inicio - agora) / 60000;

        let tipo = null;
        if (minutosAte <= MINUTOS_ANTES) tipo = 'hora';
        else if (diaEscala === hoje.dia && hoje.hora >= HORA_MANHA) tipo = 'manha';
        else if (diaEscala === amanha && hoje.hora >= HORA_VESPERA) tipo = 'vespera';
        if (!tipo) continue;
        const id = 'escala-' + doc.id + '-' + tipo + '-' + diaEscala;
        if (await jaEnviado(id)) continue;

        // Quem está escalado e não avisou que não vai
        const respostas = {};
        (await doc.ref.collection('responses').get()).docs.forEach(function (d) { const x = d.data(); respostas[x.memberId || d.id] = x.attendance || x.status; respostas[d.id] = x.attendance || x.status; });
        const pessoas = (r.memberIds || []).map(String).map(function (mid) { return { mid: mid, m: membros[mid] }; }).filter(function (x) {
            if (!x.m || !x.m.accountUid) return false;
            const st = respostas[x.mid] || respostas[x.m.accountUid];
            return st !== 'declined' && st !== 'swap-approved';
        });

        const ministerio = r.department === 'midia' ? 'Mídia' : 'Louvor';
        const hora = horaBonita(inicio);
        let nomesMusicas = '';
        if (r.department !== 'midia' && (r.songIds || []).length) {
            for (const sid of r.songIds) {
                if (!(sid in musicas)) { const s = await db.collection('songs').doc(String(sid)).get(); musicas[sid] = s.exists ? s.data().title : ''; }
            }
            nomesMusicas = r.songIds.map(function (s) { return musicas[s]; }).filter(Boolean).join(', ');
        }
        let enviados = 0;
        for (const p of pessoas) {
            const funcao = p.m.role || p.m.churchRole || '';
            const quem = (r.service || 'Culto') + ' · ' + ministerio + (funcao ? ' (' + funcao + ')' : '');
            const titulo = tipo === 'vespera' ? 'Amanhã você está na escala' : tipo === 'manha' ? 'Hoje você está na escala' : 'Falta 1 hora para o culto';
            let corpo = quem + ' às ' + hora + '.';
            if (tipo !== 'hora' && nomesMusicas) corpo += ' Músicas: ' + nomesMusicas + '.';
            if (tipo === 'vespera') corpo += ' Confirme sua presença no portal.';
            if (tipo === 'hora' && r.reminder) corpo += ' ' + r.reminder;
            enviados += await enviar([p.m.accountUid], titulo, corpo, 'escala', id);
        }
        await marcar(id, { roster: doc.id, tipo: tipo, pessoas: pessoas.length });
        console.log('Escala', r.service, diaEscala, tipo, '→', pessoas.length, 'pessoas,', enviados, 'aparelhos');
    }
}

/* ---------- Principal ---------- */
async function principal() {
    const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!conta) {
        console.log('Falta o segredo FIREBASE_SERVICE_ACCOUNT no GitHub. Nada foi enviado.');
        if (MODO !== 'automatico') process.exitCode = 1;
        return;
    }
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(conta)) });
    db = admin.firestore();
    messaging = admin.messaging();

    const agora = new Date();
    const p = partes(agora);
    console.log('Agora em Brasília:', p.dia, p.hora + ':' + String(p.minuto).padStart(2, '0'), '· modo', MODO);

    if (MODO === 'teste') {
        const lideres = (await db.collection('users').where('role', 'in', ['admin', 'leader']).get()).docs.map(function (d) { return d.id; });
        const n = await enviar([ADMIN_UID].concat(lideres), 'Teste do Portal CEP', 'Se você recebeu isto, as notificações estão funcionando neste aparelho.', 'teste', 'teste-' + Date.now());
        console.log('Teste enviado para', n, 'aparelhos');
        return;
    }
    if (MODO === 'versiculo') return enviarVersiculo(p.dia, true);

    if (p.hora >= HORA_VERSICULO) {
        try { await enviarVersiculo(p.dia, false); } catch (e) { console.error('Versículo do dia:', e.message); }
    }
    await lembretesDaEscala(agora);
}

principal().then(function () { process.exit(process.exitCode || 0); }).catch(function (e) { console.error(e); process.exit(1); });
