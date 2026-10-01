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
            outras: [['pads', 'Pads & Metrônomo', 'waves'], ['history', 'Histórico', 'history'], ['central', 'Central', 'layout-dashboard'], ['team', 'Equipe', 'users-round']]
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
        ensaio: 'openRehearsalMode', afinador: 'openTuner', aovivo: 'openLiveService', notificacoes: 'openNotificationCenter'
    };
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
    function todasTelas() { var c = TELAS[depto()]; return c.principais.concat(c.outras); }
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
        document.body.classList.add('shell');
    }

    function itemMenu(t, rotulo, icone, extra) {
        var ativo = t && telaAtual === t;
        var attr = t ? 'data-app-go="' + t + '"' : extra.attr;
        return '<button type="button" class="sb-item' + (ativo ? ' is-active' : '') + (extra && extra.classe ? ' ' + extra.classe : '') + '" ' + attr + (ativo ? ' aria-current="page"' : '') + '>' +
            '<span class="sb-ic">' + ic(icone) + '</span><span>' + rotulo + '</span></button>';
    }

    function itensConta() {
        var h = itemMenu(null, 'Disponibilidade', 'calendar-off', { attr: 'data-app-acao="disponibilidade"' });
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
            h += cfg.principais.concat(cfg.outras).map(function (x) { return itemMenu(x[0], x[1], x[2]); }).join('');
            if (d === 'louvor') {
                h += '<p class="sb-label">Ferramentas</p>';
                h += FERRAMENTAS.filter(function (f) { return f[0] !== 'pads'; }).map(function (f) { return itemMenu(null, f[1], f[2], { attr: 'data-app-acao="' + f[0] + '"' }); }).join('');
            }
            h += '</div><div class="sb-foot">' + itensConta() + '</div>';
            sb.innerHTML = h;
        }
        var tb = document.getElementById('app-tabbar');
        if (tb) {
            var emOutra = cfg.outras.some(function (x) { return x[0] === telaAtual; });
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
        var tiles = cfg.outras.map(function (x) {
            return '<button type="button" class="more-tile' + (telaAtual === x[0] ? ' is-active' : '') + '" data-app-go="' + x[0] + '"><span class="i3d">' + ic(x[2]) + '</span>' + x[1] + '</button>';
        });
        if (d === 'louvor') {
            tiles = tiles.concat(FERRAMENTAS.filter(function (f) { return f[0] !== 'pads'; }).map(function (f) {
                return '<button type="button" class="more-tile" data-app-acao="' + f[0] + '"><span class="i3d ' + f[3] + '">' + ic(f[2]) + '</span>' + f[1] + '</button>';
            }));
        }
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
    if (typeof renderMembers === 'function') {
        var membros = renderMembers;
        renderMembers = function () { var r = membros.apply(this, arguments); atualizarTitulo(); return r; };
    }

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
