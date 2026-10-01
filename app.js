/* =========================================================
   Portal CEP Pirapozinho · Navegação de aplicativo (versão 3)
   Menu lateral no computador, barra inferior no celular,
   tela de Início e gradientes metálicos dos ícones com relevo.
   Carregado por último, depois de midia.js e louvor.js.
   ========================================================= */
(function () {
    /* ---------- Gradientes metálicos dos ícones 3D ---------- */
    function criarGradientes() {
        if (document.getElementById('cep-metal-defs')) return;
        var metais = {
            'cep-metal-gold': ['#fff3c4', '#f0d27e', '#d4ae52', '#a88227'],
            'cep-metal-silver': ['#ffffff', '#e4e4e7', '#b4b4bd', '#7c7c86'],
            'cep-metal-green': ['#d1fae5', '#6ee7b7', '#34d399', '#059669'],
            'cep-metal-blue': ['#e0f2fe', '#a5dcfc', '#7dd3fc', '#0284c7'],
            'cep-metal-amber': ['#fef3c7', '#fcd34d', '#fbbf24', '#d97706'],
            'cep-metal-rose': ['#ffe4e6', '#fda4af', '#fb7185', '#e11d48']
        };
        var html = '<svg id="cep-metal-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>';
        Object.keys(metais).forEach(function (id) {
            var c = metais[id];
            html += '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">' +
                '<stop offset="0" stop-color="' + c[0] + '"/><stop offset=".35" stop-color="' + c[1] + '"/>' +
                '<stop offset=".62" stop-color="' + c[2] + '"/><stop offset="1" stop-color="' + c[3] + '"/></linearGradient>';
        });
        document.body.insertAdjacentHTML('afterbegin', html + '</defs></svg>');
    }

    /* ---------- Telas de cada ministério ---------- */
    var TELAS = {
        louvor: {
            nome: 'Louvor & Projeção',
            principais: [['home', 'Início', 'house'], ['roster', 'Escalas', 'calendar-check'], ['repertoire', 'Músicas', 'library'], ['calendar', 'Agenda', 'calendar-days']],
            outras: [['pads', 'Pads & Metrônomo', 'waves'], ['history', 'Histórico', 'history'], ['team', 'Equipe', 'users-round'], ['central', 'Painel do líder', 'shield-check', 'lider']]
        },
        midia: {
            nome: 'Mídia & Transmissão',
            principais: [['home', 'Início', 'house'], ['roster', 'Escalas', 'calendar-check'], ['equipment', 'Equipamentos', 'cpu'], ['calendar', 'Agenda', 'calendar-days']],
            outras: [['team', 'Equipe', 'users-round']]
        }
    };
    var FERRAMENTAS = [['ensaio', 'Modo ensaio', 'play-circle', ''], ['afinador', 'Afinador', 'audio-lines', 'tone-green'], ['pads', 'Pads', 'waves', 'tone-silver'], ['aovivo', 'Ao vivo', 'radio', 'tone-rose']];
    var ACOES = {
        biblia: 'openBible', disponibilidade: 'openAvailabilityModal', instalar: 'installPortalApp', sair: 'logoutPortal',
        ensaio: 'openRehearsalMode', afinador: 'openTuner', aovivo: 'openLiveService', notificacoes: 'openNotificationCenter',
        telao: 'abrirTelao', backup: 'exportPortalBackup', remoto: 'abrirControleRemoto', palco: 'abrirTelaPalco'
    };
    var TELAO = ['telao', 'Telão', 'presentation', 'tone-blue'];
    var REMOTO = ['remoto', 'Controle remoto', 'smartphone', 'tone-amber'];
    var PALCO = ['palco', 'Tela do palco', 'monitor', 'tone-green'];
    var telaAtual = 'home';
    var pronto = false;

    function esc(v) { return typeof escapeHtml === 'function' ? escapeHtml(v) : String(v == null ? '' : v); }
    function ic(nome, classe) { return '<i data-lucide="' + nome + '"' + (classe ? ' class="' + classe + '"' : '') + '></i>'; }
    function icones() { if (window.lucide) lucide.createIcons(); }
    function depto() { return (typeof currentDepartment !== 'undefined' && currentDepartment === 'midia') ? 'midia' : 'louvor'; }
    function permitidos() {
        return ['louvor', 'midia'].filter(function (d) {
            var b = document.getElementById('dept-btn-' + d);
            return b && !b.classList.contains('hidden');
        });
    }
    function podeInstalar() { var b = document.getElementById('install-app-btn'); return !!(b && !b.classList.contains('hidden')); }
    function lider() { try { return typeof isLeaderAccount === 'function' && isLeaderAccount(); } catch (e) { return false; } }
    function outrasTelas() { return TELAS[depto()].outras.filter(function (x) { return x[3] !== 'lider' || lider(); }); }
    function todasTelas() { return TELAS[depto()].principais.concat(outrasTelas()); }
    function ferramentasMenu() { return (depto() === 'louvor' ? FERRAMENTAS.filter(function (f) { return f[0] !== 'pads'; }) : []).concat([TELAO, REMOTO, PALCO]); }
    function nomeTela(t) { var x = todasTelas().filter(function (i) { return i[0] === t; })[0]; return x ? x[1] : 'Início'; }
    function primeiroNome() {
        try {
            var id = typeof currentRosterMemberId === 'function' ? currentRosterMemberId() : '';
            var m = (membersData || []).filter(function (x) { return String(x.id) === String(id); })[0];
            var nome = (m && m.name) || (currentUser && currentUser.displayName) || '';
            return String(nome).trim().split(' ').filter(Boolean)[0] || '';
        } catch (e) { return ''; }
    }

    /* ---------- Estrutura ---------- */
    function montar() {
        var topo = document.querySelector('header > div > div:first-child');
        if (topo && !document.getElementById('app-title')) {
            topo.insertAdjacentHTML('beforeend',
                '<div id="app-title"><span class="t-logo i3d-gold">' + ic('church') + '</span>' +
                '<div class="t-text"><span class="t-over" id="app-title-over"></span><h1 id="app-title-h">Início</h1></div>' +
                '<button type="button" id="app-dept-chip" data-app-acao="trocar" style="display:none">' + ic('repeat-2') + '<span></span></button></div>');
        }
        document.body.insertAdjacentHTML('beforeend',
            '<aside id="app-sidebar" aria-label="Menu principal"></aside>' +
            '<nav id="app-tabbar" aria-label="Navegação principal"></nav>' +
            '<div id="app-more"><div class="more-backdrop" data-app-acao="fechar"></div><div class="more-panel" role="dialog" aria-modal="true" aria-label="Mais opções"></div></div>');

        var visao = document.getElementById('louvor-overview');
        if (visao && !document.getElementById('louvor-atalhos')) {
            visao.insertAdjacentHTML('afterend',
                '<section id="louvor-atalhos" class="app-home-only" aria-label="Ferramentas"><p class="app-block-title">Ferramentas</p><div class="app-tools">' +
                FERRAMENTAS.map(function (f) {
                    var attr = f[0] === 'pads' ? 'data-app-go="pads"' : 'data-app-acao="' + f[0] + '"';
                    return '<button type="button" class="app-tool" ' + attr + '><span class="i3d ' + f[3] + '">' + ic(f[2]) + '</span>' + f[1] + '</button>';
                }).join('') + '</div></section>');
        }
        var banner = function (id) {
            return '<button type="button" id="' + id + '" class="app-telao-cta app-home-only" data-app-acao="telao">' +
                '<span class="i3d tone-blue">' + ic('presentation') + '</span>' +
                '<span class="cta-txt"><b>Telão</b><small>Projete letras das músicas, versículos e avisos na tela da igreja.</small></span>' +
                '<span class="cta-go">Abrir' + ic('chevron-right') + '</span></button>' +
                '<div class="app-telao-mini app-home-only">' +
                '<button type="button" data-app-acao="remoto"><span class="i3d tone-amber">' + ic('smartphone') + '</span><span><b>Controle remoto</b><small>Passe os slides pelo celular</small></span></button>' +
                '<button type="button" data-app-acao="palco"><span class="i3d tone-green">' + ic('monitor') + '</span><span><b>Tela do palco</b><small>Retorno para músicos e pregador</small></span></button></div>';
        };
        var atalhos = document.getElementById('louvor-atalhos');
        if (atalhos && !document.getElementById('louvor-telao')) atalhos.insertAdjacentHTML('beforebegin', banner('louvor-telao'));
        var visaoMidia = document.getElementById('midia-overview');
        if (visaoMidia && !document.getElementById('midia-telao')) visaoMidia.insertAdjacentHTML('afterend', banner('midia-telao'));
        montarPainelLider();
        document.body.classList.add('shell');
    }

    /* ---------- Painel do líder (antiga Central) ---------- */
    var CHAVE_BACKUP = 'cep-ultimo-backup';
    function montarPainelLider() {
        var aba = document.getElementById('tab-central');
        if (!aba || document.getElementById('painel-lider-head')) return;
        aba.insertAdjacentHTML('afterbegin',
            '<div class="md-section-head" id="painel-lider-head"><div><h2>Painel do líder</h2><p>Presença, pedidos de troca, estatísticas e culto ao vivo. Só a liderança vê esta tela.</p></div></div>' +
            '<div class="app-backup" id="app-backup"></div>');
        desenharBackup();
    }
    function desenharBackup() {
        var el = document.getElementById('app-backup');
        if (!el) return;
        var data = null;
        try { data = localStorage.getItem(CHAVE_BACKUP); } catch (e) {}
        var dias = data ? Math.floor((Date.now() - new Date(data).getTime()) / 864e5) : null;
        var atrasado = dias === null || dias > 30;
        el.className = 'app-backup' + (atrasado ? ' is-late' : '');
        el.innerHTML = '<span class="i3d ' + (atrasado ? 'tone-amber' : 'tone-green') + '">' + ic('hard-drive-download') + '</span>' +
            '<div class="min-w-0"><b>Cópia de segurança</b><small>' + (data
                ? 'Último backup feito neste aparelho em ' + new Date(data).toLocaleDateString('pt-BR') + (dias === 0 ? ' (hoje)' : ' (há ' + dias + (dias === 1 ? ' dia' : ' dias') + ')') + '.'
                : 'Nenhum backup feito neste aparelho ainda.') + (atrasado ? ' Recomendamos baixar um por mês e guardar no Drive.' : '') + '</small></div>' +
            '<button type="button" class="md-btn ' + (atrasado ? 'md-btn-primary' : 'md-btn-ghost') + '" data-app-acao="backup">' + ic('download') + 'Baixar backup</button>';
        icones();
    }
    if (typeof exportPortalBackup === 'function') {
        var backupOriginal = exportPortalBackup;
        exportPortalBackup = async function () {
            var r = await backupOriginal.apply(this, arguments);
            if (lider()) {
                try { localStorage.setItem(CHAVE_BACKUP, new Date().toISOString()); } catch (e) {}
                desenharBackup();
                if (typeof portalToast === 'function') portalToast('Backup baixado. Guarde o arquivo em um lugar seguro.');
            }
            return r;
        };
    }

    function itemMenu(t, rotulo, icone, extra) {
        var ativo = t && telaAtual === t;
        var attr = t ? 'data-app-go="' + t + '"' : extra.attr;
        return '<button type="button" class="sb-item' + (ativo ? ' is-active' : '') + (extra && extra.classe ? ' ' + extra.classe : '') + '" ' + attr + (ativo ? ' aria-current="page"' : '') + '>' +
            '<span class="sb-ic">' + ic(icone) + '</span><span>' + rotulo + '</span></button>';
    }

    function itensConta() {
        var h = itemMenu(null, 'Dias que não posso', 'calendar-off', { attr: 'data-app-acao="disponibilidade"' });
        h += itemMenu(null, 'Bíblia', 'book-open', { attr: 'data-app-acao="biblia"' });
        if (podeInstalar()) h += itemMenu(null, 'Instalar o app', 'download', { attr: 'data-app-acao="instalar"' });
        h += itemMenu(null, 'Sair', 'log-out', { attr: 'data-app-acao="sair"', classe: 'sb-danger' });
        return h;
    }

    function renderizarMenu() {
        var d = depto(), cfg = TELAS[d], deptos = permitidos();
        var sb = document.getElementById('app-sidebar');
        if (sb) {
            var h = '<div class="sb-brand"><span class="sb-logo i3d-gold">' + ic('church') + '</span><div><b>CEP Pirapozinho</b><small>Portal de Ministérios</small></div></div>';
            if (deptos.length > 1) {
                h += '<div class="sb-dept" role="tablist" aria-label="Ministério">' + deptos.map(function (x) {
                    return '<button type="button" role="tab" aria-selected="' + (x === d) + '" class="' + (x === d ? 'is-active' : '') + '" data-app-dept="' + x + '">' + (x === 'midia' ? 'Mídia' : 'Louvor') + '</button>';
                }).join('') + '</div>';
            }
            h += '<div class="sb-scroll"><p class="sb-label">' + cfg.nome + '</p>';
            h += todasTelas().map(function (x) { return itemMenu(x[0], x[1], x[2]); }).join('');
            h += '<p class="sb-label">Ferramentas</p>';
            h += ferramentasMenu().map(function (f) { return itemMenu(null, f[1], f[2], { attr: 'data-app-acao="' + f[0] + '"' }); }).join('');
            h += '</div><div class="sb-foot">' + itensConta() + '</div>';
            sb.innerHTML = h;
        }
        var tb = document.getElementById('app-tabbar');
        if (tb) {
            var emOutra = outrasTelas().some(function (x) { return x[0] === telaAtual; });
            tb.innerHTML = cfg.principais.map(function (x) {
                var ativo = telaAtual === x[0];
                return '<button type="button" class="tb-item' + (ativo ? ' is-active' : '') + '" data-app-go="' + x[0] + '"' + (ativo ? ' aria-current="page"' : '') + '><span class="tb-ic">' + ic(x[2]) + '</span><span>' + x[1] + '</span></button>';
            }).join('') + '<button type="button" class="tb-item' + (emOutra ? ' is-active' : '') + '" data-app-acao="mais"><span class="tb-ic">' + ic('layout-grid') + '</span><span>Mais</span></button>';
        }
        atualizarTitulo();
        icones();
    }

    function atualizarTitulo() {
        var over = document.getElementById('app-title-over');
        var h = document.getElementById('app-title-h');
        if (!h) return;
        var nome = primeiroNome();
        over.textContent = TELAS[depto()].nome;
        h.textContent = telaAtual === 'home' ? (nome ? 'Olá, ' + nome : 'Início') : nomeTela(telaAtual);
        var chip = document.getElementById('app-dept-chip');
        var deptos = permitidos();
        if (chip) {
            chip.style.display = deptos.length > 1 ? '' : 'none';
            chip.querySelector('span').textContent = depto() === 'midia' ? 'Louvor' : 'Mídia';
            chip.setAttribute('aria-label', 'Trocar para ' + (depto() === 'midia' ? 'Louvor' : 'Mídia'));
        }
        document.title = (telaAtual === 'home' ? 'Início' : nomeTela(telaAtual)) + ' · CEP Pirapozinho';
    }

    /* ---------- Folha "Mais" (celular) ---------- */
    function abrirMais(abrir) {
        var caixa = document.getElementById('app-more');
        if (!caixa) return;
        if (!abrir) { caixa.classList.remove('open'); return; }
        var d = depto(), cfg = TELAS[d], deptos = permitidos();
        var painel = caixa.querySelector('.more-panel');
        var tiles = outrasTelas().map(function (x) {
            return '<button type="button" class="more-tile' + (telaAtual === x[0] ? ' is-active' : '') + '" data-app-go="' + x[0] + '"><span class="i3d' + (x[3] === 'lider' ? ' tone-amber' : '') + '">' + ic(x[2]) + '</span>' + x[1] + '</button>';
        });
        [TELAO, REMOTO, PALCO].forEach(function (f) { tiles.push('<button type="button" class="more-tile" data-app-acao="' + f[0] + '"><span class="i3d ' + f[3] + '">' + ic(f[2]) + '</span>' + f[1] + '</button>'); });
        var h = '<div class="more-grip"></div><p class="app-block-title">' + cfg.nome + '</p><div class="more-grid">' + tiles.join('') + '</div>';
        h += '<p class="app-block-title" style="margin-top:1.1rem">Conta</p><div class="more-list">';
        if (deptos.length > 1) {
            var outro = d === 'midia' ? 'louvor' : 'midia';
            h += itemMenu(null, 'Ir para ' + (outro === 'midia' ? 'Mídia & Transmissão' : 'Louvor & Projeção'), 'repeat-2', { attr: 'data-app-dept="' + outro + '"' });
        }
        h += itensConta() + '</div>';
        painel.innerHTML = h;
        caixa.classList.add('open');
        icones();
    }
    window.cepAppMais = abrirMais;

    /* ---------- Navegação ---------- */
    function definirTela(t) {
        telaAtual = t || 'home';
        document.body.classList.toggle('screen-home', telaAtual === 'home');
        document.body.setAttribute('data-screen', telaAtual);
        renderizarMenu();
    }

    function ir(t) {
        abrirMais(false);
        if (!todasTelas().some(function (x) { return x[0] === t; })) t = 'home';
        if (t === 'home') definirTela('home');
        else if (depto() === 'midia') switchMidiaTab(t);
        else switchTab(t);
        window.scrollTo(0, 0);
    }
    window.cepAppIr = ir;

    function executar(acao) {
        if (acao === 'mais') return abrirMais(true);
        abrirMais(false);
        if (acao === 'fechar') return;
        if (acao === 'trocar') return switchDepartment(depto() === 'midia' ? 'louvor' : 'midia');
        var nome = ACOES[acao];
        if (nome && typeof window[nome] === 'function') window[nome]();
    }

    document.addEventListener('click', function (e) {
        var alvo = e.target.closest ? e.target.closest('[data-app-go],[data-app-dept],[data-app-acao]') : null;
        if (!alvo) return;
        e.preventDefault();
        if (alvo.hasAttribute('data-app-go')) return ir(alvo.getAttribute('data-app-go'));
        if (alvo.hasAttribute('data-app-dept')) { abrirMais(false); return switchDepartment(alvo.getAttribute('data-app-dept')); }
        executar(alvo.getAttribute('data-app-acao'));
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') abrirMais(false); });

    /* Mantém o menu em dia quando o app troca de aba ou de ministério */
    if (typeof switchTab === 'function') {
        var abaLouvor = switchTab;
        switchTab = function (t) { var r = abaLouvor.apply(this, arguments); if (pronto) definirTela(t); return r; };
    }
    if (typeof switchMidiaTab === 'function') {
        var abaMidia = switchMidiaTab;
        switchMidiaTab = function (t) { var r = abaMidia.apply(this, arguments); if (pronto) definirTela(t); return r; };
    }
    if (typeof switchDepartment === 'function') {
        var trocaDepto = switchDepartment;
        switchDepartment = function () {
            var r = trocaDepto.apply(this, arguments);
            if (pronto) { definirTela('home'); window.scrollTo(0, 0); }
            return r;
        };
    }
    if (typeof applyAdminVisibility === 'function') {
        var visibilidade = applyAdminVisibility;
        applyAdminVisibility = function () {
            var r = visibilidade.apply(this, arguments);
            if (pronto) { if (telaAtual === 'central' && !lider()) ir('home'); else renderizarMenu(); }
            return r;
        };
    }
    if (typeof renderMembers === 'function') {
        var membros = renderMembers;
        renderMembers = function () { var r = membros.apply(this, arguments); if (pronto) renderizarMenu(); return r; };
    }

    /* ---------- Dias que não posso servir ---------- */
    function nomeDia(iso) {
        var p = iso.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2]);
        return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
    }
    function hojeIso() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
    window.openAvailabilityModal = function () {
        if (typeof currentUser === 'undefined' || !currentUser) return;
        var dias = (typeof myAvailability !== 'undefined' ? myAvailability : []).filter(function (x) { return x >= hojeIso(); }).sort();
        var velho = document.getElementById('app-dias');
        if (velho) velho.remove();
        document.body.insertAdjacentHTML('beforeend',
            '<div id="app-dias" class="app-dias" role="dialog" aria-modal="true" aria-labelledby="app-dias-t"><div class="app-dias-box">' +
            '<div class="app-dias-head"><span class="i3d tone-rose">' + ic('calendar-off') + '</span><div><h3 id="app-dias-t">Dias que não posso servir</h3><p>A liderança vê esses dias ao montar as escalas.</p></div></div>' +
            '<div class="app-dias-add"><input type="date" id="app-dias-data" min="' + hojeIso() + '" aria-label="Escolha o dia"><button type="button" class="md-btn md-btn-primary" id="app-dias-mais">' + ic('plus') + 'Adicionar</button></div>' +
            '<div id="app-dias-lista" class="app-dias-lista"></div>' +
            '<div class="app-dias-foot"><button type="button" class="md-btn md-btn-ghost" id="app-dias-cancelar">Cancelar</button><button type="button" class="md-btn md-btn-primary" id="app-dias-salvar">' + ic('check') + 'Salvar</button></div>' +
            '</div></div>');
        var caixa = document.getElementById('app-dias');
        function lista() {
            document.getElementById('app-dias-lista').innerHTML = dias.length ? dias.map(function (d, i) {
                return '<span class="app-dia">' + esc(nomeDia(d)) + '<button type="button" data-dia="' + i + '" aria-label="Remover ' + esc(nomeDia(d)) + '">' + ic('x') + '</button></span>';
            }).join('') : '<p class="app-dias-vazio">Nenhum dia marcado. Você está disponível em todas as datas.</p>';
            icones();
        }
        function fechar() { caixa.remove(); }
        caixa.addEventListener('click', async function (e) {
            if (e.target === caixa || e.target.closest('#app-dias-cancelar')) return fechar();
            var rm = e.target.closest('[data-dia]');
            if (rm) { dias.splice(Number(rm.getAttribute('data-dia')), 1); return lista(); }
            if (e.target.closest('#app-dias-mais')) {
                var v = document.getElementById('app-dias-data').value;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
                if (dias.indexOf(v) === -1) dias.push(v);
                dias.sort();
                return lista();
            }
            if (e.target.closest('#app-dias-salvar')) {
                var campo = document.getElementById('app-dias-data').value;
                if (/^\d{4}-\d{2}-\d{2}$/.test(campo) && dias.indexOf(campo) === -1) dias.push(campo);
                try {
                    await db.collection('availability').doc(currentUser.uid).set({ unavailableDates: dias.slice().sort(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                    myAvailability = dias.slice().sort();
                    fechar();
                    if (typeof portalToast === 'function') portalToast(dias.length ? 'Dias salvos. A liderança já pode ver.' : 'Pronto: você está disponível em todas as datas.');
                } catch (err) {
                    console.error(err);
                    if (typeof portalToast === 'function') portalToast('Não foi possível salvar agora. Tente de novo.', 'error');
                }
            }
        });
        caixa.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
        lista();
        document.getElementById('app-dias-data').focus();
    };

    function iniciar() {
        criarGradientes();
        montar();
        pronto = true;
        definirTela('home');
        var instalar = document.getElementById('install-app-btn');
        if (instalar && window.MutationObserver) new MutationObserver(function () { renderizarMenu(); }).observe(instalar, { attributes: true, attributeFilter: ['class'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
