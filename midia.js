/* =========================================================
   Portal CEP Pirapozinho · Área da Mídia (versão 2)
   Carregado depois do script principal. Substitui a renderização
   da Mídia: resumo, escalas com confirmações reais, equipamentos
   com status e revisão, e agenda compartilhada entre todos.
   ========================================================= */

/* ---------- Utilidades ---------- */
function mdEsc(v) { return typeof escapeHtml === 'function' ? escapeHtml(v) : String(v == null ? '' : v); }
function mdLider() { return currentUserRole === 'leader' || currentUserRole === 'admin' || (currentUser && currentUser.uid === ADMIN_UID); }
function mdIcone(nome, classe) { return '<i data-lucide="' + nome + '" class="' + (classe || 'w-4 h-4') + '"></i>'; }
function mdIcones() { if (window.lucide) lucide.createIcons(); }
function mdInicioDoDia(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function mdDiasAte(data) { return Math.round((mdInicioDoDia(data) - mdInicioDoDia(new Date())) / 86400000); }
function mdQuando(data) {
    const dias = mdDiasAte(data);
    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Amanhã';
    if (dias > 1) return 'Em ' + dias + ' dias';
    if (dias === -1) return 'Ontem';
    return 'Há ' + Math.abs(dias) + ' dias';
}
function mdBlocoData(data) {
    if (!data || isNaN(data)) return '<div class="md-date"><span class="md-date-m">—</span><span class="md-date-d">?</span><span class="md-date-w">a definir</span></div>';
    const mes = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const semana = data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return '<div class="md-date"><span class="md-date-m">' + mes + '</span><span class="md-date-d">' + String(data.getDate()).padStart(2, '0') + '</span><span class="md-date-w">' + semana + '</span></div>';
}
function mdHora(data) { return data && !isNaN(data) ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''; }
function mdIniciais(nome) { return String(nome || '?').trim().split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join('').toUpperCase(); }
function mdMembrosMidia() { return (membersData || []).filter(function (m) { return m.department === 'midia'; }); }

/* ---------- Resumo no topo ---------- */
function mdEquipAtencao(eq) {
    const tom = mdTomStatus(eq.status);
    const rev = mdRevisao(eq);
    return tom !== 'ok' || rev.tom === 'danger';
}

function renderMidiaOverview() {
    const alvo = document.getElementById('midia-overview');
    if (!alvo) return;
    const agora = mdInicioDoDia(new Date());
    const futuras = (mediaRosterData || []).filter(function (r) { return r.dateTime && new Date(r.dateTime) >= agora; })
        .sort(function (a, b) { return new Date(a.dateTime) - new Date(b.dateTime); });
    const prox = futuras[0];
    const em30 = futuras.filter(function (r) { return mdDiasAte(new Date(r.dateTime)) <= 30; }).length;
    const atencao = (equipmentData || []).filter(mdEquipAtencao).length;
    const equipe = mdMembrosMidia().length;
    const tiles = [
        { icone: 'calendar-clock', tom: 'indigo', valor: prox ? mdQuando(new Date(prox.dateTime)) : '—', rotulo: 'Próxima escala', dica: prox ? (prox.service || 'Culto') + ' · ' + mdHora(new Date(prox.dateTime)) : 'Nenhuma escala futura', aba: 'roster' },
        { icone: 'calendar-check', tom: 'violet', valor: String(em30), rotulo: 'Escalas em 30 dias', dica: futuras.length + ' no total', aba: 'roster' },
        { icone: 'wrench', tom: atencao ? 'amber' : 'emerald', valor: String(atencao), rotulo: 'Equipamentos com atenção', dica: atencao ? 'Manutenção ou revisão pendente' : 'Tudo operacional', aba: 'equipment' },
        { icone: 'users-round', tom: 'sky', valor: String(equipe), rotulo: 'Pessoas na equipe', dica: 'Mídia & Transmissão', aba: 'team' }
    ];
    alvo.innerHTML = tiles.map(function (t) {
        return '<button type="button" onclick="switchMidiaTab(\'' + t.aba + '\')" class="md-tile md-tone-' + t.tom + ' text-left">' +
            '<span class="md-tile-icon">' + mdIcone(t.icone, 'w-5 h-5') + '</span>' +
            '<span class="md-tile-value">' + mdEsc(t.valor) + '</span>' +
            '<span class="md-tile-label">' + mdEsc(t.rotulo) + '</span>' +
            '<span class="md-tile-hint">' + mdEsc(t.dica) + '</span></button>';
    }).join('');
    mdIcones();
}

/* ---------- Escalas ---------- */
let mdRespostas = {};      // rosterId -> { memberId: status }
let mdMinhasRespostas = {}; // rosterId -> status do usuário atual
let mdCarregandoRespostas = false;

const MD_STATUS_PESSOA = {
    confirmed: { rotulo: 'Confirmado', classe: 'md-pill-ok', icone: 'circle-check' },
    declined: { rotulo: 'Não poderá', classe: 'md-pill-danger', icone: 'circle-x' },
    swap: { rotulo: 'Pediu troca', classe: 'md-pill-warn', icone: 'repeat-2' },
    'swap-approved': { rotulo: 'Troca aprovada', classe: 'md-pill-info', icone: 'repeat-2' },
    pending: { rotulo: 'Aguardando', classe: 'md-pill-muted', icone: 'hourglass' }
};

async function mdCarregarRespostas(escalas) {
    if (!db || mdCarregandoRespostas) return;
    mdCarregandoRespostas = true;
    try {
        await Promise.all(escalas.map(async function (r) {
            try {
                const snap = await db.collection('rosters').doc(String(r.id)).collection('responses').get();
                const mapa = {};
                snap.docs.forEach(function (doc) {
                    const d = doc.data() || {};
                    const status = d.attendance || d.status;
                    if (!status) return;
                    let memberId = d.memberId;
                    if (!memberId) {
                        const m = (membersData || []).find(function (x) { return x.accountUid === doc.id; });
                        memberId = m ? String(m.id) : doc.id;
                    }
                    mapa[String(memberId)] = status;
                    if (currentUser && doc.id === currentUser.uid) mdMinhasRespostas[String(r.id)] = status;
                });
                mdRespostas[String(r.id)] = mapa;
            } catch (e) { /* sem permissão ou offline: mantém "Aguardando" */ }
        }));
    } finally {
        mdCarregandoRespostas = false;
    }
}

function mdCartaoEscala(r) {
    const data = r.dateTime ? new Date(r.dateTime) : null;
    const id = String(r.id);
    const idJs = JSON.stringify(r.id).replace(/'/g, '&#39;');
    const respostas = mdRespostas[id] || {};
    const escalados = (membersData || []).filter(function (m) { return (r.memberIds || []).map(String).indexOf(String(m.id)) !== -1; });
    const confirmados = escalados.filter(function (m) { return respostas[String(m.id)] === 'confirmed'; }).length;
    const meuId = typeof currentRosterMemberId === 'function' ? currentRosterMemberId() : '';
    const souEscalado = (r.memberIds || []).map(String).indexOf(String(meuId)) !== -1;
    const minha = mdMinhasRespostas[id];
    const lider = mdLider();
    const hoje = data && mdDiasAte(data) === 0;

    const pessoas = escalados.length ? escalados.map(function (m) {
        const st = MD_STATUS_PESSOA[respostas[String(m.id)]] || MD_STATUS_PESSOA.pending;
        return '<li class="md-person"><span class="md-avatar">' + mdEsc(mdIniciais(m.name)) + '</span><span class="md-person-main"><b>' + mdEsc(m.name) + '</b><small>' + mdEsc(m.role || m.churchRole || 'Integrante') + '</small></span><span class="md-pill ' + st.classe + '">' + mdIcone(st.icone, 'w-3.5 h-3.5') + st.rotulo + '</span></li>';
    }).join('') : '<li class="text-sm text-slate-500">Ninguém escalado ainda.</li>';

    let acoes = '';
    if (souEscalado) {
        acoes += '<button onclick=\'mdResponder(' + idJs + ', "confirmed")\' class="md-btn ' + (minha === 'confirmed' ? 'md-btn-ok-solid' : 'md-btn-ok') + '">' + mdIcone('circle-check') + (minha === 'confirmed' ? 'Presença confirmada' : 'Confirmo presença') + '</button>';
        acoes += '<button onclick=\'mdResponder(' + idJs + ', "declined")\' class="md-btn ' + (minha === 'declined' ? 'md-btn-danger-solid' : 'md-btn-danger') + '">' + mdIcone('circle-x') + 'Não poderei</button>';
    }
    if (lider) {
        if ((r.memberIds || []).length) acoes += '<button onclick=\'notifyRosterMembers(' + idJs + ')\' class="md-btn md-btn-ghost">' + mdIcone('send') + 'WhatsApp escalados</button>';
        acoes += '<button onclick=\'openWhatsappGroup(' + idJs + ')\' class="md-btn md-btn-ghost">' + mdIcone('message-circle') + 'Grupo</button>';
        acoes += '<span class="flex-1"></span>';
        acoes += '<button onclick=\'editRoster(' + idJs + ')\' class="md-icon-btn" title="Editar escala" aria-label="Editar escala">' + mdIcone('pencil') + '</button>';
        acoes += '<button onclick=\'deleteRoster(' + idJs + ')\' class="md-icon-btn md-icon-danger" title="Excluir escala" aria-label="Excluir escala">' + mdIcone('trash-2') + '</button>';
    }

    return '<article class="md-card' + (hoje ? ' md-card-today' : '') + '">' +
        '<div class="flex gap-4">' + mdBlocoData(data) +
        '<div class="flex-1 min-w-0">' +
            '<div class="flex flex-wrap items-center gap-2"><h3 class="text-base font-bold text-white">' + mdEsc(r.service || 'Culto') + '</h3>' + (data ? '<span class="md-chip' + (hoje ? ' md-chip-live' : '') + '">' + mdQuando(data) + '</span>' : '') + '</div>' +
            '<p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">' + (data ? '<span class="inline-flex items-center gap-1">' + mdIcone('clock-3', 'w-3.5 h-3.5') + mdHora(data) + '</span>' : '') +
            '<span class="inline-flex items-center gap-1">' + mdIcone('users', 'w-3.5 h-3.5') + escalados.length + (escalados.length === 1 ? ' escalado' : ' escalados') + '</span>' +
            '<span class="inline-flex items-center gap-1">' + mdIcone('user-check', 'w-3.5 h-3.5') + confirmados + ' de ' + escalados.length + ' confirmados</span></p>' +
            (r.reminder ? '<p class="md-note">' + mdIcone('triangle-alert', 'w-3.5 h-3.5 shrink-0 mt-0.5') + '<span>' + mdEsc(r.reminder) + '</span></p>' : '') +
        '</div></div>' +
        '<ul class="md-people">' + pessoas + '</ul>' +
        (acoes ? '<div class="md-actions">' + acoes + '</div>' : '') +
        '</article>';
}

function renderMediaRoster() {
    const container = document.getElementById('media-roster-container');
    const passadasEl = document.getElementById('media-roster-past');
    if (!container) return;
    const hoje = mdInicioDoDia(new Date());
    const lista = (mediaRosterData || []).slice();
    const futuras = lista.filter(function (r) { return !r.dateTime || new Date(r.dateTime) >= hoje; })
        .sort(function (a, b) { return new Date(a.dateTime || 8.64e15) - new Date(b.dateTime || 8.64e15); });
    const passadas = lista.filter(function (r) { return r.dateTime && new Date(r.dateTime) < hoje; })
        .sort(function (a, b) { return new Date(b.dateTime) - new Date(a.dateTime); });

    container.innerHTML = futuras.length ? futuras.map(mdCartaoEscala).join('') :
        '<div class="md-empty">' + mdIcone('calendar-plus', 'w-9 h-9 text-indigo-400/60 mx-auto mb-2') + '<p class="font-semibold text-white">Nenhuma escala futura</p><p class="text-sm text-slate-400 mt-1">' + (mdLider() ? 'Crie a próxima escala da equipe de mídia.' : 'Quando a liderança publicar a escala, ela aparece aqui.') + '</p>' + (mdLider() ? '<button onclick="openNewMediaModal()" class="md-btn md-btn-primary mx-auto mt-4">' + mdIcone('plus') + 'Nova escala</button>' : '') + '</div>';

    if (passadasEl) {
        passadasEl.innerHTML = passadas.length ? '<details class="md-past"><summary>' + mdIcone('chevron-down', 'w-4 h-4 md-past-chev') + 'Escalas anteriores <span class="text-slate-500">(' + passadas.length + ')</span></summary><ul>' +
            passadas.slice(0, 12).map(function (r) {
                const d = new Date(r.dateTime);
                const nomes = (membersData || []).filter(function (m) { return (r.memberIds || []).map(String).indexOf(String(m.id)) !== -1; }).map(function (m) { return m.name.split(' ')[0]; });
                return '<li><span class="text-slate-400 w-24 shrink-0">' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + '</span><b class="text-slate-200">' + mdEsc(r.service || 'Culto') + '</b><span class="text-slate-500 truncate">' + mdEsc(nomes.join(', ') || 'Sem equipe') + '</span></li>';
            }).join('') + '</ul></details>' : '';
    }
    renderMidiaOverview();
    mdIcones();

    // Carrega confirmações e redesenha uma vez.
    const alvo = futuras.slice(0, 12);
    if (alvo.length && !mdCarregandoRespostas) {
        const antes = JSON.stringify(mdRespostas);
        mdCarregarRespostas(alvo).then(function () {
            if (JSON.stringify(mdRespostas) !== antes) {
                container.innerHTML = futuras.map(mdCartaoEscala).join('');
                mdIcones();
            }
        });
    }
}

async function mdResponder(rosterId, status) {
    await respondRosterPresence(rosterId, status);
    mdMinhasRespostas[String(rosterId)] = status;
    const r = (mediaRosterData || []).find(function (x) { return String(x.id) === String(rosterId); });
    if (r) await mdCarregarRespostas([r]);
    renderMediaRoster();
}

function toggleMediaConfirm() { /* substituído pela confirmação por pessoa (mdResponder) */ }

async function openNewMediaModal() {
    await openRosterEditor('midia');
    const lembrete = document.getElementById('roster-reminder');
    if (lembrete && /Ensaie as músicas/.test(lembrete.value)) lembrete.value = 'Chegue 1h antes para testar som, câmeras, projeção e transmissão.';
}

/* ---------- Equipamentos ---------- */
const MD_CATEGORIA_ICONE = { 'Áudio': 'mic', 'Vídeo': 'video', 'Projeção': 'projector', 'Iluminação': 'lightbulb', 'Geral': 'package' };
let mdFiltroEquip = 'todos';

function mdTomStatus(status) {
    const s = String(status || 'Operacional').toLowerCase();
    if (s.indexOf('indispon') !== -1 || s.indexOf('defeito') !== -1 || s.indexOf('fora') !== -1) return 'danger';
    if (s.indexOf('manuten') !== -1 || s.indexOf('precisa') !== -1) return 'warn';
    return 'ok';
}

function mdRevisao(eq) {
    if (!eq.nextMaintenance) return { tom: 'muted', texto: 'Revisão não agendada' };
    const data = new Date(eq.nextMaintenance + 'T12:00:00');
    const dias = mdDiasAte(data);
    const dataTxt = data.toLocaleDateString('pt-BR');
    if (dias < 0) return { tom: 'danger', texto: 'Revisão atrasada desde ' + dataTxt };
    if (dias <= 7) return { tom: 'warn', texto: 'Revisão ' + (dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : 'em ' + dias + ' dias') + ' (' + dataTxt + ')' };
    return { tom: 'muted', texto: 'Próxima revisão: ' + dataTxt };
}

function mdFiltrarEquip(filtro) { mdFiltroEquip = filtro; renderEquipment(); }

function renderEquipment() {
    const container = document.getElementById('equipment-grid');
    if (!container) return;
    const itens = (equipmentData || []).slice();
    const categorias = [];
    itens.forEach(function (e) { const c = e.category || 'Geral'; if (categorias.indexOf(c) === -1) categorias.push(c); });
    const comAtencao = itens.filter(mdEquipAtencao);

    const filtrosEl = document.getElementById('equipment-filters');
    if (filtrosEl) {
        const chips = [['todos', 'Todos', itens.length], ['atencao', 'Com atenção', comAtencao.length]].concat(categorias.map(function (c) { return [c, c, itens.filter(function (e) { return (e.category || 'Geral') === c; }).length]; }));
        filtrosEl.innerHTML = chips.map(function (c) {
            return '<button type="button" onclick=\'mdFiltrarEquip(' + JSON.stringify(c[0]).replace(/'/g, '&#39;') + ')\' class="md-filter' + (mdFiltroEquip === c[0] ? ' is-active' : '') + (c[0] === 'atencao' && c[2] ? ' md-filter-warn' : '') + '">' + mdEsc(c[1]) + '<b>' + c[2] + '</b></button>';
        }).join('');
    }

    let visiveis = itens;
    if (mdFiltroEquip === 'atencao') visiveis = comAtencao;
    else if (mdFiltroEquip !== 'todos') visiveis = itens.filter(function (e) { return (e.category || 'Geral') === mdFiltroEquip; });
    visiveis.sort(function (a, b) {
        const pa = mdEquipAtencao(a) ? 0 : 1, pb = mdEquipAtencao(b) ? 0 : 1;
        return pa - pb || String(a.name).localeCompare(String(b.name), 'pt-BR');
    });

    if (!visiveis.length) {
        container.innerHTML = '<div class="md-empty sm:col-span-2 lg:col-span-3">' + mdIcone('package', 'w-9 h-9 text-indigo-400/60 mx-auto mb-2') + '<p class="font-semibold text-white">' + (itens.length ? 'Nenhum item neste filtro' : 'Nenhum equipamento cadastrado') + '</p>' + (!itens.length && mdLider() ? '<button onclick="openNewEquipmentModal()" class="md-btn md-btn-primary mx-auto mt-4">' + mdIcone('plus') + 'Cadastrar equipamento</button>' : '') + '</div>';
        mdIcones();
        renderMidiaOverview();
        return;
    }

    container.innerHTML = visiveis.map(function (eq) {
        const tom = mdTomStatus(eq.status);
        const rev = mdRevisao(eq);
        const idJs = JSON.stringify(eq.id).replace(/'/g, '&#39;');
        return '<article class="md-card md-equip md-equip-' + tom + '">' +
            '<div class="flex items-start gap-3"><span class="md-equip-icon">' + mdIcone(MD_CATEGORIA_ICONE[eq.category] || 'package', 'w-5 h-5') + '</span>' +
            '<div class="flex-1 min-w-0"><h4 class="text-sm font-bold text-white leading-snug">' + mdEsc(eq.name) + '</h4><p class="text-xs text-slate-500">' + mdEsc(eq.category || 'Geral') + '</p></div>' +
            '<span class="md-pill md-pill-' + (tom === 'ok' ? 'ok' : tom === 'warn' ? 'warn' : 'danger') + '">' + mdEsc(eq.status || 'Operacional') + '</span></div>' +
            '<p class="md-rev md-rev-' + rev.tom + '">' + mdIcone(rev.tom === 'danger' ? 'triangle-alert' : 'calendar-clock', 'w-3.5 h-3.5 shrink-0') + mdEsc(rev.texto) + '</p>' +
            (eq.notes ? '<p class="md-equip-notes">' + mdEsc(eq.notes) + '</p>' : '') +
            (mdLider() ? '<button onclick=\'editEquipment(' + idJs + ')\' class="md-btn md-btn-ghost w-full mt-3">' + mdIcone('wrench') + 'Atualizar estado e manutenção</button>' : '') +
            '</article>';
    }).join('');
    mdIcones();
    renderMidiaOverview();
}

/* ---------- Agenda compartilhada ---------- */
// Os eventos ficam no documento settings/agenda, visível para toda a equipe.
const MD_EVENTOS_EXEMPLO = ['Ensaio Geral do Louvor & Slides', 'Treinamento Técnico de Som & Transmissão'];
let mdAgendaRemota = false;
let mdAgendaUnsub = null;

function mdEventosLocaisReais() {
    try {
        const locais = JSON.parse(localStorage.getItem('cep_events') || '[]');
        return locais.filter(function (e) { return MD_EVENTOS_EXEMPLO.indexOf(e.title) === -1; });
    } catch (e) { return []; }
}

function mdAssinarAgenda() {
    if (!db || mdAgendaUnsub) return;
    eventsData = mdEventosLocaisReais();
    renderEvents();
    mdAgendaUnsub = db.collection('settings').doc('agenda').onSnapshot(function (doc) {
        mdAgendaRemota = true;
        const remotos = doc.exists && Array.isArray(doc.data().itens) ? doc.data().itens : [];
        const locais = mdEventosLocaisReais();
        if (!doc.exists && locais.length && mdLider()) {
            db.collection('settings').doc('agenda').set({ itens: locais, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
                .then(function () { localStorage.removeItem('cep_events'); })
                .catch(function () {});
        }
        eventsData = remotos.length ? remotos : locais;
        renderEvents();
    }, function () {
        mdAgendaRemota = false;
        eventsData = mdEventosLocaisReais();
        renderEvents();
    });
}

if (typeof subscribeSharedData === 'function') {
    const mdSubscribeOriginal = subscribeSharedData;
    subscribeSharedData = function () {
        mdSubscribeOriginal.apply(this, arguments);
        mdAssinarAgenda();
    };
}

function mdDataEvento(ev) {
    if (ev.dateTime) { const d = new Date(ev.dateTime); if (!isNaN(d)) return d; }
    return null;
}

function mdCartaoEvento(ev, passado) {
    const data = mdDataEvento(ev);
    const idJs = JSON.stringify(ev.id).replace(/'/g, '&#39;');
    const depto = ev.department === 'midia' ? 'Mídia' : ev.department === 'louvor' ? 'Louvor' : 'Todos';
    return '<article class="md-card' + (passado ? ' opacity-70' : '') + '"><div class="flex gap-4">' + mdBlocoData(data) +
        '<div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-2"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="text-base font-bold text-white">' + mdEsc(ev.title) + '</h3><span class="md-chip">' + depto + '</span></div>' +
        '<p class="mt-1 text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">' + (data ? '<span class="inline-flex items-center gap-1">' + mdIcone('clock-3', 'w-3.5 h-3.5') + mdHora(data) + '</span><span>' + mdQuando(data) + '</span>' : '<span>' + mdEsc(ev.date || 'Data a definir') + '</span>') + '</p></div>' +
        (mdLider() ? '<button onclick=\'deleteEvent(' + idJs + ')\' class="md-icon-btn md-icon-danger shrink-0" title="Excluir evento" aria-label="Excluir evento">' + mdIcone('trash-2') + '</button>' : '') + '</div>' +
        (ev.desc ? '<p class="mt-2 text-sm text-slate-300">' + mdEsc(ev.desc) + '</p>' : '') + '</div></div></article>';
}

function renderEvents() {
    const hoje = mdInicioDoDia(new Date());
    const todos = (eventsData || []).slice();
    const futuros = todos.filter(function (e) { const d = mdDataEvento(e); return !d || d >= hoje; })
        .sort(function (a, b) { return (mdDataEvento(a) || 8.64e15) - (mdDataEvento(b) || 8.64e15); });
    const passados = todos.filter(function (e) { const d = mdDataEvento(e); return d && d < hoje; })
        .sort(function (a, b) { return mdDataEvento(b) - mdDataEvento(a); });
    [['events-grid', 'louvor'], ['events-grid-midia', 'midia']].forEach(function (par) {
        const el = document.getElementById(par[0]);
        if (!el) return;
        const filtrar = function (e) { return !e.department || e.department === 'todos' || e.department === par[1]; };
        const f = futuros.filter(filtrar), p = passados.filter(filtrar);
        el.innerHTML = (f.length ? f.map(function (e) { return mdCartaoEvento(e, false); }).join('') :
            '<div class="md-empty md:col-span-2">' + mdIcone('calendar', 'w-9 h-9 text-indigo-400/60 mx-auto mb-2') + '<p class="font-semibold text-white">Nenhum evento marcado</p><p class="text-sm text-slate-400 mt-1">Treinamentos, ensaios e transmissões especiais aparecem aqui.</p></div>') +
            (p.length ? '<details class="md-past md:col-span-2"><summary>' + mdIcone('chevron-down', 'w-4 h-4 md-past-chev') + 'Eventos anteriores <span class="text-slate-500">(' + p.length + ')</span></summary><div class="grid gap-3 mt-3 md:grid-cols-2">' + p.slice(0, 10).map(function (e) { return mdCartaoEvento(e, true); }).join('') + '</div></details>' : '');
    });
    mdIcones();
}

async function mdSalvarAgenda(lista) {
    eventsData = lista;
    renderEvents();
    try {
        if (!db) throw new Error('offline');
        await db.collection('settings').doc('agenda').set({ itens: lista, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return true;
    } catch (e) {
        localStorage.setItem('cep_events', JSON.stringify(lista));
        portalToast('A agenda foi salva só neste aparelho. Para toda a equipe ver, é preciso liberar a gravação de "settings/agenda" nas regras do Firebase.', 'error');
        return false;
    }
}

async function openNewEventModal() {
    if (!mdLider()) return portalToast('Apenas a liderança pode adicionar eventos.', 'error');
    const padrao = currentDepartment === 'midia' ? 'midia' : 'louvor';
    const values = await openPortalForm({
        title: 'Novo evento', subtitle: 'Treinamento, ensaio, transmissão especial ou manutenção.', submitLabel: 'Adicionar evento',
        fields: [
            { name: 'title', label: 'Título', placeholder: 'Ex.: Treinamento da mesa de som', required: true },
            { name: 'dateTime', label: 'Data e horário', type: 'datetime-local', required: true },
            { name: 'department', label: 'Para quem', type: 'select', value: padrao, options: [{ value: 'midia', label: 'Equipe de Mídia' }, { value: 'louvor', label: 'Equipe de Louvor' }, { value: 'todos', label: 'Todos os ministérios' }] },
            { name: 'desc', label: 'Detalhes', type: 'textarea', rows: 3, placeholder: 'Local, o que levar, quem conduz...' }
        ]
    });
    if (!values || !values.title || !values.title.trim() || !values.dateTime) return;
    const novo = { id: Date.now(), title: values.title.trim(), dateTime: values.dateTime, department: values.department || padrao, desc: (values.desc || '').trim() };
    const ok = await mdSalvarAgenda((eventsData || []).concat([novo]));
    if (ok) portalToast('Evento adicionado à agenda.', 'success');
}

async function deleteEvent(id) {
    if (!mdLider()) return;
    if (!(await portalConfirm('Deseja excluir este evento?', { danger: true, confirmText: 'Excluir evento' }))) return;
    await mdSalvarAgenda((eventsData || []).filter(function (e) { return String(e.id) !== String(id); }));
}

/* ---------- Minha próxima escala (versão da Mídia) ---------- */
if (typeof renderMyNextRoster === 'function') {
    const mdNextOriginal = renderMyNextRoster;
    renderMyNextRoster = async function (allRosters) {
        const container = document.getElementById('my-next-roster');
        if (!container || !currentUser) return;
        const memberId = currentRosterMemberId();
        const agora = new Date();
        const next = (allRosters || []).filter(function (r) { return (r.memberIds || []).map(String).indexOf(String(memberId)) !== -1 && new Date(r.dateTime) >= agora; })
            .sort(function (a, b) { return new Date(a.dateTime) - new Date(b.dateTime); })[0];
        if (!next || next.department !== 'midia') return mdNextOriginal(allRosters);
        let resposta = {};
        try { const doc = await db.collection('rosters').doc(String(next.id)).collection('responses').doc(currentUser.uid).get(); resposta = doc.exists ? doc.data() : {}; } catch (e) {}
        const data = new Date(next.dateTime);
        const eu = (membersData || []).find(function (m) { return String(m.id) === String(memberId); });
        const colegas = (membersData || []).filter(function (m) { return (next.memberIds || []).map(String).indexOf(String(m.id)) !== -1 && String(m.id) !== String(memberId); });
        const idJs = JSON.stringify(next.id).replace(/'/g, '&#39;');
        const st = resposta.attendance;
        container.innerHTML = '<div class="grid sm:grid-cols-[1fr_auto] gap-4"><div class="flex gap-4">' + mdBlocoData(data) + '<div class="min-w-0">' +
            '<div class="flex flex-wrap items-center gap-2"><span class="text-xs px-2 py-1 bg-indigo-500/15 border border-indigo-500/20 text-indigo-200 rounded-full">' + mdEsc(next.service) + '</span><span class="md-chip">' + mdQuando(data) + '</span></div>' +
            '<h3 class="text-lg font-bold text-white mt-2">' + mdHora(data) + (eu && eu.role ? ' · ' + mdEsc(eu.role) : '') + '</h3>' +
            '<p class="text-xs text-slate-400 mt-1">' + (colegas.length ? 'Com: ' + colegas.map(function (m) { return mdEsc(m.name.split(' ')[0]) + (m.role ? ' (' + mdEsc(m.role) + ')' : ''); }).join(', ') : 'Só você nesta escala.') + '</p>' +
            (next.reminder ? '<p class="text-xs text-amber-300 mt-2">' + mdEsc(next.reminder) + '</p>' : '') + '</div></div>' +
            '<div class="flex sm:flex-col gap-2 flex-wrap">' +
            '<button onclick=\'updateRosterResponse(' + idJs + ', "attendance", "confirmed")\' class="md-btn ' + (st === 'confirmed' ? 'md-btn-ok-solid' : 'md-btn-ok') + '">' + mdIcone('circle-check') + (st === 'confirmed' ? 'Confirmado' : 'Confirmar') + '</button>' +
            '<button onclick=\'updateRosterResponse(' + idJs + ', "attendance", "swap")\' class="md-btn ' + (st === 'swap' ? 'md-btn-warn-solid' : 'md-btn-warn') + '">' + mdIcone('repeat-2') + 'Pedir troca</button>' +
            '</div></div>';
        mdIcones();
    };
}

/* ---------- Troca de aba da Mídia ---------- */
if (typeof switchMidiaTab === 'function') {
    const mdSwitchOriginal = switchMidiaTab;
    switchMidiaTab = function (tabId) {
        mdSwitchOriginal(tabId);
        document.querySelectorAll('.midia-tab-btn').forEach(function (b) { b.classList.remove('is-active'); });
        const ativo = document.getElementById('midia-tab-btn-' + tabId);
        if (ativo) ativo.classList.add('is-active');
        renderMidiaOverview();
    };
}
