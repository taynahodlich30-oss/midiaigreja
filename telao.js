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
    var PADRAO = { fonte: 'montserrat', fundo: 'grafite', tamanho: 1, maiusculas: false, sombra: true, contorno: false, posicao: 'centro', titulo: true, linhas: 4 };

    var tema = carregarTema();
    var midiaFundo = { tipo: '', url: '' };   // imagem ou vídeo escolhido neste aparelho
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
    function estiloTexto() {
        var f = FONTES[tema.fonte] || FONTES.montserrat;
        var s = 'font-family:' + f[1] + ';font-weight:' + f[2] + ';';
        s += 'font-size:calc(' + (tema.fonte === 'bebas' ? 9 : 7) + 'cqmin * ' + (Number(tema.tamanho) || 1) + ');';
        if (tema.maiusculas) s += 'text-transform:uppercase;';
        if (tema.fonte === 'bebas') s += 'letter-spacing:.02em;';
        var sombras = [];
        if (tema.sombra) sombras.push('0 .06em .18em rgba(0,0,0,.85)', '0 0 .6em rgba(0,0,0,.45)');
        if (tema.contorno) s += '-webkit-text-stroke:.035em #000;paint-order:stroke fill;';
        if (sombras.length) s += 'text-shadow:' + sombras.join(',') + ';';
        return s;
    }
    function htmlPalco() {
        var fundo = tema.fundo === 'midia' && midiaFundo.url ? '#000' : (FUNDOS[tema.fundo] || FUNDOS.grafite)[1];
        var h = '<div class="tl-palco" style="background:' + fundo + '">';
        if (tema.fundo === 'midia' && midiaFundo.url && modo !== 'preto') {
            h += midiaFundo.tipo === 'video'
                ? '<video class="tl-midia" src="' + midiaFundo.url + '" autoplay muted loop playsinline></video>'
                : '<div class="tl-midia" style="background-image:url(\'' + midiaFundo.url + '\')"></div>';
            h += '<div class="tl-veu"></div>';
        }
        if (modo === 'preto') return '<div class="tl-palco" style="background:#000"></div>';
        if (modo === 'logo') {
            return h + '<div class="tl-logo"><svg viewBox="0 0 24 24" fill="none" stroke="url(#tlg)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="tlg" x1="0" y1="2" x2="0" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#d4ae52"/><stop offset="1" stop-color="#a88227"/></linearGradient></defs><path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5.618a1 1 0 0 0-.553-.894l-4.553-2.277a2 2 0 0 0-1.788 0L6.553 4.724A1 1 0 0 0 6 5.618V22"/><path d="m18 7 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.618a1 1 0 0 1 .553-.894L6 7"/></svg><b>CEP Pirapozinho</b></div></div>';
        }
        var s = slideAtual();
        if (modo !== 'limpo' && s) {
            h += '<div class="tl-texto tl-' + (tema.posicao === 'baixo' ? 'baixo' : 'centro') + '" style="' + estiloTexto() + '">' + s.linhas.map(esc).join('<br>') + '</div>';
            if (tema.titulo && fila[atual] && fila[atual].tipo === 'musica') h += '<div class="tl-rodape">' + esc(fila[atual].titulo) + '</div>';
        }
        return h + '</div>';
    }
    var CSS_PALCO =
        '.tl-palco{position:absolute;inset:0;overflow:hidden;container-type:size;color:#fff;display:flex;align-items:center;justify-content:center}' +
        '.tl-midia{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background-size:cover;background-position:center}' +
        '.tl-veu{position:absolute;inset:0;background:rgba(0,0,0,.38)}' +
        '.tl-texto{position:relative;z-index:1;width:88%;text-align:center;line-height:1.28;overflow-wrap:break-word;animation:tlEntra .28s ease-out}' +
        '.tl-texto.tl-baixo{position:absolute;left:6%;right:6%;width:auto;bottom:9%}' +
        '.tl-rodape{position:absolute;z-index:1;left:0;right:0;bottom:3.2%;text-align:center;font:600 2.1cqmin Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}' +
        '.tl-logo{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:3cqmin;animation:tlEntra .4s ease-out}' +
        '.tl-logo svg{width:22cqmin;height:22cqmin;filter:drop-shadow(0 .6cqmin 1.4cqmin rgba(0,0,0,.6))}' +
        '.tl-logo b{font:800 5.4cqmin Montserrat,Inter,sans-serif;letter-spacing:.06em;background:linear-gradient(180deg,#fff3c4,#d4ae52 60%,#a88227);-webkit-background-clip:text;background-clip:text;color:transparent}' +
        '@keyframes tlEntra{from{opacity:0;transform:translateY(.6cqmin)}to{opacity:1;transform:none}}';

    function pintar(alvo) { if (alvo) alvo.innerHTML = htmlPalco(); }
    function transmitir() {
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
    }

    /* ---------- Navegação dos slides ---------- */
    function irPara(i, s) { atual = i; slide = s || 0; modo = 'normal'; desenhar(); transmitir(); }
    function proximo() {
        var it = fila[atual];
        if (modo !== 'normal') { modo = 'normal'; return atualizarRapido(); }
        if (it && slide < it.slides.length - 1) { slide++; return atualizarRapido(); }
        if (atual < fila.length - 1) return irPara(atual + 1, 0);
    }
    function anterior() {
        if (modo !== 'normal') { modo = 'normal'; return atualizarRapido(); }
        if (slide > 0) { slide--; return atualizarRapido(); }
        if (atual > 0) { var ant = fila[atual - 1]; return irPara(atual - 1, Math.max(0, ant.slides.length - 1)); }
    }
    function alternarModo(m) { modo = modo === m ? 'normal' : m; transmitir(); }
    function atualizarRapido() {
        transmitir();
        document.querySelectorAll('#tl-slides .tl-thumb').forEach(function (b, i) { b.classList.toggle('is-live', i === slide); if (i === slide && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }); });
    }
    function tecla(e) {
        var alvo = e.target || {};
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
        w.addEventListener('beforeunload', function () { setTimeout(transmitir, 50); });
        transmitir();
    }
    function fecharSaida() { if (saida && !saida.closed) saida.close(); saida = null; transmitir(); }

    /* ---------- Tela cheia neste aparelho ---------- */
    function telaCheia() {
        if (cheia) return;
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
                '<div class="tl-top-r"><span id="tl-status" class="tl-status"><span></span>Telão fechado</span>' +
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

    var ABAS = [['culto', 'Culto', 'list-music'], ['biblioteca', 'Músicas', 'library'], ['texto', 'Texto', 'type'], ['estilo', 'Estilo', 'palette']];
    function desenhar() {
        if (!montado) return;
        var abas = document.querySelector('#telao-op .tl-abas');
        abas.innerHTML = ABAS.map(function (a) { return '<button type="button" role="tab" aria-selected="' + (aba === a[0]) + '" class="' + (aba === a[0] ? 'is-active' : '') + '" data-tl-aba="' + a[0] + '">' + ic(a[2]) + '<span>' + a[1] + '</span></button>'; }).join('');
        var c = document.getElementById('tl-conteudo');
        if (aba === 'culto') c.innerHTML = abaCulto();
        else if (aba === 'biblioteca') c.innerHTML = abaBiblioteca();
        else if (aba === 'texto') c.innerHTML = abaTexto();
        else c.innerHTML = abaEstilo();
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
        head.innerHTML = '<div class="min-w-0"><small>' + (it.tipo === 'musica' ? 'Música' : 'Texto') + ' ' + (atual + 1) + ' de ' + fila.length + '</small><b>' + esc(it.titulo) + '</b></div>' +
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
    function abaEstilo() {
        var h = '<div class="tl-bloco"><label class="tl-label">Fonte</label><div class="tl-fontes">' + Object.keys(FONTES).map(function (k) {
            var f = FONTES[k];
            return '<button type="button" class="tl-opc' + (tema.fonte === k ? ' is-on' : '') + '" data-tl-tema="fonte:' + k + '" style="font-family:' + f[1].replace(/"/g, '&quot;') + ';font-weight:' + f[2] + '">' + esc(f[0]) + '</button>';
        }).join('') + '</div></div>';
        h += '<div class="tl-bloco"><label class="tl-label">Fundo</label><div class="tl-fundos">' + Object.keys(FUNDOS).map(function (k) {
            return '<button type="button" class="tl-fundo' + (tema.fundo === k ? ' is-on' : '') + '" data-tl-tema="fundo:' + k + '" title="' + esc(FUNDOS[k][0]) + '"><span style="background:' + FUNDOS[k][1] + '"></span><small>' + esc(FUNDOS[k][0]) + '</small></button>';
        }).join('') +
            '<label class="tl-fundo' + (tema.fundo === 'midia' ? ' is-on' : '') + '" title="Imagem ou vídeo deste aparelho"><span class="tl-fundo-up">' + ic('image') + '</span><small>' + (midiaFundo.url ? (midiaFundo.tipo === 'video' ? 'Vídeo' : 'Imagem') : 'Imagem/vídeo') + '</small><input id="tl-fundo-arquivo" type="file" accept="image/*,video/*" hidden></label></div></div>';
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
        if (b.hasAttribute('data-tl-tema')) {
            var kv = b.getAttribute('data-tl-tema').split(':');
            tema[kv[0]] = kv[0] === 'linhas' ? Number(kv[1]) : kv[1];
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
        } else if (e.target.id === 'tl-tamanho') {
            tema.tamanho = Number(e.target.value) || 1;
            salvarTema(); transmitir();
        }
    }
    function mudar(e) {
        var el = e.target;
        if (el.hasAttribute('data-tl-bool')) { tema[el.getAttribute('data-tl-bool')] = el.checked; salvarTema(); return transmitir(); }
        if (el.id === 'tl-fundo-arquivo' && el.files && el.files[0]) {
            var f = el.files[0];
            if (midiaFundo.url && midiaFundo.url.indexOf('blob:') === 0) URL.revokeObjectURL(midiaFundo.url);
            midiaFundo = { tipo: /^video\//.test(f.type) ? 'video' : 'imagem', url: URL.createObjectURL(f) };
            tema.fundo = 'midia';
            salvarTema();
            return desenhar();
        }
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
    window.fecharTelao = fechar;
    window.cepTelaoFecharSaida = fecharSaida;
    window.cepTelaoSlides = montarSlides; // usado nos testes
})();
