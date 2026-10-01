/* =========================================================
   Portal CEP Pirapozinho · Telão (projeção de letras)
   Mesa do operador + saída em outra janela (projetor/TV) ou
   tela cheia neste aparelho. As letras vêm das músicas já
   cadastradas no portal (as cifras viram slides sem acordes),
   de letras novas ou de texto colado (avisos e versículos).
   ========================================================= */
(function () {
    var CHAVE_TEMA = 'cep-telao-tema';
    var FONTES = {
        montserrat: ['Montserrat', "'Montserrat', sans-serif", 800],
        poppins: ['Poppins', "'Poppins', sans-serif", 700],
        inter: ['Inter', "'Inter', sans-serif", 700],
        bebas: ['Bebas Neue', "'Bebas Neue', sans-serif", 400],
        playfair: ['Playfair Display', "'Playfair Display', serif", 700],
        lora: ['Lora', "'Lora', serif", 600]
    };
    var FUNDOS = {
        preto: ['Preto', '#000'],
        grafite: ['Grafite', 'radial-gradient(120% 90% at 50% 20%, #26262c 0%, #0c0c0e 70%)'],
        noite: ['Noite', 'linear-gradient(160deg, #0a1030 0%, #16245a 55%, #070b1e 100%)'],
        vinho: ['Vinho', 'linear-gradient(160deg, #2a0710 0%, #5a1426 55%, #16030a 100%)'],
        dourado: ['Dourado', 'radial-gradient(90% 80% at 50% 110%, rgba(212,174,82,.55) 0%, rgba(80,58,12,.5) 35%, #0c0a06 75%)'],
        aurora: ['Aurora', 'linear-gradient(135deg, #062a2a 0%, #0d3b4f 40%, #2a1a4d 100%)'],
        chroma: ['Chroma verde', '#00b140']
    };
    /* Fundos em movimento: feitos só com CSS, leves e sem precisar de vídeo */
    var ANIMADOS = {
        luzes: ['Luzes suaves', 'radial-gradient(120% 90% at 50% 100%, #1a1408 0%, #07070c 60%)'],
        aurora_viva: ['Aurora viva', 'linear-gradient(160deg, #03141c 0%, #071a2e 50%, #0c0a22 100%)'],
        raios: ['Raios de luz', 'radial-gradient(110% 80% at 50% -10%, #2a2440 0%, #0b0a18 55%, #050509 100%)'],
        particulas: ['Partículas', 'linear-gradient(180deg, #050814 0%, #0b1330 100%)'],
        ondas: ['Ondas', 'linear-gradient(180deg, #050b1c 0%, #0a1a3a 100%)'],
        gloria: ['Glória dourada', 'radial-gradient(100% 80% at 50% 110%, #2a1c06 0%, #0b0703 65%)']
    };
    function semente(n) { var x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); }
    function animInterno(k) {
        var h = '', i;
        if (k === 'luzes') {
            var cores = ['rgba(240,205,120,.38)', 'rgba(255,240,200,.22)', 'rgba(212,174,82,.32)', 'rgba(255,190,120,.2)'];
            for (i = 0; i < 12; i++) h += '<i class="tl-b" style="left:' + Math.round(semente(i) * 100) + '%;top:' + Math.round(semente(i + 40) * 100) + '%;width:' + (8 + Math.round(semente(i + 80) * 18)) + 'cqmin;height:' + (8 + Math.round(semente(i + 80) * 18)) + 'cqmin;background:' + cores[i % 4] + ';animation-duration:' + (14 + Math.round(semente(i + 120) * 16)) + 's;animation-delay:-' + Math.round(semente(i + 160) * 20) + 's"></i>';
        } else if (k === 'aurora_viva') {
            h = '<i class="tl-blob" style="left:-10%;top:10%;background:rgba(20,184,166,.42);animation-duration:19s"></i><i class="tl-blob" style="left:45%;top:-15%;background:rgba(124,58,237,.4);animation-duration:23s;animation-delay:-6s"></i><i class="tl-blob" style="left:25%;top:45%;background:rgba(14,116,244,.36);animation-duration:27s;animation-delay:-12s"></i>';
        } else if (k === 'raios') {
            h = '<i class="tl-raios"></i><i class="tl-raios tl-raios-2"></i>';
        } else if (k === 'particulas' || k === 'gloria') {
            if (k === 'gloria') h = '<i class="tl-blob" style="left:5%;top:40%;background:rgba(212,150,40,.45);animation-duration:21s"></i><i class="tl-blob" style="left:45%;top:35%;background:rgba(240,190,90,.35);animation-duration:25s;animation-delay:-9s"></i>';
            var n = k === 'gloria' ? 22 : 34;
            for (i = 0; i < n; i++) h += '<i class="tl-p' + (k === 'gloria' ? ' tl-p-ouro' : '') + '" style="left:' + (semente(i + 200) * 100).toFixed(1) + '%;width:' + (0.5 + semente(i + 240) * 1.1).toFixed(2) + 'cqmin;height:' + (0.5 + semente(i + 240) * 1.1).toFixed(2) + 'cqmin;animation-duration:' + (9 + Math.round(semente(i + 280) * 14)) + 's;animation-delay:-' + Math.round(semente(i + 320) * 22) + 's"></i>';
        } else if (k === 'ondas') {
            h = '<i class="tl-onda" style="background:rgba(56,130,246,.2);animation-duration:22s"></i><i class="tl-onda" style="background:rgba(20,184,166,.16);animation-duration:31s;margin-left:-8%"></i><i class="tl-onda" style="background:rgba(147,197,253,.1);animation-duration:39s;margin-left:6%"></i>';
        }
        return '<div class="tl-anim">' + h + '</div>';
    }

    var PADRAO = { fonte: 'montserrat', fundo: 'luzes', tamanho: 1, maiusculas: false, sombra: true, contorno: false, posicao: 'centro', titulo: true, linhas: 4,
        midiaId: '', abModo: 'minutos', abMin: 5, abHora: '19:00', abTitulo: 'O culto começa em', abSub: 'Silencie o celular e prepare o coração', abFim: 'Seja bem-vindo!', abMusica: '', abVolume: 0.6 };

    var tema = carregarTema();
    var midiaFundo = { tipo: '', url: '', id: '' };   // imagem ou vídeo escolhido neste aparelho
    var galeria = [];                          // vídeos, imagens e músicas salvos neste computador
    var galeriaCarregada = false;
    var ab = { alvo: 0, timer: null, fim: false, audio: null, fade: null };
    var fila = [];                             // itens do culto
    var atual = -1, slide = 0;
    var modo = 'normal';                       // normal | preto | logo | limpo
    var aba = 'culto';
    var busca = '';
    var saida = null;                          // janela do projetor
    var cheia = null;                          // tela cheia neste aparelho
    var montado = false;

    function carregarTema() {
        try { var t = JSON.parse(localStorage.getItem(CHAVE_TEMA) || '{}'); return Object.assign({}, PADRAO, t); } catch (e) { return Object.assign({}, PADRAO); }
    }
    function salvarTema() { try { localStorage.setItem(CHAVE_TEMA, JSON.stringify(tema)); } catch (e) {} }
    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function ic(n, c) { return '<i data-lucide="' + n + '"' + (c ? ' class="' + c + '"' : '') + '></i>'; }
    function icones() { if (window.lucide) lucide.createIcons(); }
    function aviso(m, t) { if (typeof portalToast === 'function') portalToast(m, t || 'auto'); }
    function musicas() { return typeof songsData !== 'undefined' ? (songsData || []) : []; }
    function escalas() { return typeof allRostersData !== 'undefined' ? (allRostersData || []) : []; }
    function podeCadastrar() {
        try { return currentUserRole === 'admin' || currentUserRole === 'leader' || currentUserRole === 'uploader' || (currentUser && currentUser.uid === ADMIN_UID); } catch (e) { return false; }
    }

    /* ---------- Fontes do Google (carregadas só quando o telão abre) ---------- */
    var URL_FONTES = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&family=Poppins:wght@600;700&family=Bebas+Neue&family=Playfair+Display:wght@700&family=Lora:wght@600&family=Inter:wght@600;700&display=swap';
    function carregarFontes(doc) {
        if (doc.getElementById('telao-fontes')) return;
        var l = doc.createElement('link');
        l.id = 'telao-fontes'; l.rel = 'stylesheet'; l.href = URL_FONTES;
        doc.head.appendChild(l);
    }

    /* ---------- Galeria: arquivos guardados neste computador (IndexedDB) ---------- */
    var BANCO = 'cep-telao', LOJA = 'midias';
    function banco() {
        return new Promise(function (ok, erro) {
            if (!window.indexedDB) return erro(new Error('Este navegador não guarda arquivos.'));
            var r = indexedDB.open(BANCO, 1);
            r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains(LOJA)) r.result.createObjectStore(LOJA, { keyPath: 'id' }); };
            r.onsuccess = function () { ok(r.result); };
            r.onerror = function () { erro(r.error); };
        });
    }
    function naLoja(tipoTx, acao) {
        return banco().then(function (db) {
            return new Promise(function (ok, erro) {
                var tx = db.transaction(LOJA, tipoTx), pedido = acao(tx.objectStore(LOJA));
                tx.oncomplete = function () { ok(pedido ? pedido.result : undefined); db.close(); };
                tx.onerror = tx.onabort = function () { erro(tx.error); db.close(); };
            });
        });
    }
    function tipoArquivo(f) { return /^video\//.test(f.type) ? 'video' : /^audio\//.test(f.type) ? 'audio' : 'imagem'; }
    function semExtensao(n) { return String(n || '').replace(/\.[^.]+$/, ''); }
    function carregarGaleria() {
        if (galeriaCarregada) return Promise.resolve();
        galeriaCarregada = true;
        return naLoja('readonly', function (st) { return st.getAll(); }).then(function (itens) {
            galeria = (itens || []).sort(function (a, b) { return b.criado - a.criado; }).map(function (it) {
                return { id: it.id, nome: it.nome, tipo: it.tipo, tamanho: it.tamanho, url: URL.createObjectURL(it.blob) };
            });
            if (tema.fundo === 'midia' && tema.midiaId) {
                var m = itemGaleria(tema.midiaId);
                if (m) midiaFundo = { tipo: m.tipo, url: m.url, id: m.id }; else tema.fundo = 'luzes';
            }
            desenhar(); transmitir();
        }).catch(function (e) { console.warn('Galeria do telão indisponível', e); });
    }
    function itemGaleria(id) { return galeria.filter(function (m) { return m.id === id; })[0]; }
    async function enviarArquivos(arquivos, quer) {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
        var primeiro = null;
        for (var i = 0; i < arquivos.length; i++) {
            var f = arquivos[i];
            if (!/^(video|image|audio)\//.test(f.type)) { aviso('"' + f.name + '" não é vídeo, imagem nem música.', 'error'); continue; }
            var tipo = tipoArquivo(f);
            var item = { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nome: f.name, tipo: tipo, tamanho: f.size, blob: f, criado: Date.now() };
            var mem = { id: item.id, nome: item.nome, tipo: tipo, tamanho: f.size, url: URL.createObjectURL(f) };
            try {
                await naLoja('readwrite', function (st) { return st.put(item); });
                aviso('"' + f.name + '" ficou salvo neste computador.');
            } catch (e) {
                console.error(e);
                aviso('Sem espaço para guardar "' + f.name + '". Ele funciona só até fechar o portal.', 'error');
            }
            galeria.unshift(mem);
            if (!primeiro && (quer === 'audio' ? tipo === 'audio' : tipo !== 'audio')) primeiro = mem;
        }
        if (primeiro && quer === 'audio') { tema.abMusica = primeiro.id; salvarTema(); desenhar(); }
        else if (primeiro) usarMidia(primeiro.id);
        else desenhar();
    }
    function usarMidia(id) {
        var m = itemGaleria(id);
        if (!m) return;
        midiaFundo = { tipo: m.tipo, url: m.url, id: m.id };
        tema.fundo = 'midia'; tema.midiaId = m.id;
        salvarTema(); desenhar();
    }
    async function apagarMidia(id) {
        var m = itemGaleria(id);
        if (!m) return;
        var ok = typeof portalConfirm === 'function' ? await portalConfirm('Apagar "' + m.nome + '" deste computador?', { danger: true, confirmText: 'Apagar' }) : true;
        if (!ok) return;
        try { await naLoja('readwrite', function (st) { return st.delete(id); }); } catch (e) {}
        galeria = galeria.filter(function (x) { return x.id !== id; });
        if (midiaFundo.id === id) { midiaFundo = { tipo: '', url: '', id: '' }; tema.fundo = 'luzes'; tema.midiaId = ''; }
        if (tema.abMusica === id) tema.abMusica = '';
        salvarTema();
        setTimeout(function () { URL.revokeObjectURL(m.url); }, 1000);
        desenhar();
    }

    /* ---------- Abertura: contagem regressiva para o início do culto ---------- */
    function abRestante() { return Math.max(0, ab.alvo - Date.now()); }
    function doisDig(n) { return (n < 10 ? '0' : '') + n; }
    function relogio(ms) {
        var t = Math.ceil(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
        return (h ? h + ':' + doisDig(m) : doisDig(m)) + ':' + doisDig(x);
    }
    function alvoDaAbertura() {
        if (tema.abModo === 'horario') {
            var p = String(tema.abHora || '').split(':'), d = new Date();
            d.setHours(Number(p[0]) || 0, Number(p[1]) || 0, 0, 0);
            return d.getTime();
        }
        return Date.now() + Math.max(1, Number(tema.abMin) || 5) * 60000;
    }
    function iniciarAbertura() {
        var alvo = alvoDaAbertura();
        if (alvo <= Date.now()) return aviso('Esse horário já passou. Escolha outro ou conte por minutos.', 'error');
        ab.alvo = alvo; ab.fim = false;
        modo = 'abertura';
        clearInterval(ab.timer);
        ab.timer = setInterval(tique, 250);
        tocarMusica();
        desenhar();
    }
    function pararAbertura(silencioso) {
        clearInterval(ab.timer); ab.timer = null;
        pararMusica();
        if (modo === 'abertura') modo = 'normal';
        if (!silencioso) desenhar();
        else if (aba === 'abertura') setTimeout(desenhar, 0);
    }
    function maisUmMinuto() {
        if (modo !== 'abertura') return;
        if (ab.fim) { ab.alvo = Date.now() + 60000; ab.fim = false; tocarMusica(); transmitir(); }
        else ab.alvo += 60000;
        tique();
    }
    function alvosPalco() {
        var l = [document.getElementById('tl-preview')];
        if (cheia) l.push(cheia.querySelector('.tl-cheia-raiz'));
        if (saida && !saida.closed) { try { l.push(saida.document.getElementById('tl-raiz')); } catch (e) {} }
        return l.filter(Boolean);
    }
    function tique() {
        if (modo !== 'abertura') return;
        var r = abRestante(), txt = relogio(r);
        alvosPalco().forEach(function (a) { var el = a.querySelector('.tl-relogio'); if (el && el.textContent !== txt) el.textContent = txt; });
        var op = document.getElementById('tl-ab-restante');
        if (op) op.textContent = ab.fim ? 'Contagem terminada' : 'Faltam ' + txt;
        if (r <= 0 && !ab.fim) {
            ab.fim = true;
            transmitir();
            if (aba === 'abertura') desenhar();
            setTimeout(function () { if (ab.fim) pararMusica(); }, 9000);
        }
    }
    function tocarMusica() {
        pararMusica(true);
        var m = tema.abMusica && itemGaleria(tema.abMusica);
        if (!m) return;
        ab.audio = new Audio(m.url);
        ab.audio.loop = true;
        ab.audio.volume = Math.min(1, Math.max(0, Number(tema.abVolume)));
        ab.audio.play().catch(function () { aviso('O navegador não deixou tocar a música. Clique em Iniciar de novo.', 'error'); });
    }
    function pararMusica(agora) {
        var a = ab.audio;
        clearInterval(ab.fade);
        if (!a) return;
        ab.audio = null;
        if (agora) { a.pause(); return; }
        ab.fade = setInterval(function () {
            a.volume = Math.max(0, a.volume - 0.04);
            if (a.volume <= 0.01) { clearInterval(ab.fade); a.pause(); }
        }, 120);
    }

    /* ---------- Bíblia (Almeida, domínio público, via bible-api.com) ---------- */
    var LIVROS = [
        ['GEN', 'Gênesis', 'gn', 50], ['EXO', 'Êxodo', 'ex', 40], ['LEV', 'Levítico', 'lv', 27], ['NUM', 'Números', 'nm', 36], ['DEU', 'Deuteronômio', 'dt', 34],
        ['JOS', 'Josué', 'js', 24], ['JDG', 'Juízes', 'jz', 21], ['RUT', 'Rute', 'rt', 4], ['1SA', '1 Samuel', '1sm', 31], ['2SA', '2 Samuel', '2sm', 24],
        ['1KI', '1 Reis', '1rs', 22], ['2KI', '2 Reis', '2rs', 25], ['1CH', '1 Crônicas', '1cr', 29], ['2CH', '2 Crônicas', '2cr', 36], ['EZR', 'Esdras', 'ed', 10],
        ['NEH', 'Neemias', 'ne', 13], ['EST', 'Ester', 'et', 10], ['JOB', 'Jó', 'jó', 42], ['PSA', 'Salmos', 'sl', 150], ['PRO', 'Provérbios', 'pv', 31],
        ['ECC', 'Eclesiastes', 'ec', 12], ['SNG', 'Cânticos', 'ct', 8], ['ISA', 'Isaías', 'is', 66], ['JER', 'Jeremias', 'jr', 52], ['LAM', 'Lamentações', 'lm', 5],
        ['EZK', 'Ezequiel', 'ez', 48], ['DAN', 'Daniel', 'dn', 12], ['HOS', 'Oseias', 'os', 14], ['JOL', 'Joel', 'jl', 3], ['AMO', 'Amós', 'am', 9],
        ['OBA', 'Obadias', 'ob', 1], ['JON', 'Jonas', 'jn', 4], ['MIC', 'Miqueias', 'mq', 7], ['NAM', 'Naum', 'na', 3], ['HAB', 'Habacuque', 'hc', 3],
        ['ZEP', 'Sofonias', 'sf', 3], ['HAG', 'Ageu', 'ag', 2], ['ZEC', 'Zacarias', 'zc', 14], ['MAL', 'Malaquias', 'ml', 4],
        ['MAT', 'Mateus', 'mt', 28], ['MRK', 'Marcos', 'mc', 16], ['LUK', 'Lucas', 'lc', 24], ['JHN', 'João', 'jo', 21], ['ACT', 'Atos', 'at', 28],
        ['ROM', 'Romanos', 'rm', 16], ['1CO', '1 Coríntios', '1co', 16], ['2CO', '2 Coríntios', '2co', 13], ['GAL', 'Gálatas', 'gl', 6], ['EPH', 'Efésios', 'ef', 6],
        ['PHP', 'Filipenses', 'fp', 4], ['COL', 'Colossenses', 'cl', 4], ['1TH', '1 Tessalonicenses', '1ts', 5], ['2TH', '2 Tessalonicenses', '2ts', 3], ['1TI', '1 Timóteo', '1tm', 6],
        ['2TI', '2 Timóteo', '2tm', 4], ['TIT', 'Tito', 'tt', 3], ['PHM', 'Filemom', 'fm', 1], ['HEB', 'Hebreus', 'hb', 13], ['JAS', 'Tiago', 'tg', 5],
        ['1PE', '1 Pedro', '1pe', 5], ['2PE', '2 Pedro', '2pe', 3], ['1JN', '1 João', '1jo', 5], ['2JN', '2 João', '2jo', 1], ['3JN', '3 João', '3jo', 1],
        ['JUD', 'Judas', 'jd', 1], ['REV', 'Apocalipse', 'ap', 22]
    ];
    var bib = { livro: 'JHN', cap: 3, versos: [], sel: [], carregando: false, erro: '' };
    function semAcento(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    function livroPorId(id) { return LIVROS.filter(function (l) { return l[0] === id; })[0]; }
    function acharLivro(nome) {
        var bruto = String(nome || '').toLowerCase().replace(/[\s.]/g, '');
        var limpo = semAcento(bruto);
        if (!limpo) return null;
        var exato = LIVROS.filter(function (l) { return l[2] === bruto; })[0] || LIVROS.filter(function (l) { return semAcento(l[2]) === limpo && l[0] !== 'JOB'; })[0];
        if (exato) return exato;
        return LIVROS.filter(function (l) { return semAcento(l[1]).replace(/\s/g, '').indexOf(limpo) === 0; })[0] || null;
    }
    function lerReferencia(t) {
        var m = String(t || '').trim().match(/^([1-3]?\s*[a-zA-ZÀ-ÿ.]+)\s*(\d{1,3})(?:\s*[:.,\s]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?\s*$/);
        if (!m) return null;
        var l = acharLivro(m[1]);
        if (!l) return null;
        var cap = Math.min(Number(m[2]), l[3]);
        var de = m[3] ? Number(m[3]) : 0, ate = m[4] ? Number(m[4]) : de;
        return { livro: l[0], cap: cap, de: de, ate: Math.max(de, ate) };
    }
    function buscarCapitulo(livro, cap) {
        var chave = 'cep-biblia-' + livro + '-' + cap;
        try { var c = JSON.parse(localStorage.getItem(chave) || 'null'); if (c && c.length) return Promise.resolve(c); } catch (e) {}
        return fetch('https://bible-api.com/data/almeida/' + livro + '/' + cap).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function (d) {
            var v = (d.verses || []).map(function (x) { return { n: x.verse, t: String(x.text || '').replace(/\s+/g, ' ').trim() }; });
            try { localStorage.setItem(chave, JSON.stringify(v)); } catch (e) {}
            return v;
        });
    }
    function abrirCapitulo(livro, cap, de, ate, projetar) {
        bib.livro = livro; bib.cap = cap; bib.carregando = true; bib.erro = ''; bib.versos = []; bib.sel = [];
        desenhar();
        return buscarCapitulo(livro, cap).then(function (v) {
            bib.versos = v; bib.carregando = false;
            if (de) for (var i = de; i <= (ate || de); i++) if (v.some(function (x) { return x.n === i; })) bib.sel.push(i);
            if (projetar) projetarVerso(de || 1);
            else desenhar();
            rolarParaVerso();
        }).catch(function (e) {
            console.error(e);
            bib.carregando = false;
            bib.erro = 'Não consegui buscar a Bíblia agora. Confira a internet e tente de novo.';
            desenhar();
        });
    }
    /* Cada capítulo vira um item com um slide por versículo: clicar projeta, as setas seguem o texto */
    function itemCapitulo(livro, cap, versos) {
        var l = livroPorId(livro), slides = [];
        versos.forEach(function (v) {
            var ref = (l[1] + ' ' + cap + ':' + v.n).toUpperCase();
            var partes = quebrarLonga(v.t);
            partes.forEach(function (pt, i) { slides.push({ rotulo: l[1] + ' ' + cap + ':' + v.n + (partes.length > 1 ? ' (' + (i + 1) + '/' + partes.length + ')' : ''), linhas: [pt], ref: ref, v: v.n }); });
        });
        return { chave: 'b:' + livro + cap + ':' + Date.now(), tipo: 'biblia', titulo: l[1] + ' ' + cap, texto: '', slides: slides, livro: livro, cap: cap };
    }
    function bibliaAoVivo() { var it = fila[atual]; return it && it.tipo === 'biblia' && it.livro ? it : null; }
    function versoAoVivo() { var it = bibliaAoVivo(); return it && it.livro === bib.livro && it.cap === bib.cap && it.slides[slide] ? it.slides[slide].v : 0; }
    function projetarVerso(n) {
        if (!bib.versos.length) return;
        var it = bibliaAoVivo();
        if (!(it && it.livro === bib.livro && it.cap === bib.cap)) {
            var novo = itemCapitulo(bib.livro, bib.cap, bib.versos);
            if (it) { fila[atual] = novo; }
            else { fila.splice(atual + 1, 0, novo); atual = atual + 1; }
            it = novo;
        }
        var idx = 0;
        for (var i = 0; i < it.slides.length; i++) if (it.slides[i].v === n) { idx = i; break; }
        slide = idx; modo = 'normal';
        desenhar();
        rolarParaVerso();
    }
    function rolarParaVerso() {
        setTimeout(function () {
            var alvo = document.querySelector('#tl-conteudo .tl-verso.is-live') || document.querySelector('#tl-conteudo .tl-verso.is-sel');
            if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ block: 'nearest' });
        }, 30);
    }
    /* No fim do capítulo, a seta continua no próximo */
    function capituloVizinho(direcao) {
        var it = bibliaAoVivo();
        if (!it) return false;
        var l = livroPorId(it.livro), idxLivro = LIVROS.indexOf(l), livro = it.livro, cap = it.cap + direcao;
        if (cap < 1) { if (idxLivro === 0) return false; livro = LIVROS[idxLivro - 1][0]; cap = LIVROS[idxLivro - 1][3]; }
        else if (cap > l[3]) { if (idxLivro === LIVROS.length - 1) return false; livro = LIVROS[idxLivro + 1][0]; cap = 1; }
        var posicao = atual;
        buscarCapitulo(livro, cap).then(function (v) {
            if (fila[posicao] !== it) return;
            var novo = itemCapitulo(livro, cap, v);
            fila[posicao] = novo;
            bib.livro = livro; bib.cap = cap; bib.versos = v; bib.sel = []; bib.erro = '';
            slide = direcao > 0 ? 0 : novo.slides.length - 1;
            modo = 'normal';
            desenhar(); rolarParaVerso();
        }).catch(function () { aviso('Não consegui abrir o próximo capítulo. Confira a internet.', 'error'); });
        return true;
    }
    function referenciaSel() {
        var l = livroPorId(bib.livro), s = bib.sel.slice().sort(function (a, b) { return a - b; });
        if (!s.length) return l[1] + ' ' + bib.cap;
        var faixa = s.length > 1 && s[s.length - 1] - s[0] === s.length - 1 ? s[0] + '-' + s[s.length - 1] : s.join(',');
        return l[1] + ' ' + bib.cap + ':' + faixa;
    }
    function itemDaBiblia() {
        var l = livroPorId(bib.livro), slides = [];
        bib.sel.slice().sort(function (a, b) { return a - b; }).forEach(function (n) {
            var v = bib.versos.filter(function (x) { return x.n === n; })[0];
            if (!v) return;
            var ref = l[1] + ' ' + bib.cap + ':' + n;
            var partes = quebrarLonga(v.t);
            partes.forEach(function (pt, i) { slides.push({ rotulo: ref + (partes.length > 1 ? ' (' + (i + 1) + '/' + partes.length + ')' : ''), linhas: [pt], ref: ref.toUpperCase() }); });
        });
        return { chave: 'b:' + Date.now() + Math.random(), tipo: 'biblia', titulo: referenciaSel(), texto: '', slides: slides };
    }
    function abaBiblia() {
        var l = livroPorId(bib.livro), vivo = versoAoVivo();
        var h = '<div class="tl-bloco"><label class="tl-label" for="tl-ref">Digite e aperte Enter para projetar</label><div class="tl-linha"><input id="tl-ref" type="text" placeholder="Ex.: jo 3 16 · sl 23 1 · rm 8 28" autocomplete="off" enterkeyhint="go"><button type="button" class="md-btn md-btn-primary" data-tl="bib-ir" title="Projetar">' + ic('presentation') + '</button></div>' +
            '<div class="tl-linha"><select id="tl-bib-livro" aria-label="Livro">' + LIVROS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === bib.livro ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>' +
            '<select id="tl-bib-cap" aria-label="Capítulo">' + Array.apply(null, { length: l[3] }).map(function (_, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === bib.cap ? ' selected' : '') + '>' + (i + 1) + '</option>'; }).join('') + '</select></div></div>';
        h += '<div class="tl-bloco">';
        if (bib.carregando) h += '<p class="tl-dica-txt">' + ic('loader-circle', 'w-3.5 h-3.5') + 'Buscando ' + esc(l[1]) + ' ' + bib.cap + '…</p>';
        else if (bib.erro) h += '<p class="tl-dica-txt tl-erro">' + ic('circle-alert', 'w-3.5 h-3.5') + esc(bib.erro) + ' <button type="button" class="tl-link" data-tl="bib-tentar">Tentar de novo</button></p>';
        else if (bib.versos.length) {
            h += '<div class="tl-fila-head"><label class="tl-label">' + esc(l[1]) + ' ' + bib.cap + '</label><button type="button" class="tl-link tl-link-ok" data-tl="bib-fila">' + ic('list-plus', 'w-3.5 h-3.5') + 'Pôr na ordem</button></div>' +
                '<p class="tl-dica-txt">' + ic('info', 'w-3.5 h-3.5') + 'Clique no versículo para projetar. Depois use → e ← (ou o celular) para seguir o texto.</p><ol class="tl-versos">' + bib.versos.map(function (v) {
                    return '<li><button type="button" class="tl-verso' + (vivo === v.n ? ' is-live' : bib.sel.indexOf(v.n) !== -1 ? ' is-sel' : '') + '" data-tl-verso="' + v.n + '"><b>' + v.n + '</b>' + esc(v.t) + '</button></li>';
                }).join('') + '</ol>';
        } else h += '<p class="tl-dica-txt">' + ic('book-open', 'w-3.5 h-3.5') + 'Tradução João Ferreira de Almeida (domínio público). Precisa de internet na primeira vez; depois o capítulo fica guardado.</p>';
        return h + '</div>';
    }

    /* ---------- Controle pelo celular e tela do palco (Firestore: settings/telao) ---------- */
    var REMOTO = { ativo: false, hostId: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cancelar: null, ultimoCmd: null, ultimoEnvio: '', espera: null, batida: null, avisou: false, assumido: true };
    function docAoVivo() { try { return (typeof db !== 'undefined' && db && typeof currentUser !== 'undefined' && currentUser) ? db.collection('settings').doc('telao') : null; } catch (e) { return null; } }
    function proximoSlide() {
        var it = fila[atual];
        if (it && it.slides[slide + 1]) return { linhas: it.slides[slide + 1].linhas, titulo: it.titulo, ref: it.slides[slide + 1].ref || '' };
        var prox = fila[atual + 1];
        if (prox && prox.slides[0]) return { linhas: prox.slides[0].linhas, titulo: prox.titulo, ref: prox.slides[0].ref || '', novoItem: true };
        return null;
    }
    function estadoAoVivo() {
        var it = fila[atual], s = slideAtual();
        return {
            hostId: REMOTO.hostId, modo: modo, atual: atual, slide: slide,
            titulo: it ? it.titulo : '', tipo: it ? it.tipo : '',
            linhas: s ? s.linhas : [], ref: s && s.ref ? s.ref : '',
            proximo: proximoSlide(),
            fila: fila.map(function (x) { return { titulo: x.titulo, tipo: x.tipo, n: x.slides.length }; }),
            slides: it ? it.slides.map(function (x) { return { rotulo: x.rotulo || '', resumo: x.linhas.join(' / ').slice(0, 80) }; }) : [],
            abertura: modo === 'abertura' ? { alvo: ab.alvo, fim: ab.fim, titulo: tema.abTitulo || '', sub: tema.abSub || '', txtFim: tema.abFim || '' } : null
        };
    }
    function publicar(forcar) {
        if (!REMOTO.ativo || !REMOTO.assumido) return;
        clearTimeout(REMOTO.espera);
        REMOTO.espera = setTimeout(function () {
            var doc = docAoVivo();
            if (!doc) return;
            var est = estadoAoVivo(), json = JSON.stringify(est);
            if (!forcar && json === REMOTO.ultimoEnvio) return;
            REMOTO.ultimoEnvio = json;
            est.at = Date.now();
            doc.set({ estado: est }, { merge: true }).catch(function (e) {
                console.error('Telão ao vivo:', e);
                if (!REMOTO.avisou) { REMOTO.avisou = true; aviso('O celular e a tela do palco não conseguiram se conectar (permissão do Firebase).', 'error'); }
            });
        }, 120);
    }
    function executarComando(c) {
        var a = c.acao;
        if (a === 'prox') proximo();
        else if (a === 'ant') anterior();
        else if (a === 'preto' || a === 'logo' || a === 'limpo') alternarModo(a);
        else if (a === 'abertura') { if (modo === 'abertura') pararAbertura(); else iniciarAbertura(); }
        else if (a === 'ab-mais') maisUmMinuto();
        else if (a === 'ir' && fila[c.item]) { atual = c.item; slide = Math.min(Math.max(0, c.slide || 0), Math.max(0, fila[atual].slides.length - 1)); modo = 'normal'; desenhar(); transmitir(); }
        else if (a === 'escala' && c.escala) carregarEscala(c.escala);
        else if (a === 'biblia' && c.ref) {
            var r = lerReferencia(c.ref);
            if (!r) aviso('Referência do celular não entendida: ' + c.ref, 'error');
            else { aba = 'biblia'; abrirCapitulo(r.livro, r.cap, r.de || 1, r.ate, true); }
        }
        if (c.por) aviso('Comando do celular de ' + String(c.por).split(' ')[0] + '.');
    }
    function ativarRemoto() {
        var doc = docAoVivo();
        if (!doc || REMOTO.ativo) { if (REMOTO.ativo) { REMOTO.assumido = true; publicar(true); } return; }
        REMOTO.ativo = true; REMOTO.assumido = true;
        REMOTO.cancelar = doc.onSnapshot(function (snap) {
            var d = (snap && snap.exists && snap.data()) || {};
            var c = d.comando;
            if (REMOTO.ultimoCmd === null) { REMOTO.ultimoCmd = c ? c.id : ''; }
            else if (c && c.id !== REMOTO.ultimoCmd) {
                REMOTO.ultimoCmd = c.id;
                if (c.host === REMOTO.hostId) executarComando(c);
            }
            var outro = d.estado && d.estado.hostId && d.estado.hostId !== REMOTO.hostId && (d.estado.at || 0) > (REMOTO.desde || 0);
            if (outro && REMOTO.assumido) { REMOTO.assumido = false; aviso('Outro computador assumiu o telão. Este parou de responder ao celular.'); transmitir(); }
        }, function (e) { console.error('Telão ao vivo (escuta):', e); });
        REMOTO.desde = Date.now();
        clearInterval(REMOTO.batida);
        REMOTO.batida = setInterval(function () { publicar(true); }, 30000);
        publicar(true);
    }

    /* ---------- Letras: cifra -> slides ---------- */
    var ACORDE = /^\(?[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|º|°|\+|-|\d|\(|\)|#|b)*(?:\/[A-G][#b]?)?\)?$/;
    function linhaDeAcordes(l) {
        var t = l.replace(/[|]/g, ' ').trim().replace(/^\[[^\]]{1,30}\]\s*/, '');
        if (!t) return false;
        t = t.replace(/^(intro|introdução|solo|final|ponte|riff|interlúdio|instrumental|pré-refrão|pre-refrao|base)\s*:?/i, '').trim();
        if (!t) return false;
        var partes = t.split(/\s+/).filter(function (p) { return !/^(x?\d+x?|\(\d+x\)|-+|\.+|%)$/i.test(p); });
        if (!partes.length) return true;
        return partes.every(function (p) { return ACORDE.test(p); });
    }
    function linhaDeTab(l) {
        var hifens = (l.match(/-/g) || []).length;
        return hifens >= 6 && /^\s*[A-Ga-g]?[#b]?\s*[|:]/.test(l);
    }
    function marcador(l) {
        var t = l.trim();
        var m = t.match(/^\[([^\]]{1,40})\]$/) || t.match(/^\(?((?:verso|estrofe|refrão|refrao|coro|ponte|pré-refrão|pre-refrao|final|intro|introdução|solo|tag|interlúdio)[^:()]{0,20})\)?\s*:$/i);
        return m ? m[1].trim() : null;
    }
    var SEM_LETRA = /^(intro|introdução|solo|instrumental|riff|interlúdio|base)/i;

    function letraEmBlocos(texto) {
        var blocos = [], atualB = { rotulo: '', linhas: [] }, ignorar = false;
        function fecha() { if (atualB.linhas.length && !ignorar) blocos.push(atualB); atualB = { rotulo: atualB.rotulo, linhas: [] }; }
        String(texto || '').replace(/\r/g, '').split('\n').forEach(function (bruta) {
            var l = bruta.replace(/\t/g, ' ');
            var mk = marcador(l);
            if (mk !== null) { fecha(); atualB.rotulo = mk; ignorar = SEM_LETRA.test(mk); return; }
            if (!l.trim()) { fecha(); return; }
            if (linhaDeTab(l) || linhaDeAcordes(l)) return;
            l = l.replace(/\[[A-G][^\]\s]{0,10}\]/g, '').replace(/\s{2,}/g, ' ').trim();
            if (/^\(?\s*(\d+\s*x|x\s*\d+|bis)\s*\)?$/i.test(l)) return;
            if (l) atualB.linhas.push(l);
        });
        fecha();
        return blocos;
    }
    function quebrarLonga(l) {
        if (l.length <= 140) return [l];
        var frases = l.match(/[^.!?;:]+[.!?;:]*\s*/g) || [l], out = [], buf = '';
        frases.forEach(function (f) {
            if ((buf + f).length > 150 && buf) { out.push(buf.trim()); buf = ''; }
            buf += f;
        });
        if (buf.trim()) out.push(buf.trim());
        return out;
    }
    function montarSlides(texto, tipo) {
        var max = Number(tema.linhas) || 4, slides = [];
        letraEmBlocos(texto).forEach(function (b) {
            var linhas = [];
            b.linhas.forEach(function (l) { linhas = linhas.concat(tipo === 'texto' ? quebrarLonga(l) : [l]); });
            var porSlide = tipo === 'texto' && linhas.some(function (l) { return l.length > 80; }) ? 1 : max;
            for (var i = 0; i < linhas.length; i += porSlide) slides.push({ rotulo: b.rotulo, linhas: linhas.slice(i, i + porSlide) });
        });
        return slides;
    }
    function refazerSlides() {
        fila.forEach(function (it) { it.slides = montarSlides(it.texto, it.tipo); });
        if (fila[atual]) slide = Math.min(slide, Math.max(0, fila[atual].slides.length - 1));
    }

    /* ---------- Fila do culto ---------- */
    function itemDeMusica(s) {
        return { chave: 's:' + s.id + ':' + Date.now() + Math.random(), tipo: 'musica', songId: String(s.id), titulo: s.title || 'Música', texto: s.content || '', slides: montarSlides(s.content || '', 'musica'), pdfSemTexto: s.type === 'pdf' && !s.content };
    }
    function itemDeTexto(titulo, texto) {
        return { chave: 't:' + Date.now() + Math.random(), tipo: 'texto', titulo: titulo || 'Texto', texto: texto, slides: montarSlides(texto, 'texto') };
    }
    function adicionar(item, projetar) {
        fila.push(item);
        if (projetar || atual < 0) { atual = fila.length - 1; slide = 0; modo = 'normal'; }
        desenhar(); transmitir();
        if (!item.slides.length) aviso(item.pdfSemTexto ? 'Esta música está em PDF sem texto. Cole a letra na aba Texto.' : 'Não encontrei letra nesta música.', 'error');
    }
    function carregarEscala(id) {
        var r = escalas().filter(function (x) { return String(x.id) === String(id); })[0];
        if (!r) return;
        var lista = (r.songIds || []).map(function (sid) { return musicas().filter(function (s) { return String(s.id) === String(sid); })[0]; }).filter(Boolean);
        if (!lista.length) return aviso('Esta escala ainda não tem músicas.', 'error');
        fila = lista.map(itemDeMusica);
        atual = 0; slide = 0; modo = 'normal';
        aba = 'culto';
        desenhar(); transmitir();
        aviso(lista.length + (lista.length === 1 ? ' música carregada' : ' músicas carregadas') + ' na ordem do culto.');
    }
    function escalaPadrao() {
        var agora = new Date(); agora.setHours(0, 0, 0, 0);
        return escalas().filter(function (r) { return r.department !== 'midia' && r.dateTime && new Date(r.dateTime) >= agora && (r.songIds || []).length; })
            .sort(function (a, b) { return new Date(a.dateTime) - new Date(b.dateTime); })[0];
    }

    /* ---------- O que está no ar ---------- */
    function slideAtual() { var it = fila[atual]; return it && it.slides[slide] ? it.slides[slide] : null; }
    function estiloTexto(sl) {
        var f = FONTES[tema.fonte] || FONTES.montserrat;
        var s = 'font-family:' + f[1] + ';font-weight:' + f[2] + ';';
        var chars = sl ? sl.linhas.join(' ').length : 0;
        var fator = chars > 260 ? 0.58 : chars > 190 ? 0.66 : chars > 130 ? 0.76 : chars > 90 ? 0.88 : 1;
        s += 'font-size:calc(' + (tema.fonte === 'bebas' ? 9 : 7) + 'cqmin * ' + ((Number(tema.tamanho) || 1) * fator).toFixed(3) + ');';
        if (tema.maiusculas) s += 'text-transform:uppercase;';
        if (tema.fonte === 'bebas') s += 'letter-spacing:.02em;';
        var sombras = [];
        if (tema.sombra) sombras.push('0 .06em .18em rgba(0,0,0,.85)', '0 0 .6em rgba(0,0,0,.45)');
        if (tema.contorno) s += '-webkit-text-stroke:.035em #000;paint-order:stroke fill;';
        if (sombras.length) s += 'text-shadow:' + sombras.join(',') + ';';
        return s;
    }
    function chaveFundo() { return tema.fundo + '|' + (tema.fundo === 'midia' ? midiaFundo.url : ''); }
    function corFundo(k) {
        if (k === 'midia') return midiaFundo.url ? '#000' : FUNDOS.grafite[1];
        return (FUNDOS[k] || ANIMADOS[k] || FUNDOS.grafite)[1];
    }
    function fundoInterno(k) {
        if (k === 'midia' && midiaFundo.url) {
            return (midiaFundo.tipo === 'video'
                ? '<video class="tl-midia" src="' + midiaFundo.url + '" autoplay muted loop playsinline></video>'
                : '<div class="tl-midia" style="background-image:url(\'' + midiaFundo.url + '\')"></div>') + '<div class="tl-veu"></div>';
        }
        return ANIMADOS[k] ? animInterno(k) : '';
    }
    var LOGO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="url(#tlg)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="tlg" x1="0" y1="2" x2="0" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#d4ae52"/><stop offset="1" stop-color="#a88227"/></linearGradient></defs><path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5.618a1 1 0 0 0-.553-.894l-4.553-2.277a2 2 0 0 0-1.788 0L6.553 4.724A1 1 0 0 0 6 5.618V22"/><path d="m18 7 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.618a1 1 0 0 1 .553-.894L6 7"/></svg>';
    function conteudoPalco() {
        if (modo === 'abertura') {
            var fonte = (FONTES[tema.fonte] || FONTES.montserrat)[1];
            var corpo = ab.fim
                ? '<div class="tl-ab-fim" style="font-family:' + fonte.replace(/"/g, '&quot;') + '">' + esc(tema.abFim || 'Seja bem-vindo!') + '</div>'
                : '<div class="tl-ab-titulo">' + esc(tema.abTitulo || '') + '</div><div class="tl-relogio">' + relogio(abRestante()) + '</div>' + (tema.abSub ? '<div class="tl-ab-sub">' + esc(tema.abSub) + '</div>' : '');
            return '<div class="tl-ab' + (ab.fim ? ' is-fim' : '') + '"><div class="tl-ab-logo">' + LOGO_SVG + '</div>' + corpo + '<div class="tl-ab-igreja">CEP Pirapozinho</div></div>';
        }
        if (modo === 'logo') return '<div class="tl-logo">' + LOGO_SVG + '<b>CEP Pirapozinho</b></div>';
        var s = slideAtual(), h = '';
        if (modo !== 'limpo' && s) {
            h += '<div class="tl-texto tl-' + (tema.posicao === 'baixo' ? 'baixo' : 'centro') + '" style="' + estiloTexto(s) + '">' + s.linhas.map(esc).join('<br>') + '</div>';
            if (s.ref) h += '<div class="tl-rodape tl-ref">' + esc(s.ref) + '</div>';
            else if (tema.titulo && fila[atual] && fila[atual].tipo === 'musica') h += '<div class="tl-rodape">' + esc(fila[atual].titulo) + '</div>';
        }
        return h;
    }
    var CSS_PALCO =
        '.tl-palco{position:absolute;inset:0;overflow:hidden;container-type:size;color:#fff}' +
        '.tl-bg,.tl-camada,.tl-preto{position:absolute;inset:0}' +
        '.tl-camada{z-index:2;display:flex;align-items:center;justify-content:center}' +
        '.tl-preto{z-index:6;background:#000;opacity:0;transition:opacity .45s ease;pointer-events:none}' +
        '.tl-palco.is-preto .tl-preto{opacity:1}' +
        '.tl-anim{position:absolute;inset:0;overflow:hidden;container-type:size}' +
        '.tl-anim i{position:absolute;display:block;pointer-events:none;will-change:transform}' +
        '.tl-b{border-radius:50%;filter:blur(3cqmin);transform:translate(-50%,-50%);animation:tlFlutua 20s ease-in-out infinite alternate}' +
        '.tl-blob{width:75%;height:75%;border-radius:50%;filter:blur(9cqmin);animation:tlDeriva 22s ease-in-out infinite alternate}' +
        '.tl-raios{left:50%;top:-30%;width:160cqmax;height:160cqmax;margin-left:-80cqmax;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,236,190,.13) 0deg 4deg,transparent 4deg 13deg);-webkit-mask:radial-gradient(circle at 50% 50%,#000 0%,transparent 55%);mask:radial-gradient(circle at 50% 50%,#000 0%,transparent 55%);animation:tlGira 80s linear infinite}' +
        '.tl-raios-2{opacity:.6;animation-duration:120s;animation-direction:reverse}' +
        '.tl-p{bottom:-3%;border-radius:50%;background:rgba(200,225,255,.85);box-shadow:0 0 1.2cqmin rgba(160,200,255,.9);animation:tlSobe 14s linear infinite}' +
        '.tl-p-ouro{background:rgba(255,226,150,.95);box-shadow:0 0 1.4cqmin rgba(240,180,60,.95)}' +
        '.tl-onda{left:-25%;width:150%;height:150%;top:74%;border-radius:43%;animation:tlGira 30s linear infinite}' +
        '@keyframes tlFlutua{0%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-38%,-62%) scale(1.25)}100%{transform:translate(-60%,-44%) scale(.85)}}' +
        '@keyframes tlDeriva{0%{transform:translate(0,0) scale(1)}50%{transform:translate(18%,-12%) scale(1.15)}100%{transform:translate(-14%,10%) scale(.9)}}' +
        '@keyframes tlGira{to{transform:rotate(360deg)}}' +
        '@keyframes tlSobe{0%{transform:translateY(0);opacity:0}10%{opacity:1}85%{opacity:.8}100%{transform:translateY(-110cqh);opacity:0}}' +
        '@media (prefers-reduced-motion:reduce){.tl-anim i{animation-duration:200s !important}}' +
        '.tl-ref{font-size:2.8cqmin;color:rgba(246,226,160,.92);letter-spacing:.16em}' +
        '.tl-ab{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;gap:1.4cqmin;padding:0 6%;animation:tlEntra .5s ease-out}' +
        '.tl-ab-logo svg{width:10cqmin;height:10cqmin;filter:drop-shadow(0 .5cqmin 1.2cqmin rgba(0,0,0,.6))}' +
        '.tl-ab-titulo{margin-top:1cqmin;font:700 4cqmin Montserrat,Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.82);text-shadow:0 .3cqmin 1cqmin rgba(0,0,0,.6)}' +
        '.tl-relogio{font:800 25cqmin Montserrat,Inter,sans-serif;font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-.02em;background:linear-gradient(180deg,#ffffff 0%,#f6e6b4 55%,#d4ae52 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 .8cqmin 2cqmin rgba(0,0,0,.55))}' +
        '.tl-ab-sub{font:500 3.1cqmin Inter,system-ui,sans-serif;color:rgba(255,255,255,.78);text-shadow:0 .3cqmin 1cqmin rgba(0,0,0,.6)}' +
        '.tl-ab-fim{font-weight:800;font-size:10cqmin;line-height:1.1;background:linear-gradient(180deg,#ffffff 0%,#f6e6b4 55%,#d4ae52 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 .8cqmin 2cqmin rgba(0,0,0,.55));animation:tlEntra .8s ease-out}' +
        '.tl-ab-igreja{margin-top:2.4cqmin;font:700 2.3cqmin Inter,system-ui,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:rgba(230,200,114,.9)}' +
        '.tl-midia{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background-size:cover;background-position:center}' +
        '.tl-veu{position:absolute;inset:0;background:rgba(0,0,0,.38)}' +
        '.tl-texto{position:relative;z-index:1;width:88%;text-align:center;line-height:1.28;overflow-wrap:break-word;animation:tlEntra .28s ease-out}' +
        '.tl-texto.tl-baixo{position:absolute;left:6%;right:6%;width:auto;bottom:9%}' +
        '.tl-rodape{position:absolute;z-index:1;left:0;right:0;bottom:3.2%;text-align:center;font:600 2.1cqmin Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}' +
        '.tl-logo{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:3cqmin;animation:tlEntra .4s ease-out}' +
        '.tl-logo svg{width:22cqmin;height:22cqmin;filter:drop-shadow(0 .6cqmin 1.4cqmin rgba(0,0,0,.6))}' +
        '.tl-logo b{font:800 5.4cqmin Montserrat,Inter,sans-serif;letter-spacing:.06em;background:linear-gradient(180deg,#fff3c4,#d4ae52 60%,#a88227);-webkit-background-clip:text;background-clip:text;color:transparent}' +
        '@keyframes tlEntra{from{opacity:0;transform:translateY(.6cqmin)}to{opacity:1;transform:none}}';

    /* O fundo só é recriado quando muda; trocar de slide não reinicia vídeo nem animação */
    function pintar(alvo) {
        if (!alvo) return;
        var chave = chaveFundo();
        var palco = alvo.querySelector('.tl-palco');
        if (!palco || palco.getAttribute('data-fundo') !== chave) {
            alvo.innerHTML = '<div class="tl-palco" style="background:' + corFundo(tema.fundo) + '"><div class="tl-bg">' + fundoInterno(tema.fundo) + '</div><div class="tl-camada"></div><div class="tl-preto"></div></div>';
            palco = alvo.querySelector('.tl-palco');
            palco.setAttribute('data-fundo', chave);
        }
        var camada = palco.querySelector('.tl-camada');
        var html = conteudoPalco();
        if (camada.getAttribute('data-html') !== html) { camada.innerHTML = html; camada.setAttribute('data-html', html); }
        palco.classList.toggle('is-preto', modo === 'preto');
    }
    function transmitir() {
        if (modo !== 'abertura' && ab.timer) pararAbertura(true);
        if (saida && !saida.closed) {
            try { pintar(saida.document.getElementById('tl-raiz')); saida.document.title = 'Telão · ' + (fila[atual] ? fila[atual].titulo : 'CEP Pirapozinho'); } catch (e) { saida = null; }
        } else saida = null;
        if (cheia) pintar(cheia.querySelector('.tl-cheia-raiz'));
        pintar(document.getElementById('tl-preview'));
        var st = document.getElementById('tl-status');
        if (st) {
            var online = !!(saida && !saida.closed);
            st.className = 'tl-status' + (online ? ' is-on' : '');
            st.innerHTML = '<span></span>' + (online ? 'Telão aberto' : 'Telão fechado');
        }
        document.querySelectorAll('[data-tl-modo]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tl-modo') === modo); });
        document.querySelectorAll('[data-tl-ab-btn]').forEach(function (b) { b.classList.toggle('is-on', modo === 'abertura'); });
        var rc = document.getElementById('tl-remoto-chip');
        if (rc) rc.classList.toggle('hidden', !(REMOTO.ativo && REMOTO.assumido));
        publicar();
    }

    /* ---------- Navegação dos slides ---------- */
    function irPara(i, s) { atual = i; slide = s || 0; modo = 'normal'; desenhar(); transmitir(); }
    function proximo() {
        var it = fila[atual];
        if (modo !== 'normal') { modo = 'normal'; return atualizarRapido(); }
        if (it && slide < it.slides.length - 1) { slide++; return atualizarRapido(); }
        if (it && it.tipo === 'biblia' && it.livro && capituloVizinho(1)) return;
        if (atual < fila.length - 1) return irPara(atual + 1, 0);
    }
    function anterior() {
        if (modo !== 'normal') { modo = 'normal'; return atualizarRapido(); }
        if (slide > 0) { slide--; return atualizarRapido(); }
        if (bibliaAoVivo() && capituloVizinho(-1)) return;
        if (atual > 0) { var ant = fila[atual - 1]; return irPara(atual - 1, Math.max(0, ant.slides.length - 1)); }
    }
    function alternarModo(m) { modo = modo === m ? 'normal' : m; transmitir(); }
    function atualizarRapido() {
        transmitir();
        if (aba === 'biblia') {
            var vv = versoAoVivo();
            document.querySelectorAll('#tl-conteudo .tl-verso').forEach(function (b) { b.classList.toggle('is-live', Number(b.getAttribute('data-tl-verso')) === vv); });
            rolarParaVerso();
        }
        document.querySelectorAll('#tl-slides .tl-thumb').forEach(function (b, i) { b.classList.toggle('is-live', i === slide); if (i === slide && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }); });
    }
    function tecla(e) {
        var alvo = e.target || {};
        if (alvo.id === 'tl-ref' && e.key === 'Enter') { e.preventDefault(); return irParaReferencia(); }
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName || '') || alvo.isContentEditable) return;
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); proximo(); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); anterior(); }
        else if (k === 'b' || k === 'B' || k === '.') alternarModo('preto');
        else if (k === 'l' || k === 'L') alternarModo('logo');
        else if (k === 'c' || k === 'C') alternarModo('limpo');
        else if (k === 'Escape' && cheia) sairTelaCheia();
    }

    /* ---------- Saída para o projetor (outra janela) ---------- */
    function abrirSaida() {
        if (saida && !saida.closed) { saida.focus(); return; }
        var w = window.open('', 'cep-telao', 'popup=yes,width=1280,height=720');
        if (!w) { aviso('O navegador bloqueou a janela do telão. Permita pop-ups ou use "Tela cheia aqui".', 'error'); return; }
        var d = w.document;
        d.open();
        d.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Telão</title>' +
            '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;cursor:none}#tl-raiz{position:fixed;inset:0}' + CSS_PALCO +
            '.tl-dica{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.6);color:#ddd;font:600 13px Inter,system-ui,sans-serif;transition:opacity .6s;z-index:9}</style></head>' +
            '<body><div id="tl-raiz"></div><div class="tl-dica" id="tl-dica">Arraste esta janela para o projetor e dê dois cliques para tela cheia</div></body></html>');
        d.close();
        carregarFontes(d);
        d.addEventListener('keydown', tecla);
        d.addEventListener('dblclick', function () {
            var el = d.documentElement;
            if (d.fullscreenElement) d.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
        });
        setTimeout(function () { try { var dica = d.getElementById('tl-dica'); if (dica) dica.style.opacity = '0'; } catch (e) {} }, 6000);
        saida = w;
        ativarRemoto();
        w.addEventListener('beforeunload', function () { setTimeout(transmitir, 50); });
        transmitir();
    }
    function fecharSaida() { if (saida && !saida.closed) saida.close(); saida = null; transmitir(); }

    /* ---------- Tela cheia neste aparelho ---------- */
    function telaCheia() {
        if (cheia) return;
        ativarRemoto();
        cheia = document.createElement('div');
        cheia.id = 'tl-cheia';
        cheia.innerHTML = '<div class="tl-cheia-raiz"></div><button type="button" class="tl-cheia-sair" aria-label="Sair da tela cheia">' + ic('x') + '</button><div class="tl-cheia-dica">Toque à direita para avançar, à esquerda para voltar</div>';
        document.body.appendChild(cheia);
        cheia.addEventListener('click', function (e) {
            if (e.target.closest('.tl-cheia-sair')) return sairTelaCheia();
            if (e.clientX > window.innerWidth / 2) proximo(); else anterior();
        });
        if (cheia.requestFullscreen) cheia.requestFullscreen().catch(function () {});
        document.addEventListener('fullscreenchange', aoSairFull);
        icones();
        transmitir();
        setTimeout(function () { var d = cheia && cheia.querySelector('.tl-cheia-dica'); if (d) d.style.opacity = '0'; }, 3500);
    }
    function aoSairFull() { if (!document.fullscreenElement && cheia) sairTelaCheia(); }
    function sairTelaCheia() {
        document.removeEventListener('fullscreenchange', aoSairFull);
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
        if (cheia) cheia.remove();
        cheia = null;
    }

    /* ---------- Mesa do operador ---------- */
    function montar() {
        if (montado) return;
        montado = true;
        var st = document.createElement('style');
        st.textContent = CSS_PALCO;
        document.head.appendChild(st);
        document.body.insertAdjacentHTML('beforeend',
            '<div id="telao-op" class="hidden" role="dialog" aria-modal="true" aria-label="Telão">' +
            '<div class="tl-top">' +
                '<div class="tl-top-l"><span class="i3d tone-blue tl-top-ic">' + ic('presentation') + '</span><div><b>Telão</b><small>Letras e versículos na tela da igreja</small></div></div>' +
                '<div class="tl-top-r"><span id="tl-remoto-chip" class="tl-remoto-chip hidden" title="Celulares e tela do palco conectados a este computador">' + ic('smartphone') + 'Celular e palco ligados</span><span id="tl-status" class="tl-status"><span></span>Telão fechado</span>' +
                '<button type="button" class="md-btn md-btn-primary" data-tl="saida">' + ic('cast') + '<span>Abrir telão</span></button>' +
                '<button type="button" class="md-btn md-btn-ghost" data-tl="cheia">' + ic('maximize') + '<span>Tela cheia aqui</span></button>' +
                '<button type="button" class="md-icon-btn" data-tl="fechar" aria-label="Fechar o telão" title="Fechar">' + ic('x') + '</button></div>' +
            '</div>' +
            '<div class="tl-corpo">' +
                '<aside class="tl-painel"><div class="tl-abas" role="tablist"></div><div class="tl-conteudo" id="tl-conteudo"></div></aside>' +
                '<main class="tl-mesa">' +
                    '<div class="tl-ao-vivo"><div class="tl-preview-wrap"><span class="tl-live-tag">No telão</span><div id="tl-preview" class="tl-preview"></div></div>' +
                        '<div class="tl-controles">' +
                            '<button type="button" class="tl-ctl" data-tl="ant" aria-label="Anterior">' + ic('chevron-left') + '</button>' +
                            '<button type="button" class="tl-ctl tl-ctl-main" data-tl="prox" aria-label="Próximo">' + ic('chevron-right') + '<span>Próximo</span></button>' +
                            '<button type="button" class="tl-ctl" data-tl-modo="preto" title="Tela preta (B)">' + ic('square') + '<span>Preto</span></button>' +
                            '<button type="button" class="tl-ctl" data-tl-modo="logo" title="Logo da igreja (L)">' + ic('church') + '<span>Logo</span></button>' +
                            '<button type="button" class="tl-ctl" data-tl-modo="limpo" title="Só o fundo (C)">' + ic('eraser') + '<span>Limpar</span></button>' +
                            '<button type="button" class="tl-ctl" data-tl="abertura" data-tl-ab-btn title="Contagem para o início do culto">' + ic('timer') + '<span>Abertura</span></button>' +
                        '</div><p class="tl-atalhos">' + ic('keyboard', 'w-3.5 h-3.5') + 'Setas ou espaço avançam · B preto · L logo · C limpar</p></div>' +
                    '<section class="tl-slides-box"><div class="tl-slides-head" id="tl-slides-head"></div><div id="tl-slides" class="tl-slides"></div></section>' +
                '</main>' +
            '</div></div>');
        var op = document.getElementById('telao-op');
        op.addEventListener('click', clique);
        op.addEventListener('input', digitar);
        op.addEventListener('change', mudar);
        document.addEventListener('keydown', function (e) { if (aberto()) tecla(e); });
    }
    function aberto() { var op = document.getElementById('telao-op'); return op && !op.classList.contains('hidden'); }

    var ABAS = [['culto', 'Culto', 'list-music'], ['biblioteca', 'Músicas', 'library'], ['biblia', 'Bíblia', 'book-open'], ['texto', 'Texto', 'type'], ['abertura', 'Abertura', 'timer'], ['estilo', 'Estilo', 'palette']];
    function desenhar() {
        if (!montado) return;
        var abas = document.querySelector('#telao-op .tl-abas');
        abas.innerHTML = ABAS.map(function (a) { return '<button type="button" role="tab" aria-selected="' + (aba === a[0]) + '" class="' + (aba === a[0] ? 'is-active' : '') + '" data-tl-aba="' + a[0] + '">' + ic(a[2]) + '<span>' + a[1] + '</span></button>'; }).join('');
        var c = document.getElementById('tl-conteudo');
        var rolagem = c.getAttribute('data-aba') === aba ? c.scrollTop : 0;
        c.setAttribute('data-aba', aba);
        if (aba === 'culto') c.innerHTML = abaCulto();
        else if (aba === 'biblioteca') c.innerHTML = abaBiblioteca();
        else if (aba === 'texto') c.innerHTML = abaTexto();
        else if (aba === 'abertura') c.innerHTML = abaAbertura();
        else if (aba === 'biblia') c.innerHTML = abaBiblia();
        else c.innerHTML = abaEstilo();
        c.scrollTop = rolagem;
        desenharSlides();
        icones();
        transmitir();
    }
    function desenharSlides() {
        var it = fila[atual];
        var head = document.getElementById('tl-slides-head'), box = document.getElementById('tl-slides');
        if (!it) {
            head.innerHTML = '<b>Nada no telão ainda</b>';
            box.innerHTML = '<div class="tl-vazio">' + ic('presentation', 'w-8 h-8') + '<p>Carregue as músicas da escala na aba <b>Culto</b>, escolha uma música em <b>Músicas</b> ou cole um texto em <b>Texto</b>.</p></div>';
            return;
        }
        var prox = fila[atual + 1];
        head.innerHTML = '<div class="min-w-0"><small>' + (it.tipo === 'musica' ? 'Música' : it.tipo === 'biblia' ? 'Bíblia' : 'Texto') + ' ' + (atual + 1) + ' de ' + fila.length + '</small><b>' + esc(it.titulo) + '</b></div>' +
            (prox ? '<button type="button" class="tl-prox" data-tl-item="' + (atual + 1) + '">A seguir: <b>' + esc(prox.titulo) + '</b>' + ic('skip-forward', 'w-3.5 h-3.5') + '</button>' : '');
        box.innerHTML = it.slides.length ? it.slides.map(function (s, i) {
            return '<button type="button" class="tl-thumb' + (i === slide ? ' is-live' : '') + '" data-tl-slide="' + i + '"><span class="tl-thumb-n">' + (i + 1) + (s.rotulo ? ' · ' + esc(s.rotulo) : '') + '</span>' + s.linhas.map(esc).join('<br>') + '</button>';
        }).join('') : '<div class="tl-vazio">' + ic('file-text', 'w-8 h-8') + '<p>' + (it.pdfSemTexto ? 'Esta música está só em PDF (imagem), então não há texto para projetar. Cole a letra na aba <b>Texto</b>.' : 'Não há letra para projetar neste item.') + '</p></div>';
    }

    function abaCulto() {
        var agora = new Date(); agora.setHours(0, 0, 0, 0);
        var lista = escalas().filter(function (r) { return r.department !== 'midia' && (r.songIds || []).length && r.dateTime; })
            .sort(function (a, b) { return new Date(a.dateTime) - new Date(b.dateTime); });
        var futuras = lista.filter(function (r) { return new Date(r.dateTime) >= agora; });
        var passadas = lista.filter(function (r) { return new Date(r.dateTime) < agora; }).reverse().slice(0, 6);
        var opc = function (r) { var d = new Date(r.dateTime); return '<option value="' + esc(r.id) + '">' + esc(d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })) + ' · ' + esc(r.service || 'Culto') + ' (' + (r.songIds || []).length + ')</option>'; };
        var h = '<div class="tl-bloco"><label class="tl-label">Carregar músicas de uma escala</label>';
        if (lista.length) {
            h += '<div class="tl-linha"><select id="tl-escala">' + (futuras.length ? '<optgroup label="Próximas">' + futuras.map(opc).join('') + '</optgroup>' : '') + (passadas.length ? '<optgroup label="Anteriores">' + passadas.map(opc).join('') + '</optgroup>' : '') + '</select>' +
                '<button type="button" class="md-btn md-btn-primary" data-tl="carregar">' + ic('list-plus') + 'Carregar</button></div>';
        } else h += '<p class="tl-dica-txt">Nenhuma escala do Louvor com músicas ainda.</p>';
        h += '</div><div class="tl-bloco"><div class="tl-fila-head"><label class="tl-label">Ordem do culto</label>' + (fila.length ? '<button type="button" class="tl-link" data-tl="limpar-fila">Limpar</button>' : '') + '</div>';
        h += fila.length ? '<ol class="tl-fila">' + fila.map(function (it, i) {
            return '<li class="' + (i === atual ? 'is-live' : '') + '"><button type="button" class="tl-fila-item" data-tl-item="' + i + '"><span class="tl-fila-n">' + (i + 1) + '</span><span class="tl-fila-t">' + esc(it.titulo) + '<small>' + (it.tipo === 'texto' ? 'Texto · ' : '') + it.slides.length + (it.slides.length === 1 ? ' slide' : ' slides') + '</small></span></button>' +
                '<span class="tl-fila-acoes"><button type="button" data-tl-mover="' + i + ':-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>' + ic('arrow-up') + '</button><button type="button" data-tl-mover="' + i + ':1" aria-label="Descer"' + (i === fila.length - 1 ? ' disabled' : '') + '>' + ic('arrow-down') + '</button><button type="button" data-tl-tirar="' + i + '" aria-label="Tirar da ordem">' + ic('x') + '</button></span></li>';
        }).join('') + '</ol>' : '<p class="tl-dica-txt">A ordem fica vazia até você carregar uma escala ou adicionar músicas e textos.</p>';
        return h + '</div>';
    }
    function abaBiblioteca() {
        var termo = busca.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var lista = musicas().filter(function (s) { return !termo || String(s.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(termo) !== -1; });
        var h = '<div class="tl-bloco"><div class="tl-busca">' + ic('search', 'w-4 h-4') + '<input id="tl-busca" type="search" placeholder="Buscar música" value="' + esc(busca) + '" autocomplete="off"></div>';
        if (podeCadastrar()) {
            h += '<div class="tl-linha tl-linha-2"><button type="button" class="md-btn md-btn-ghost" data-tl="nova-letra">' + ic('plus') + 'Nova letra</button>' +
                '<label class="md-btn md-btn-ghost tl-arquivo">' + ic('file-up') + 'Importar .txt<input id="tl-txt" type="file" accept=".txt,text/plain" multiple hidden></label></div>';
        }
        h += '</div><ul class="tl-biblio">' + (lista.length ? lista.slice(0, 200).map(function (s) {
            var tipo = s.type === 'pdf' ? (s.content ? 'PDF com texto' : 'PDF sem texto') : s.type === 'letra' ? 'Letra' : 'Cifra';
            return '<li><button type="button" class="tl-biblio-t" data-tl-musica="' + esc(s.id) + '" data-tl-ja="1">' + esc(s.title) + '<small>' + tipo + '</small></button>' +
                '<button type="button" class="tl-mini" data-tl-musica="' + esc(s.id) + '" title="Pôr no fim da ordem" aria-label="Pôr no fim da ordem">' + ic('list-plus') + '</button></li>';
        }).join('') : '<li class="tl-dica-txt">Nenhuma música encontrada.</li>') + '</ul>';
        return h;
    }
    function abaTexto() {
        return '<div class="tl-bloco"><label class="tl-label" for="tl-texto-titulo">Título (aparece só para você)</label><input id="tl-texto-titulo" type="text" placeholder="Ex.: Salmo 23 · Aviso da semana">' +
            '<label class="tl-label" for="tl-texto">Texto</label><textarea id="tl-texto" rows="9" placeholder="Cole aqui o versículo, aviso ou letra.&#10;&#10;Deixe uma linha em branco para começar um novo slide."></textarea>' +
            '<p class="tl-dica-txt">' + ic('book-open', 'w-3.5 h-3.5') + 'Para versículos, copie da sua Bíblia (app ou site) e cole aqui com a referência.</p>' +
            '<div class="tl-linha tl-linha-2"><button type="button" class="md-btn md-btn-primary" data-tl="texto-agora">' + ic('presentation') + 'Projetar agora</button><button type="button" class="md-btn md-btn-ghost" data-tl="texto-fila">' + ic('list-plus') + 'Pôr na ordem</button></div></div>';
    }
    function blocoFundos() {
        var h = '<div class="tl-bloco"><label class="tl-label">Fundos em movimento</label><div class="tl-fundos">' + Object.keys(ANIMADOS).map(function (k) {
            return '<button type="button" class="tl-fundo' + (tema.fundo === k ? ' is-on' : '') + '" data-tl-tema="fundo:' + k + '" title="' + esc(ANIMADOS[k][0]) + '"><span class="tl-fundo-anim" style="background:' + ANIMADOS[k][1] + '">' + animInterno(k) + '</span><small>' + esc(ANIMADOS[k][0]) + '</small></button>';
        }).join('') + '</div></div>';
        h += '<div class="tl-bloco"><label class="tl-label">Fundos parados</label><div class="tl-fundos">' + Object.keys(FUNDOS).map(function (k) {
            return '<button type="button" class="tl-fundo' + (tema.fundo === k ? ' is-on' : '') + '" data-tl-tema="fundo:' + k + '" title="' + esc(FUNDOS[k][0]) + '"><span style="background:' + FUNDOS[k][1] + '"></span><small>' + esc(FUNDOS[k][0]) + '</small></button>';
        }).join('') + '</div></div>';
        return h;
    }
    function blocoGaleria() {
        var lista = galeria.filter(function (m) { return m.tipo !== 'audio'; });
        var h = '<div class="tl-bloco"><label class="tl-label">Meus vídeos e imagens</label><div class="tl-fundos">';
        h += '<label class="tl-fundo tl-enviar" title="Enviar vídeo ou imagem deste computador"><span class="tl-fundo-up">' + ic('upload') + '</span><small>Enviar vídeo ou imagem</small><input id="tl-fundo-arquivo" type="file" accept="video/*,image/*" multiple hidden></label>';
        h += lista.map(function (m) {
            var on = tema.fundo === 'midia' && midiaFundo.id === m.id;
            var miniatura = m.tipo === 'video'
                ? '<video src="' + m.url + '#t=1" muted preload="metadata" playsinline></video><b class="tl-play">' + ic('play') + '</b>'
                : '<img src="' + m.url + '" alt="">';
            return '<div class="tl-fundo tl-midia-item' + (on ? ' is-on' : '') + '"><button type="button" class="tl-midia-usar" data-tl-usar="' + esc(m.id) + '" title="' + esc(m.nome) + '"><span class="tl-midia-thumb">' + miniatura + '</span><small>' + esc(semExtensao(m.nome)) + '</small></button>' +
                '<button type="button" class="tl-midia-apagar" data-tl-apagar="' + esc(m.id) + '" aria-label="Apagar ' + esc(m.nome) + '" title="Apagar">' + ic('x') + '</button></div>';
        }).join('');
        h += '</div><p class="tl-dica-txt">' + ic('hard-drive-download', 'w-3.5 h-3.5') + 'Fica guardado neste computador e aparece aqui nos próximos cultos. O vídeo roda sem som, repetindo.</p></div>';
        return h;
    }
    function abaAbertura() {
        var rodando = modo === 'abertura';
        var lista = galeria.filter(function (m) { return m.tipo === 'audio'; });
        var h = '<div class="tl-bloco">';
        if (rodando) {
            h += '<div class="tl-ab-painel"><b id="tl-ab-restante">' + (ab.fim ? 'Contagem terminada' : 'Faltam ' + relogio(abRestante())) + '</b>' +
                '<div class="tl-linha tl-linha-2"><button type="button" class="md-btn md-btn-ghost" data-tl="ab-mais">' + ic('plus') + '1 minuto</button><button type="button" class="md-btn md-btn-danger" data-tl="ab-parar">' + ic('square') + 'Parar</button></div>' +
                '<p class="tl-dica-txt">' + ic('info', 'w-3.5 h-3.5') + 'Quando o louvor começar, aperte → (ou Próximo) para ir à primeira música.</p></div>';
        } else {
            h += '<button type="button" class="md-btn md-btn-primary tl-ab-iniciar" data-tl="ab-iniciar">' + ic('timer') + 'Iniciar contagem</button>';
        }
        h += '</div><div class="tl-bloco"><label class="tl-label">Contar</label><div class="tl-seg"><button type="button" class="' + (tema.abModo !== 'horario' ? 'is-on' : '') + '" data-tl-tema="abModo:minutos">Por minutos</button><button type="button" class="' + (tema.abModo === 'horario' ? 'is-on' : '') + '" data-tl-tema="abModo:horario">Até um horário</button></div>';
        if (tema.abModo === 'horario') h += '<input type="time" data-tl-ab="abHora" value="' + esc(tema.abHora) + '" aria-label="Horário do culto">';
        else h += '<div class="tl-seg">' + [2, 3, 5, 10, 15].map(function (n) { return '<button type="button" class="' + (Number(tema.abMin) === n ? 'is-on' : '') + '" data-tl-tema="abMin:' + n + '">' + n + ' min</button>'; }).join('') + '</div>';
        h += '</div><div class="tl-bloco"><label class="tl-label" for="tl-ab-t">Texto de cima</label><input id="tl-ab-t" type="text" data-tl-ab="abTitulo" value="' + esc(tema.abTitulo) + '" maxlength="60">' +
            '<label class="tl-label" for="tl-ab-s">Frase embaixo do relógio</label><input id="tl-ab-s" type="text" data-tl-ab="abSub" value="' + esc(tema.abSub) + '" maxlength="90" placeholder="Opcional">' +
            '<label class="tl-label" for="tl-ab-f">Quando zerar, mostrar</label><input id="tl-ab-f" type="text" data-tl-ab="abFim" value="' + esc(tema.abFim) + '" maxlength="60"></div>';
        h += '<div class="tl-bloco"><label class="tl-label">Música de fundo (opcional)</label><div class="tl-musicas">' +
            '<button type="button" class="tl-musica' + (!tema.abMusica ? ' is-on' : '') + '" data-tl-tema="abMusica:">' + ic('x') + '<span>Sem música</span></button>' +
            lista.map(function (m) { return '<div class="tl-musica-linha"><button type="button" class="tl-musica' + (tema.abMusica === m.id ? ' is-on' : '') + '" data-tl-tema="abMusica:' + esc(m.id) + '">' + ic('music') + '<span>' + esc(semExtensao(m.nome)) + '</span></button><button type="button" class="tl-midia-apagar tl-musica-apagar" data-tl-apagar="' + esc(m.id) + '" aria-label="Apagar ' + esc(m.nome) + '">' + ic('x') + '</button></div>'; }).join('') +
            '<label class="md-btn md-btn-ghost tl-arquivo">' + ic('upload') + 'Enviar música (MP3)<input id="tl-ab-audio" type="file" accept="audio/*" multiple hidden></label></div>' +
            '<label class="tl-label" for="tl-ab-vol">Volume da música</label><input id="tl-ab-vol" type="range" min="0" max="1" step="0.05" value="' + tema.abVolume + '"></div>';
        h += '<p class="tl-dica-txt">' + ic('palette', 'w-3.5 h-3.5') + 'O fundo e a fonte são os mesmos escolhidos na aba Estilo.</p>';
        return h;
    }
    function abaEstilo() {
        var h = blocoGaleria() + blocoFundos();
        h += '<div class="tl-bloco"><label class="tl-label">Fonte</label><div class="tl-fontes">' + Object.keys(FONTES).map(function (k) {
            var f = FONTES[k];
            return '<button type="button" class="tl-opc' + (tema.fonte === k ? ' is-on' : '') + '" data-tl-tema="fonte:' + k + '" style="font-family:' + f[1].replace(/"/g, '&quot;') + ';font-weight:' + f[2] + '">' + esc(f[0]) + '</button>';
        }).join('') + '</div></div>';
        h += '<div class="tl-bloco"><label class="tl-label" for="tl-tamanho">Tamanho da letra</label><input id="tl-tamanho" type="range" min="0.6" max="1.6" step="0.05" value="' + tema.tamanho + '"></div>';
        h += '<div class="tl-bloco"><label class="tl-label">Linhas por slide</label><div class="tl-seg">' + [2, 3, 4, 6].map(function (n) { return '<button type="button" class="' + (Number(tema.linhas) === n ? 'is-on' : '') + '" data-tl-tema="linhas:' + n + '">' + n + '</button>'; }).join('') + '</div></div>';
        h += '<div class="tl-bloco"><label class="tl-label">Posição</label><div class="tl-seg"><button type="button" class="' + (tema.posicao !== 'baixo' ? 'is-on' : '') + '" data-tl-tema="posicao:centro">Centro</button><button type="button" class="' + (tema.posicao === 'baixo' ? 'is-on' : '') + '" data-tl-tema="posicao:baixo">Embaixo (live)</button></div></div>';
        h += '<div class="tl-bloco tl-toggles">' + [['maiusculas', 'Tudo em maiúsculas'], ['sombra', 'Sombra no texto'], ['contorno', 'Contorno preto'], ['titulo', 'Nome da música no rodapé']].map(function (t) {
            return '<label class="tl-toggle"><input type="checkbox" data-tl-bool="' + t[0] + '"' + (tema[t[0]] ? ' checked' : '') + '><span></span>' + t[1] + '</label>';
        }).join('') + '</div>';
        h += '<p class="tl-dica-txt">' + ic('sun', 'w-3.5 h-3.5') + 'Use "Embaixo" com fundo Chroma verde para a transmissão ao vivo.</p>';
        return h;
    }

    /* ---------- Eventos da mesa ---------- */
    function clique(e) {
        var b = e.target.closest('button,[data-tl-aba]');
        if (!b) return;
        var acao = b.getAttribute('data-tl');
        if (b.hasAttribute('data-tl-aba')) { aba = b.getAttribute('data-tl-aba'); return desenhar(); }
        if (b.hasAttribute('data-tl-modo')) return alternarModo(b.getAttribute('data-tl-modo'));
        if (b.hasAttribute('data-tl-slide')) { slide = Number(b.getAttribute('data-tl-slide')); modo = 'normal'; return atualizarRapido(); }
        if (b.hasAttribute('data-tl-item')) return irPara(Number(b.getAttribute('data-tl-item')), 0);
        if (b.hasAttribute('data-tl-tirar')) {
            var i = Number(b.getAttribute('data-tl-tirar'));
            fila.splice(i, 1);
            if (atual >= fila.length) atual = fila.length - 1; else if (i < atual) atual--; else if (i === atual) slide = 0;
            return desenhar();
        }
        if (b.hasAttribute('data-tl-mover')) {
            var p = b.getAttribute('data-tl-mover').split(':'), de = Number(p[0]), para = de + Number(p[1]);
            if (para < 0 || para >= fila.length) return;
            var viva = fila[atual];
            var x = fila.splice(de, 1)[0]; fila.splice(para, 0, x);
            atual = fila.indexOf(viva);
            return desenhar();
        }
        if (b.hasAttribute('data-tl-musica')) {
            var s = musicas().filter(function (m) { return String(m.id) === b.getAttribute('data-tl-musica'); })[0];
            if (!s) return;
            if (b.hasAttribute('data-tl-ja')) return adicionar(itemDeMusica(s), true);
            fila.push(itemDeMusica(s)); if (atual < 0) atual = 0;
            desenhar();
            return aviso('"' + s.title + '" entrou no fim da ordem.');
        }
        if (b.hasAttribute('data-tl-verso')) { bib.sel = []; return projetarVerso(Number(b.getAttribute('data-tl-verso'))); }
        if (b.hasAttribute('data-tl-usar')) return usarMidia(b.getAttribute('data-tl-usar'));
        if (b.hasAttribute('data-tl-apagar')) return apagarMidia(b.getAttribute('data-tl-apagar'));
        if (b.hasAttribute('data-tl-tema')) {
            var kv = b.getAttribute('data-tl-tema').split(':');
            var chaveT = kv.shift(), valorT = kv.join(':');
            tema[chaveT] = (chaveT === 'linhas' || chaveT === 'abMin') ? Number(valorT) : valorT;
            kv = [chaveT];
            if (kv[0] === 'linhas') refazerSlides();
            salvarTema();
            return desenhar();
        }
        if (acao === 'fechar') return fechar();
        if (acao === 'saida') return abrirSaida();
        if (acao === 'cheia') return telaCheia();
        if (acao === 'prox') return proximo();
        if (acao === 'ant') return anterior();
        if (acao === 'carregar') { var sel = document.getElementById('tl-escala'); return sel && carregarEscala(sel.value); }
        if (acao === 'limpar-fila') { fila = []; atual = -1; slide = 0; return desenhar(); }
        if (acao === 'texto-agora' || acao === 'texto-fila') {
            var t = document.getElementById('tl-texto').value;
            if (!t.trim()) return aviso('Cole ou digite um texto primeiro.', 'error');
            var it = itemDeTexto(document.getElementById('tl-texto-titulo').value.trim() || t.trim().split('\n')[0].slice(0, 40), t);
            if (acao === 'texto-agora') { adicionar(it, true); aba = 'culto'; return desenhar(); }
            fila.push(it); if (atual < 0) atual = 0;
            document.getElementById('tl-texto').value = '';
            desenhar();
            return aviso('Texto colocado na ordem do culto.');
        }
        if (acao === 'nova-letra') return novaLetra();
        if (acao === 'abertura') { if (modo === 'abertura') return pararAbertura(); aba = 'abertura'; return iniciarAbertura(); }
        if (acao === 'ab-iniciar') return iniciarAbertura();
        if (acao === 'bib-ir') return irParaReferencia();
        if (acao === 'bib-limpar') { bib.sel = []; return desenhar(); }
        if (acao === 'bib-tentar') return abrirCapitulo(bib.livro, bib.cap);
        if (acao === 'bib-fila') {
            if (!bib.versos.length) return;
            var cp = itemCapitulo(bib.livro, bib.cap, bib.versos);
            fila.push(cp); if (atual < 0) atual = 0;
            desenhar();
            return aviso(cp.titulo + ' entrou na ordem do culto.');
        }
        if (acao === 'bib-projetar') {
            var itb = itemDaBiblia();
            if (!itb.slides.length) return;
            bib.sel = [];
            if (acao === 'bib-projetar') return adicionar(itb, true);
            fila.push(itb); if (atual < 0) atual = 0;
            desenhar();
            return aviso(itb.titulo + ' entrou na ordem do culto.');
        }
        if (acao === 'ab-parar') return pararAbertura();
        if (acao === 'ab-mais') return maisUmMinuto();
    }
    function irParaReferencia() {
        var campo = document.getElementById('tl-ref');
        var r = lerReferencia(campo && campo.value);
        if (!r) return aviso('Não entendi. Tente "jo 3 16", "sl 23" ou "1co 13 4".', 'error');
        if (campo) { campo.value = ''; campo.blur(); }
        abrirCapitulo(r.livro, r.cap, r.de || 1, r.ate, true);
    }
    var tempoBusca = null;
    function digitar(e) {
        if (e.target.id === 'tl-busca') {
            busca = e.target.value;
            clearTimeout(tempoBusca);
            tempoBusca = setTimeout(function () {
                var pos = e.target.selectionStart;
                desenhar();
                var campo = document.getElementById('tl-busca');
                if (campo) { campo.focus(); try { campo.setSelectionRange(pos, pos); } catch (x) {} }
            }, 160);
        } else if (e.target.hasAttribute('data-tl-ab')) {
            tema[e.target.getAttribute('data-tl-ab')] = e.target.value;
            salvarTema();
            if (modo === 'abertura') transmitir();
        } else if (e.target.id === 'tl-ab-vol') {
            tema.abVolume = Number(e.target.value);
            salvarTema();
            if (ab.audio) ab.audio.volume = tema.abVolume;
        } else if (e.target.id === 'tl-tamanho') {
            tema.tamanho = Number(e.target.value) || 1;
            salvarTema(); transmitir();
        }
    }
    function mudar(e) {
        var el = e.target;
        if (el.hasAttribute('data-tl-bool')) { tema[el.getAttribute('data-tl-bool')] = el.checked; salvarTema(); return transmitir(); }
        if (el.id === 'tl-bib-livro') return abrirCapitulo(el.value, 1);
        if (el.id === 'tl-bib-cap') return abrirCapitulo(bib.livro, Number(el.value));
        if (el.id === 'tl-fundo-arquivo' && el.files && el.files.length) return enviarArquivos(Array.prototype.slice.call(el.files), 'visual');
        if (el.id === 'tl-ab-audio' && el.files && el.files.length) return enviarArquivos(Array.prototype.slice.call(el.files), 'audio');
        if (el.id === 'tl-txt' && el.files && el.files.length) return importarTxt(Array.prototype.slice.call(el.files));
    }

    /* ---------- Cadastro de letras (biblioteca do portal) ---------- */
    async function salvarLetra(titulo, letra) {
        var dados = { title: titulo, type: 'letra', content: letra, sourceContent: letra, originalKey: 'C', currentKey: 'C', bpm: 80, pdfUrl: '', createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: currentUser.uid };
        var ref = await db.collection('songs').add(dados);
        return Object.assign({ id: ref.id }, dados);
    }
    async function novaLetra() {
        if (!podeCadastrar()) return;
        var v = await openPortalForm({
            title: 'Nova letra', subtitle: 'Fica salva nas Músicas do portal e pronta para o telão.', submitLabel: 'Salvar letra',
            fields: [{ name: 'title', label: 'Nome da música', required: true, placeholder: 'Nome da música' },
                { name: 'letra', label: 'Letra', type: 'textarea', rows: 10, required: true, placeholder: 'Cole a letra. Uma linha em branco separa os slides.', hint: 'Pode colar com [Refrão], [Verso]... Acordes são removidos automaticamente.' }]
        });
        if (!v || !v.title || !v.title.trim() || !v.letra || !v.letra.trim()) return;
        try {
            var s = await salvarLetra(v.title.trim(), v.letra);
            adicionar(itemDeMusica(s), true);
            aviso('Letra salva nas Músicas.');
        } catch (err) {
            console.error(err);
            aviso('Não foi possível salvar a letra agora. Ela foi colocada só nesta sessão.', 'error');
            adicionar(itemDeTexto(v.title.trim(), v.letra), true);
        }
    }
    async function importarTxt(arquivos) {
        var ok = 0;
        for (var i = 0; i < arquivos.length; i++) {
            var f = arquivos[i];
            if (f.size > 300000) { aviso('"' + f.name + '" é grande demais para uma letra.', 'error'); continue; }
            var texto = await f.text();
            var titulo = f.name.replace(/\.txt$/i, '').replace(/[_-]+/g, ' ').trim();
            try { var s = await salvarLetra(titulo, texto); fila.push(itemDeMusica(s)); ok++; }
            catch (err) { console.error(err); fila.push(itemDeTexto(titulo, texto)); }
        }
        if (atual < 0 && fila.length) atual = 0;
        aba = 'culto';
        desenhar();
        aviso(ok ? ok + (ok === 1 ? ' letra importada' : ' letras importadas') + ' e colocadas na ordem.' : 'Letras colocadas na ordem desta sessão.');
    }

    /* ---------- Abrir e fechar ---------- */
    function abrirTelao(op) {
        op = op || {};
        montar();
        carregarFontes(document);
        if (op.escala) carregarEscala(op.escala);
        else if (op.musica) {
            var s = musicas().filter(function (m) { return String(m.id) === String(op.musica); })[0];
            if (s) { aba = 'culto'; adicionar(itemDeMusica(s), true); }
        } else if (!fila.length) {
            var r = escalaPadrao();
            if (r) carregarEscala(r.id);
        }
        carregarGaleria();
        var el = document.getElementById('telao-op');
        el.classList.remove('hidden');
        document.body.classList.add('tl-aberto');
        desenhar();
    }
    function fechar() {
        var el = document.getElementById('telao-op');
        if (el) el.classList.add('hidden');
        document.body.classList.remove('tl-aberto');
        if (saida && !saida.closed) aviso('A janela do telão continua aberta. Reabra o Telão para controlar.');
    }
    window.abrirTelao = abrirTelao;
    window.cepTelaoBiblia = { lerReferencia: lerReferencia, livros: LIVROS };
    window.fecharTelao = fechar;
    window.cepTelaoFecharSaida = fecharSaida;
    window.cepTelaoSlides = montarSlides; // usado nos testes
})();
