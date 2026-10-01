/* =========================================================
   Portal CEP Pirapozinho · Controle remoto e Tela do palco
   Conversam com o computador do telão pelo documento
   settings/telao do Firestore:
   - estado: o que está no telão (escrito pelo computador)
   - comando: o último botão apertado no celular
   - palco: mensagem para o palco e cronômetro da pregação
   ========================================================= */
(function () {
    var ouvir = null;        // cancelamento do onSnapshot
    var dados = {};          // último documento recebido
    var tela = '';           // 'remoto' | 'palco'
    var relogio = null;
    var MENSAGENS = ['Repete o refrão', 'Última vez', 'Mais devagar', 'Mais rápido', 'Vamos para a próxima', 'Encerrar'];

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function ic(n, c) { return '<i data-lucide="' + n + '"' + (c ? ' class="' + c + '"' : '') + '></i>'; }
    function icones() { if (window.lucide) lucide.createIcons(); }
    function aviso(m, t) { if (typeof portalToast === 'function') portalToast(m, t || 'auto'); }
    function doc() { try { return (typeof db !== 'undefined' && db && typeof currentUser !== 'undefined' && currentUser) ? db.collection('settings').doc('telao') : null; } catch (e) { return null; } }
    function dois(n) { return (n < 10 ? '0' : '') + n; }
    function mmss(ms) {
        var neg = ms < 0, t = Math.round(Math.abs(ms) / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
        return (neg ? '+' : '') + (h ? h + ':' + dois(m) : dois(m)) + ':' + dois(x);
    }
    function estado() { return dados.estado || null; }
    function palco() { return dados.palco || {}; }
    function online() { var e = estado(); return !!(e && e.at && Date.now() - e.at < 95000); }
    function meuNome() { try { return (currentUser && (currentUser.displayName || currentUser.email)) || 'Alguém'; } catch (e) { return 'Alguém'; } }

    /* ---------- Conexão ---------- */
    function conectar() {
        var d = doc();
        if (!d) { aviso('Entre no portal para usar esta tela.', 'error'); return false; }
        if (ouvir) return true;
        ouvir = d.onSnapshot(function (snap) {
            dados = (snap && snap.exists && snap.data()) || {};
            desenhar();
        }, function (e) {
            console.error('Palco/remoto:', e);
            aviso('Sem permissão para ler o telão ao vivo no Firebase.', 'error');
        });
        clearInterval(relogio);
        relogio = setInterval(tique, 500);
        return true;
    }
    function desconectar() {
        if (ouvir) { try { ouvir(); } catch (e) {} ouvir = null; }
        clearInterval(relogio); relogio = null;
    }
    function enviar(acao, extra) {
        var e = estado(), d = doc();
        if (!d) return;
        if (!e || !online()) return aviso('O telão não está ligado. No computador, abra o Telão e clique em "Abrir telão" ou "Tela cheia aqui".', 'error');
        var c = Object.assign({ id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), host: e.hostId, acao: acao, at: Date.now(), por: meuNome() }, extra || {});
        if (navigator.vibrate) navigator.vibrate(15);
        d.set({ comando: c }, { merge: true }).catch(function (err) { console.error(err); aviso('Sua conta não tem permissão para controlar o telão.', 'error'); });
    }
    function salvarPalco(mudancas) {
        var d = doc();
        if (!d) return;
        var novo = Object.assign({}, palco(), mudancas);
        dados.palco = novo;
        desenhar();
        d.set({ palco: novo }, { merge: true }).catch(function (err) { console.error(err); aviso('Sua conta não tem permissão para mandar recado ao palco.', 'error'); });
    }

    /* ---------- Montagem ---------- */
    function caixa() {
        var c = document.getElementById('cep-aovivo');
        if (c) return c;
        document.body.insertAdjacentHTML('beforeend', '<div id="cep-aovivo" class="hidden" role="dialog" aria-modal="true"></div>');
        c = document.getElementById('cep-aovivo');
        c.addEventListener('click', clique);
        c.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.id === 'av-msg') { e.preventDefault(); mandarMensagem(); }
            if (e.key === 'Enter' && e.target.id === 'av-bib') { e.preventDefault(); mandarBiblia(); }
        });
        return c;
    }
    function abrir(qual) {
        if (!conectar()) return;
        tela = qual;
        var c = caixa();
        c.className = 'av-' + qual;
        document.body.classList.add('av-aberto');
        desenhar();
        if (qual === 'palco' && window.innerWidth > 900 && c.requestFullscreen) c.requestFullscreen().catch(function () {});
    }
    function fechar() {
        var c = document.getElementById('cep-aovivo');
        if (c) c.className = 'hidden';
        document.body.classList.remove('av-aberto');
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
        tela = '';
        desconectar();
    }

    /* ---------- Controle remoto ---------- */
    function htmlRemoto() {
        var e = estado(), p = palco(), on = online();
        var h = '<div class="av-top"><div class="av-top-l"><span class="i3d tone-amber av-top-ic">' + ic('smartphone') + '</span><div><b>Controle remoto</b><small class="av-st' + (on ? ' is-on' : '') + '"><span></span>' + (on ? 'Conectado ao telão' : 'Telão desligado') + '</small></div></div>' +
            '<button type="button" class="md-icon-btn" data-av="fechar" aria-label="Fechar">' + ic('x') + '</button></div><div class="av-corpo">';
        if (!on) {
            h += '<div class="av-aviso">' + ic('monitor', 'w-5 h-5') + '<p>No computador do projetor, abra o <b>Telão</b> e clique em <b>Abrir telão</b> ou <b>Tela cheia aqui</b>. Este celular conecta sozinho.</p></div>';
        }
        if (e) {
            var modo = e.modo;
            var agora = modo === 'abertura' ? '<span class="av-tag">Abertura</span>' + (e.abertura && !e.abertura.fim ? '<b class="av-big" data-av-cont>' + mmss(e.abertura.alvo - Date.now()) + '</b>' : '<b class="av-big">' + esc(e.abertura ? e.abertura.txtFim : '') + '</b>')
                : modo === 'preto' ? '<span class="av-tag av-tag-red">Tela preta</span>'
                    : modo === 'logo' ? '<span class="av-tag">Logo da igreja</span>'
                        : modo === 'limpo' ? '<span class="av-tag">Só o fundo</span>'
                            : (e.linhas && e.linhas.length ? '<p class="av-letra">' + e.linhas.map(esc).join('<br>') + '</p>' : '<p class="av-vazio">Nada no telão</p>');
            h += '<section class="av-agora"><div class="av-agora-top"><small>' + esc(e.titulo || 'Telão') + (e.slides && e.slides.length ? ' · ' + (e.slide + 1) + '/' + e.slides.length : '') + '</small><span class="av-live">No telão</span></div>' + agora +
                (e.proximo && modo === 'normal' ? '<p class="av-prox"><span>Próximo' + (e.proximo.novoItem ? ' · ' + esc(e.proximo.titulo) : '') + '</span>' + esc(e.proximo.linhas.join(' / ')) + '</p>' : '') + '</section>';
            h += '<div class="av-nav"><button type="button" class="av-btn" data-av-acao="ant" aria-label="Anterior">' + ic('chevron-left') + '</button><button type="button" class="av-btn av-btn-main" data-av-acao="prox">Próximo' + ic('chevron-right') + '</button></div>';
            h += '<div class="av-modos">' + [['preto', 'Preto', 'square'], ['logo', 'Logo', 'church'], ['limpo', 'Limpar', 'eraser'], ['abertura', 'Abertura', 'timer']].map(function (m) {
                return '<button type="button" class="av-modo' + (modo === m[0] ? ' is-on' : '') + '" data-av-acao="' + m[0] + '">' + ic(m[2]) + '<span>' + m[1] + '</span></button>';
            }).join('') + '</div>';
            if (modo === 'abertura') h += '<button type="button" class="md-btn md-btn-ghost av-full" data-av-acao="ab-mais">' + ic('plus') + 'Mais 1 minuto na contagem</button>';
            h += '<section class="av-sec"><p class="av-titulo">' + ic('book-open', 'w-4 h-4') + 'Bíblia</p><div class="tl-linha"><input id="av-bib" type="text" placeholder="Ex.: jo 3 16 · sl 23 1" autocomplete="off" enterkeyhint="go"><button type="button" class="md-btn md-btn-primary" data-av="bib">' + ic('presentation') + '</button></div><p class="av-dica">Projeta o versículo na hora. Depois é só usar Próximo para seguir o texto.</p></section>';
            if (e.slides && e.slides.length) {
                h += '<p class="av-titulo">Slides de ' + esc(e.titulo) + '</p><div class="av-slides">' + e.slides.map(function (s, i) {
                    return '<button type="button" class="av-slide' + (i === e.slide && modo === 'normal' ? ' is-live' : '') + '" data-av-ir="' + e.atual + ':' + i + '"><small>' + (i + 1) + (s.rotulo ? ' · ' + esc(s.rotulo) : '') + '</small>' + esc(s.resumo) + '</button>';
                }).join('') + '</div>';
            }
            if (e.fila && e.fila.length) {
                h += '<p class="av-titulo">Ordem do culto</p><ol class="av-fila">' + e.fila.map(function (f, i) {
                    return '<li><button type="button" class="' + (i === e.atual ? 'is-live' : '') + '" data-av-ir="' + i + ':0"><span>' + (i + 1) + '</span><b>' + esc(f.titulo) + '</b><small>' + (f.tipo === 'biblia' ? 'Bíblia' : f.tipo === 'texto' ? 'Texto' : f.n + (f.n === 1 ? ' slide' : ' slides')) + '</small></button></li>';
                }).join('') + '</ol>';
            }
        }
        h += blocoPalco(p);
        h += '<button type="button" class="md-btn md-btn-ghost av-full" data-av="abrir-palco">' + ic('monitor') + 'Abrir a tela do palco neste aparelho</button>';
        return h + '</div>';
    }
    function blocoPalco(p) {
        var t = p.timer || {};
        var h = '<section class="av-sec"><p class="av-titulo">' + ic('message-circle', 'w-4 h-4') + 'Recado para o palco</p>';
        if (p.msg) h += '<div class="av-msg-atual"><span>' + esc(p.msg) + '</span><button type="button" class="tl-link" data-av="apagar-msg">Apagar</button></div>';
        h += '<div class="av-chips">' + MENSAGENS.map(function (m) { return '<button type="button" data-av-msg="' + esc(m) + '">' + esc(m) + '</button>'; }).join('') + '</div>' +
            '<div class="tl-linha"><input id="av-msg" type="text" maxlength="80" placeholder="Escreva um recado…"><button type="button" class="md-btn md-btn-primary" data-av="enviar-msg">' + ic('send') + '</button></div></section>';
        h += '<section class="av-sec"><p class="av-titulo">' + ic('timer', 'w-4 h-4') + 'Cronômetro da pregação</p>';
        if (t.rodando) h += '<div class="av-timer"><b data-av-timer>' + mmss(t.inicio + t.dur - Date.now()) + '</b><div class="tl-linha tl-linha-2"><button type="button" class="md-btn md-btn-ghost" data-av="timer-mais">' + ic('plus') + '5 min</button><button type="button" class="md-btn md-btn-danger" data-av="timer-parar">' + ic('square') + 'Parar</button></div></div>';
        else h += '<div class="av-chips">' + [20, 30, 40, 50, 60].map(function (m) { return '<button type="button" data-av-timer-min="' + m + '">' + m + ' min</button>'; }).join('') + '</div>';
        return h + '</section>';
    }

    /* ---------- Tela do palco ---------- */
    function htmlPalco() {
        var e = estado(), p = palco(), t = p.timer || {}, on = online();
        var agora = new Date();
        var h = '<div class="pc-top"><div class="pc-musica">' + (e && e.titulo ? esc(e.titulo) : 'Tela do palco') + '</div>' +
            '<div class="pc-hora" data-pc-hora>' + dois(agora.getHours()) + ':' + dois(agora.getMinutes()) + '</div>' +
            '<div class="pc-timer' + (t.rodando ? '' : ' hidden') + '" data-pc-timer-box><small>Pregação</small><b data-av-timer>' + (t.rodando ? mmss(t.inicio + t.dur - Date.now()) : '') + '</b></div>' +
            '<button type="button" class="pc-sair" data-av="fechar" aria-label="Fechar a tela do palco">' + ic('x') + '</button></div>';
        h += '<div class="pc-meio">';
        if (!e || !on) h += '<p class="pc-espera">' + ic('monitor', 'w-8 h-8') + 'Aguardando o telão…</p>';
        else if (e.modo === 'abertura' && e.abertura) h += '<p class="pc-sub">' + esc(e.abertura.fim ? e.abertura.txtFim : e.abertura.titulo) + '</p>' + (e.abertura.fim ? '' : '<p class="pc-cont" data-av-cont>' + mmss(e.abertura.alvo - Date.now()) + '</p>');
        else {
            var marca = e.modo === 'preto' ? '<span class="pc-marca">Telão em preto</span>' : e.modo === 'logo' ? '<span class="pc-marca">Logo no telão</span>' : e.modo === 'limpo' ? '<span class="pc-marca">Telão limpo</span>' : '';
            h += marca + (e.linhas && e.linhas.length ? '<p class="pc-atual">' + e.linhas.map(esc).join('<br>') + '</p>' : '') + (e.ref ? '<p class="pc-ref">' + esc(e.ref) + '</p>' : '');
            if (e.proximo) h += '<div class="pc-prox"><small>Próximo' + (e.proximo.novoItem ? ' · ' + esc(e.proximo.titulo) : '') + '</small><p>' + e.proximo.linhas.map(esc).join('<br>') + '</p></div>';
        }
        h += '</div>';
        if (p.msg) h += '<div class="pc-msg' + (p.msgAt && Date.now() - p.msgAt < 12000 ? ' is-novo' : '') + '">' + ic('message-circle', 'w-8 h-8') + '<span>' + esc(p.msg) + '</span></div>';
        return h;
    }

    function desenhar() {
        var c = document.getElementById('cep-aovivo');
        if (!c || !tela) return;
        var ativo = document.activeElement && (document.activeElement.id === 'av-msg' || document.activeElement.id === 'av-bib') ? document.activeElement.id : null;
        var foco = ativo ? document.getElementById(ativo).value : null;
        var rolagem = c.querySelector('.av-corpo') ? c.querySelector('.av-corpo').scrollTop : 0;
        c.innerHTML = tela === 'palco' ? htmlPalco() : htmlRemoto();
        var corpo = c.querySelector('.av-corpo');
        if (corpo) corpo.scrollTop = rolagem;
        if (foco !== null) { var campo = document.getElementById(ativo); if (campo) { campo.value = foco; campo.focus(); } }
        icones();
        ajustarTexto();
    }
    function ajustarTexto() {
        var el = document.querySelector('#cep-aovivo .pc-atual');
        if (!el) return;
        var n = el.textContent.length;
        el.style.fontSize = n > 220 ? '4.2vmin' : n > 140 ? '5.4vmin' : n > 80 ? '6.6vmin' : '8vmin';
    }
    function tique() {
        var c = document.getElementById('cep-aovivo');
        if (!c || !tela) return;
        var e = estado(), t = (palco().timer) || {};
        c.querySelectorAll('[data-av-cont]').forEach(function (el) { if (e && e.abertura) el.textContent = mmss(Math.max(0, e.abertura.alvo - Date.now())); });
        c.querySelectorAll('[data-av-timer]').forEach(function (el) {
            if (!t.rodando) return;
            var r = t.inicio + t.dur - Date.now();
            el.textContent = mmss(r);
            el.classList.toggle('is-alerta', r < 120000 && r >= 0);
            el.classList.toggle('is-estourou', r < 0);
        });
        var hora = c.querySelector('[data-pc-hora]');
        if (hora) { var d = new Date(); hora.textContent = dois(d.getHours()) + ':' + dois(d.getMinutes()); }
        var msg = c.querySelector('.pc-msg.is-novo');
        if (msg && palco().msgAt && Date.now() - palco().msgAt >= 12000) msg.classList.remove('is-novo');
    }

    function mandarBiblia() {
        var campo = document.getElementById('av-bib');
        var ref = String((campo && campo.value) || '').trim();
        if (!ref) return;
        enviar('biblia', { ref: ref });
        if (campo) { campo.value = ''; campo.blur(); }
    }
    function mandarMensagem(txt) {
        var campo = document.getElementById('av-msg');
        var m = String(txt || (campo && campo.value) || '').trim();
        if (!m) return;
        salvarPalco({ msg: m, msgAt: Date.now(), msgPor: meuNome() });
        if (campo) campo.value = '';
        aviso('Recado enviado ao palco.');
    }
    function clique(ev) {
        var b = ev.target.closest('button');
        if (tela === 'palco' && !b) {
            var c = document.getElementById('cep-aovivo');
            if (!document.fullscreenElement && c.requestFullscreen) c.requestFullscreen().catch(function () {});
            return;
        }
        if (!b) return;
        var a = b.getAttribute('data-av');
        if (b.hasAttribute('data-av-acao')) return enviar(b.getAttribute('data-av-acao'));
        if (b.hasAttribute('data-av-ir')) { var p = b.getAttribute('data-av-ir').split(':'); return enviar('ir', { item: Number(p[0]), slide: Number(p[1]) }); }
        if (b.hasAttribute('data-av-msg')) return mandarMensagem(b.getAttribute('data-av-msg'));
        if (b.hasAttribute('data-av-timer-min')) return salvarPalco({ timer: { rodando: true, inicio: Date.now(), dur: Number(b.getAttribute('data-av-timer-min')) * 60000 } });
        if (a === 'fechar') return fechar();
        if (a === 'abrir-palco') return abrir('palco');
        if (a === 'enviar-msg') return mandarMensagem();
        if (a === 'bib') return mandarBiblia();
        if (a === 'apagar-msg') return salvarPalco({ msg: '', msgAt: 0 });
        if (a === 'timer-parar') return salvarPalco({ timer: { rodando: false } });
        if (a === 'timer-mais') { var t = palco().timer || {}; if (t.rodando) salvarPalco({ timer: { rodando: true, inicio: t.inicio, dur: t.dur + 300000 } }); }
    }
    document.addEventListener('keydown', function (e) {
        if (!tela) return;
        if (e.key === 'Escape') return fechar();
        if (tela !== 'remoto' || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); enviar('prox'); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); enviar('ant'); }
    });

    window.abrirControleRemoto = function () { abrir('remoto'); };
    window.abrirTelaPalco = function () { abrir('palco'); };
})();
