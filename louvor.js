/* =========================================================
   Portal CEP Pirapozinho · Área do Louvor (versão 2)
   Carregado depois de midia.js. Deixa o Louvor no mesmo padrão
   da Mídia: resumo, escalas com confirmação por pessoa e
   repertório, busca de músicas, histórico e equipe.
   ========================================================= */

/* ---------- Utilidades ---------- */
function lvIdJs(id) { return JSON.stringify(id).replace(/'/g, '&#39;'); }
function lvEhLouvor(r) { return r && r.department !== 'midia'; }
function lvMembrosLouvor() { return (membersData || []).filter(function (m) { return m.department !== 'midia'; }); }
function lvMusica(id) { return (songsData || []).find(function (s) { return String(s.id) === String(id); }); }
function lvTom(song) { return song ? (song.currentKey || song.originalKey || '') : ''; }
function lvFuturas(lista) {
    const hoje = mdInicioDoDia(new Date());
    return (lista || []).filter(function (r) { return !r.dateTime || new Date(r.dateTime) >= hoje; })
        .sort(function (a, b) { return new Date(a.dateTime || 8.64e15) - new Date(b.dateTime || 8.64e15); });
}
function lvPassadas(lista) {
    const hoje = mdInicioDoDia(new Date());
    return (lista || []).filter(function (r) { return r.dateTime && new Date(r.dateTime) < hoje; })
        .sort(function (a, b) { return new Date(b.dateTime) - new Date(a.dateTime); });
}

/* ---------- Resumo no topo ---------- */
function renderLouvorOverview() {
    const alvo = document.getElementById('louvor-overview');
    if (!alvo) return;
    const futuras = lvFuturas(rosterData).filter(function (r) { return r.dateTime; });
    const prox = futuras[0];
    const em30 = futuras.filter(function (r) { return mdDiasAte(new Date(r.dateTime)) <= 30; }).length;
    const musicas = (songsData || []).length;
    const favoritas = (songsData || []).filter(function (s) { return favoriteSongIds && favoriteSongIds.has(String(s.id)); }).length;
    const equipe = lvMembrosLouvor().length;
    const tiles = [
        { icone: 'calendar-clock', tom: 'indigo', valor: prox ? mdQuando(new Date(prox.dateTime)) : '—', rotulo: 'Próxima escala', dica: prox ? (prox.service || 'Culto') + ' · ' + mdHora(new Date(prox.dateTime)) : 'Nenhuma escala futura', aba: 'roster' },
        { icone: 'calendar-check', tom: 'violet', valor: String(em30), rotulo: 'Escalas em 30 dias', dica: futuras.length + ' no total', aba: 'roster' },
        { icone: 'music', tom: 'emerald', valor: String(musicas), rotulo: 'Músicas no repertório', dica: favoritas ? favoritas + (favoritas === 1 ? ' favorita sua' : ' favoritas suas') : 'Toque na estrela para favoritar', aba: 'repertoire' },
        { icone: 'users-round', tom: 'sky', valor: String(equipe), rotulo: 'Pessoas na equipe', dica: 'Louvor & Projeção', aba: 'team' }
    ];
    alvo.innerHTML = tiles.map(function (t) {
        return '<button type="button" onclick="switchTab(\'' + t.aba + '\')" class="md-tile md-tone-' + t.tom + ' text-left">' +
            '<span class="md-tile-icon">' + mdIcone(t.icone, 'w-5 h-5') + '</span>' +
            '<span class="md-tile-value">' + mdEsc(t.valor) + '</span>' +
            '<span class="md-tile-label">' + mdEsc(t.rotulo) + '</span>' +
            '<span class="md-tile-hint">' + mdEsc(t.dica) + '</span></button>';
    }).join('');
    mdIcones();
}

/* ---------- Confirmações (carregamento próprio do Louvor) ---------- */
const lvCarregando = {};
async function lvCarregarRespostas(escalas) {
    if (!db) return;
    await Promise.all(escalas.map(async function (r) {
        const id = String(r.id);
        if (lvCarregando[id]) return;
        lvCarregando[id] = true;
        try {
            const snap = await db.collection('rosters').doc(id).collection('responses').get();
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
                if (currentUser && doc.id === currentUser.uid) mdMinhasRespostas[id] = status;
            });
            mdRespostas[id] = mapa;
        } catch (e) { /* sem permissão ou offline */ }
        finally { lvCarregando[id] = false; }
    }));
}

/* ---------- Escalas do Louvor ---------- */
function lvSetlist(r) {
    const musicas = (r.songIds || []).map(lvMusica).filter(Boolean);
    if (!musicas.length) return '<p class="lv-setlist-empty">' + mdIcone('music', 'w-3.5 h-3.5') + 'Repertório ainda não definido.</p>';
    return '<ol class="lv-setlist">' + musicas.map(function (s, i) {
        const momento = (r.songSections && r.songSections[s.id]) || '';
        return '<li><span class="lv-setlist-n">' + (i + 1) + '</span>' +
            '<button type="button" onclick=\'lvAbrirMusica(' + lvIdJs(s.id) + ')\' class="lv-setlist-title" title="Abrir cifra">' + mdEsc(s.title) + '</button>' +
            (momento ? '<span class="lv-tag">' + mdEsc(momento) + '</span>' : '') +
            (lvTom(s) ? '<span class="lv-key">' + mdEsc(lvTom(s)) + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
}

function lvCartaoEscala(r) {
    const data = r.dateTime ? new Date(r.dateTime) : null;
    const id = String(r.id);
    const idJs = lvIdJs(r.id);
    const respostas = mdRespostas[id] || {};
    const escalados = (membersData || []).filter(function (m) { return (r.memberIds || []).map(String).indexOf(String(m.id)) !== -1; });
    const confirmados = escalados.filter(function (m) { return respostas[String(m.id)] === 'confirmed'; }).length;
    const meuId = typeof currentRosterMemberId === 'function' ? currentRosterMemberId() : '';
    const souEscalado = (r.memberIds || []).map(String).indexOf(String(meuId)) !== -1;
    const minha = mdMinhasRespostas[id];
    const lider = mdLider();
    const hoje = data && mdDiasAte(data) === 0;
    const temMusicas = (r.songIds || []).some(function (sid) { return !!lvMusica(sid); });

    const pessoas = escalados.length ? escalados.map(function (m) {
        const st = MD_STATUS_PESSOA[respostas[String(m.id)]] || MD_STATUS_PESSOA.pending;
        return '<li class="md-person"><span class="md-avatar lv-avatar">' + mdEsc(mdIniciais(m.name)) + '</span><span class="md-person-main"><b>' + mdEsc(m.name) + '</b><small>' + mdEsc(m.role || m.churchRole || 'Integrante') + '</small></span><span class="md-pill ' + st.classe + '">' + mdIcone(st.icone, 'w-3.5 h-3.5') + st.rotulo + '</span></li>';
    }).join('') : '<li class="text-sm text-slate-500">Ninguém escalado ainda.</li>';

    let acoes = '';
    if (souEscalado) {
        acoes += mdBotoesResposta(idJs, minha, 'lvResponder');
    }
    if (temMusicas) acoes += '<button onclick=\'lvEnsaiar(' + idJs + ')\' class="md-btn md-btn-ghost">' + mdIcone('play-circle') + 'Ensaiar</button>';
    if (temMusicas && typeof abrirTelao === 'function') acoes += '<button onclick=\'abrirTelao({ escala: ' + idJs + ' })\' class="md-btn md-btn-ghost">' + mdIcone('presentation') + 'Telão</button>';
    if (lider) {
        if ((r.memberIds || []).length) acoes += '<button onclick=\'notifyRosterMembers(' + idJs + ')\' class="md-btn md-btn-ghost">' + mdIcone('send') + 'WhatsApp</button>';
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
        '<div class="lv-block"><p class="lv-block-title">' + mdIcone('list-music', 'w-3.5 h-3.5') + 'Repertório</p>' + lvSetlist(r) + '</div>' +
        '<ul class="md-people">' + pessoas + '</ul>' +
        (acoes ? '<div class="md-actions">' + acoes + '</div>' : '') +
        '</article>';
}

function renderRoster() {
    const container = document.getElementById('roster-list-container');
    const passadasEl = document.getElementById('roster-list-past');
    if (!container) return;
    const lista = (rosterData || []).filter(lvEhLouvor);
    const futuras = lvFuturas(lista);
    const passadas = lvPassadas(lista);

    container.innerHTML = futuras.length ? futuras.map(lvCartaoEscala).join('') :
        '<div class="md-empty xl:col-span-2">' + mdIcone('calendar-plus', 'w-9 h-9 text-indigo-400/60 mx-auto mb-2') + '<p class="font-semibold text-white">Nenhuma escala futura</p><p class="text-sm text-slate-400 mt-1">' + (mdLider() ? 'Monte a próxima escala com a equipe e as músicas.' : 'Quando a liderança publicar a escala, ela aparece aqui.') + '</p>' + (mdLider() ? '<button onclick="openNewRosterModal(\'louvor\')" class="md-btn md-btn-primary mx-auto mt-4">' + mdIcone('plus') + 'Nova escala</button>' : '') + '</div>';

    if (passadasEl) {
        passadasEl.innerHTML = passadas.length ? '<details class="md-past"><summary>' + mdIcone('chevron-down', 'w-4 h-4 md-past-chev') + 'Escalas anteriores <span class="text-slate-500">(' + passadas.length + ')</span></summary><ul>' +
            passadas.slice(0, 12).map(function (r) {
                const d = new Date(r.dateTime);
                const musicas = (r.songIds || []).map(lvMusica).filter(Boolean).map(function (s) { return s.title; });
                return '<li><span class="text-slate-400 w-20 shrink-0">' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + '</span><b class="text-slate-200 shrink-0">' + mdEsc(r.service || 'Culto') + '</b><span class="text-slate-500 truncate">' + mdEsc(musicas.join(' · ') || 'Sem músicas') + '</span></li>';
            }).join('') + '</ul></details>' : '';
    }
    renderLouvorOverview();
    mdIcones();

    const alvo = futuras.slice(0, 12);
    if (alvo.length) {
        const antes = JSON.stringify(mdRespostas);
        lvCarregarRespostas(alvo).then(function () {
            if (JSON.stringify(mdRespostas) !== antes) {
                container.innerHTML = futuras.map(lvCartaoEscala).join('');
                mdIcones();
            }
        });
    }
}

async function lvResponder(rosterId, status) {
    await respondRosterPresence(rosterId, status);
    mdMinhasRespostas[String(rosterId)] = status;
    const r = (rosterData || []).find(function (x) { return String(x.id) === String(rosterId); });
    if (r) await lvCarregarRespostas([r]);
    renderRoster();
}

function lvAbrirMusica(id) {
    switchTab('repertoire');
    selectSong(id);
    setTimeout(function () {
        const alvo = document.getElementById('song-detail-view');
        if (alvo && window.innerWidth < 768) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
}

function lvEnsaiar(rosterId) {
    const r = (rosterData || []).find(function (x) { return String(x.id) === String(rosterId); });
    if (!r) return;
    const musicas = (r.songIds || []).map(lvMusica).filter(Boolean);
    if (!musicas.length) return portalToast('Esta escala ainda não tem músicas.', 'error');
    rehearsalRoster = r;
    rehearsalSongs = musicas;
    rehearsalIndex = 0;
    document.getElementById('rehearsal-roster-title').textContent = r.service || 'Ensaio';
    const modal = document.getElementById('rehearsal-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    renderRehearsalSong();
}

/* ---------- Minha próxima escala (versão do Louvor) ---------- */
if (typeof renderMyNextRoster === 'function') {
    const lvNextAnterior = renderMyNextRoster;
    renderMyNextRoster = async function (allRosters) {
        const container = document.getElementById('my-next-roster');
        if (!container || !currentUser) return;
        const memberId = currentRosterMemberId();
        const agora = new Date();
        const next = (allRosters || []).filter(function (r) { return (r.memberIds || []).map(String).indexOf(String(memberId)) !== -1 && new Date(r.dateTime) >= agora; })
            .sort(function (a, b) { return new Date(a.dateTime) - new Date(b.dateTime); })[0];
        if (!next || next.department === 'midia') return lvNextAnterior(allRosters);
        let resposta = {};
        try { const doc = await db.collection('rosters').doc(String(next.id)).collection('responses').doc(currentUser.uid).get(); resposta = doc.exists ? doc.data() : {}; } catch (e) {}
        const data = new Date(next.dateTime);
        const eu = (membersData || []).find(function (m) { return String(m.id) === String(memberId); });
        const musicas = (next.songIds || []).map(lvMusica).filter(Boolean);
        const idJs = lvIdJs(next.id);
        const st = resposta.attendance;
        container.innerHTML = '<div class="grid sm:grid-cols-[1fr_auto] gap-4"><div class="flex gap-4">' + mdBlocoData(data) + '<div class="min-w-0">' +
            '<div class="flex flex-wrap items-center gap-2">' + mdEtiquetaMinisterio(next) + '<span class="text-xs px-2 py-1 bg-indigo-500/15 border border-indigo-500/20 text-indigo-200 rounded-full">' + mdEsc(next.service) + '</span><span class="md-chip">' + mdQuando(data) + '</span></div>' +
            '<h3 class="text-lg font-bold text-white mt-2">' + mdHora(data) + (eu && eu.role ? ' · ' + mdEsc(eu.role) : '') + '</h3>' +
            (musicas.length ? '<div class="lv-mini-setlist">' + musicas.map(function (s) { return '<button type="button" onclick=\'lvAbrirMusica(' + lvIdJs(s.id) + ')\'>' + mdEsc(s.title) + (lvTom(s) ? ' <b>' + mdEsc(lvTom(s)) + '</b>' : '') + '</button>'; }).join('') + '</div>' : '<p class="text-xs text-slate-400 mt-1">Músicas ainda não definidas.</p>') +
            (next.reminder ? '<p class="text-xs text-amber-300 mt-2">' + mdEsc(next.reminder) + '</p>' : '') + '</div></div>' +
            '<div class="flex sm:flex-col gap-2 flex-wrap">' +
            mdBotoesResposta(idJs, st, 'mdResponderInicio') +
            (musicas.length ? '<button onclick=\'lvEnsaiar(' + idJs + ')\' class="md-btn md-btn-ghost">' + mdIcone('play-circle') + 'Ensaiar</button>' : '') +
            '</div></div>';
        mdIcones();
    };
}

/* ---------- Repertório: busca, filtros e lista ---------- */
let lvBusca = '';
let lvFiltroMusica = 'todas';

function lvNormalizar(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

function lvMusicasVisiveis() {
    const termo = lvNormalizar(lvBusca.trim());
    return (songsData || []).filter(function (s) {
        if (lvFiltroMusica === 'favoritas' && !(favoriteSongIds && favoriteSongIds.has(String(s.id)))) return false;
        if (lvFiltroMusica === 'pdf' && s.type !== 'pdf') return false;
        if (lvFiltroMusica === 'texto' && s.type === 'pdf') return false;
        return !termo || lvNormalizar(s.title).indexOf(termo) !== -1;
    }).sort(function (a, b) { return String(a.title).localeCompare(String(b.title), 'pt-BR'); });
}

function lvBuscarMusica(valor) { lvBusca = valor || ''; lvDesenharListaMusicas(); }
function lvFiltrarMusicas(filtro) { lvFiltroMusica = filtro; lvDesenharListaMusicas(); }

function lvDesenharListaMusicas() {
    const container = document.getElementById('songs-list-container');
    if (!container) return;
    const todas = songsData || [];
    const favs = todas.filter(function (s) { return favoriteSongIds && favoriteSongIds.has(String(s.id)); }).length;
    const pdfs = todas.filter(function (s) { return s.type === 'pdf'; }).length;
    const filtrosEl = document.getElementById('lv-song-filters');
    if (filtrosEl) {
        filtrosEl.innerHTML = [['todas', 'Todas', todas.length], ['favoritas', 'Favoritas', favs], ['texto', 'Digitadas', todas.length - pdfs], ['pdf', 'PDF', pdfs]].map(function (f) {
            return '<button type="button" onclick="lvFiltrarMusicas(\'' + f[0] + '\')" class="md-filter' + (lvFiltroMusica === f[0] ? ' is-active' : '') + '">' + f[1] + '<b>' + f[2] + '</b></button>';
        }).join('');
    }
    const lista = lvMusicasVisiveis();
    if (!lista.length) {
        container.innerHTML = '<div class="md-empty">' + mdIcone(todas.length ? 'search-x' : 'music', 'w-8 h-8 text-indigo-400/60 mx-auto mb-2') + '<p class="font-semibold text-white text-sm">' + (todas.length ? 'Nenhuma música encontrada' : 'Repertório vazio') + '</p><p class="text-xs text-slate-400 mt-1">' + (todas.length ? 'Tente outro nome ou filtro.' : 'Envie um PDF ou digite a primeira cifra.') + '</p></div>';
        mdIcones();
        return;
    }
    container.innerHTML = lista.map(function (s) {
        const sel = String(s.id) === String(selectedSongId);
        const fav = favoriteSongIds && favoriteSongIds.has(String(s.id));
        const idJs = lvIdJs(s.id);
        return '<div class="lv-song' + (sel ? ' is-active' : '') + '">' +
            '<button type="button" class="lv-song-main" onclick=\'selectSong(' + idJs + ')\'>' +
                '<span class="lv-song-icon">' + mdIcone(s.type === 'pdf' ? 'file-text' : s.type === 'letra' ? 'type' : 'music-2', 'w-4 h-4') + '</span>' +
                '<span class="min-w-0 flex-1"><b>' + mdEsc(s.title) + '</b><small>' + (s.type === 'pdf' ? 'PDF' : s.type === 'letra' ? 'Letra para o telão' : 'Cifra digitada') + (s.bpm ? ' · ' + mdEsc(s.bpm) + ' BPM' : '') + '</small></span>' +
                (lvTom(s) ? '<span class="lv-key">' + mdEsc(lvTom(s)) + '</span>' : '') +
            '</button>' +
            '<button type="button" onclick=\'toggleSongFavorite(' + idJs + ')\' class="lv-star' + (fav ? ' is-on' : '') + '" title="' + (fav ? 'Remover dos favoritos' : 'Favoritar') + '" aria-label="Favoritar">' + mdIcone('star', 'w-4 h-4' + (fav ? ' fill-current' : '')) + '</button>' +
            '</div>';
    }).join('');
    mdIcones();
}

function renderSongsList() {
    lvDesenharListaMusicas();
    renderLouvorOverview();
    if (selectedSongId) renderSongDetail(selectedSongId);
    else {
        const detalhe = document.getElementById('song-detail-view');
        if (detalhe && !(songsData || []).length) detalhe.innerHTML = '<div class="text-center py-16 text-slate-500">' + mdIcone('music', 'w-12 h-12 mx-auto mb-3 opacity-40') + '<p class="text-sm">Nenhuma música no repertório ainda.</p></div>';
    }
    mdIcones();
}

let lvDetalheSeq = 0;
function lvOpcoesTom(atual) {
    return MUSICAL_KEYS.map(function (k) { return '<option value="' + k + '"' + (k === atual ? ' selected' : '') + '>' + k + '</option>'; }).join('');
}

async function renderSongDetail(id) {
    const song = (songsData || []).find(function (s) { return s.id === id; }) || lvMusica(id);
    const container = document.getElementById('song-detail-view');
    if (!song || !container) return;
    const seq = ++lvDetalheSeq;
    await loadPrivateNote(song.id);
    const pdfUrl = song.type === 'pdf' ? await resolvePdfUrl(song) : '';
    if (seq !== lvDetalheSeq) return;

    const sid = lvIdJs(song.id);
    const lider = mdLider();
    const podeEnviar = lider || currentUserRole === 'uploader';
    const original = song.originalKey || 'C';
    const atual = song.currentKey || original;

    let previa = '';
    if (song.type === 'pdf' && pdfUrl) {
        previa = '<section class="space-y-3"><div class="flex items-center justify-between gap-3 flex-wrap"><h4 class="lv-detail-h">' + mdIcone('file-text', 'w-4 h-4 text-emerald-400') + 'PDF original</h4><button onclick=\'openPdfFullscreen(' + sid + ')\' class="md-btn md-btn-ok">' + mdIcone('maximize') + 'Tela inteira e zoom</button></div>' +
            '<div class="max-h-[650px] overflow-auto rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-2xl"><div id="pdf-inline-canvas-pages" class="mx-auto flex w-max min-w-full flex-col items-center gap-3"><div class="p-8 text-sm text-slate-300">Carregando PDF...</div></div></div></section>';
    } else if (song.type === 'pdf' && song.layoutPages && song.layoutPages.length) {
        const zoom = layoutZoomLevels[song.id] || 100;
        previa = '<section class="space-y-3"><div class="flex items-center justify-between gap-3 flex-wrap"><h4 class="lv-detail-h">' + mdIcone('scan', 'w-4 h-4 text-emerald-400') + 'Visual parecido com o PDF</h4>' +
            '<div class="flex items-center gap-2">' + mdIcone('zoom-out', 'w-4 h-4 text-slate-400') + '<input type="range" min="50" max="160" step="10" value="' + zoom + '" oninput=\'updateInlineLayoutZoom(' + sid + ', this.value)\' class="w-28 accent-indigo-500" aria-label="Zoom"><span id="inline-layout-zoom-label" class="text-xs text-slate-300 w-10">' + zoom + '%</span>' +
            '<button onclick=\'openLayoutFullscreen(' + sid + ')\' class="md-icon-btn" title="Página inteira" aria-label="Página inteira">' + mdIcone('maximize') + '</button></div></div>' +
            '<div class="cifra-layout-stage max-h-[650px]"><div id="inline-layout-pages">' + renderLayoutPages(song, zoom) + '</div></div></section>';
    } else if (song.type !== 'pdf') {
        previa = '<pre class="cifra-text-view lv-cifra">' + mdEsc(song.content || '') + '</pre>';
    }

    const extraida = song.type === 'pdf' ? '<section class="space-y-2"><div class="flex items-center justify-between gap-2 flex-wrap"><h4 class="lv-detail-h">' + mdIcone('scan-text', 'w-4 h-4 text-indigo-400') + 'Cifra extraída e transponível</h4><span class="md-pill ' + (song.content ? 'md-pill-ok' : 'md-pill-warn') + '">' + (song.content ? 'Texto extraído' : 'PDF sem texto reconhecível') + '</span></div>' +
        '<pre class="cifra-text-view lv-cifra max-h-[480px]">' + mdEsc(song.content || 'Não foi possível extrair texto deste PDF. O arquivo pode ser uma imagem escaneada.') + '</pre></section>' : '';

    container.innerHTML = '<div class="space-y-5">' +
        '<div class="flex items-start justify-between gap-3 flex-wrap">' +
            '<div class="min-w-0"><h3 class="text-xl font-extrabold text-white leading-tight">' + mdEsc(song.title) + '</h3>' +
            '<p class="mt-2 flex flex-wrap gap-1.5"><span class="md-pill md-pill-muted">' + mdIcone(song.type === 'pdf' ? 'file-text' : song.type === 'letra' ? 'type' : 'music-2', 'w-3 h-3') + (song.type === 'pdf' ? 'PDF' : song.type === 'letra' ? 'Letra para o telão' : 'Cifra digitada') + '</span><span class="md-pill md-pill-ok">Tom ' + mdEsc(atual) + (atual !== original ? ' (original ' + mdEsc(original) + ')' : '') + '</span><span class="md-pill md-pill-warn">' + mdEsc(song.bpm || 80) + ' BPM</span></p></div>' +
            '<div class="flex items-center gap-2">' +
                (song.type === 'pdf' && pdfUrl ? '<button onclick=\'openPdfFullscreen(' + sid + ')\' class="md-btn md-btn-ghost">' + mdIcone('scan') + 'Página toda</button>' : '') +
                '<button onclick=\'openTeleprompter(' + sid + ')\' class="md-btn md-btn-primary">' + mdIcone('monitor') + 'Abrir cifra</button>' +
                (typeof abrirTelao === 'function' && song.content ? '<button onclick=\'abrirTelao({ musica: ' + sid + ' })\' class="md-btn md-btn-ghost" title="Projetar a letra no telão">' + mdIcone('presentation') + 'Telão</button>' : '') +
                (lider ? '<button onclick=\'deleteSong(' + sid + ')\' class="md-icon-btn md-icon-danger" title="Excluir música" aria-label="Excluir música">' + mdIcone('trash-2') + '</button>' : '') +
            '</div></div>' +
        '<div class="lv-controls">' +
            '<label>Tom original<select onchange=\'updateSongOriginalKey(' + sid + ', this.value)\' ' + (podeEnviar ? '' : 'disabled') + '>' + lvOpcoesTom(original) + '</select></label>' +
            '<label>Tom para tocar<select class="lv-accent" onchange=\'changeSongKey(' + sid + ', this.value)\'>' + lvOpcoesTom(atual) + '</select></label>' +
            '<label>BPM<input type="number" min="40" max="220" value="' + mdEsc(song.bpm || 80) + '" onchange=\'updateSongBpm(' + sid + ', this.value)\' ' + (podeEnviar ? '' : 'disabled') + '></label>' +
            '<p class="lv-controls-note">' + mdIcone('info', 'w-4 h-4 shrink-0') + 'Trocar o tom aqui muda só a sua visualização da cifra.</p>' +
        '</div>' +
        (previa ? '<div>' + previa + '</div>' : '') + extraida +
        '<label class="block"><span class="lv-detail-h mb-2">' + mdIcone('lock-keyhole', 'w-4 h-4 text-amber-400') + 'Minhas anotações particulares</span>' +
            '<textarea oninput=\'saveSongNotes(' + sid + ', this.value)\' rows="4" placeholder="Ex.: começar suave, repetir o refrão, entrada do teclado..." class="lv-notes">' + mdEsc(privateNotes[song.id] || '') + '</textarea>' +
            '<span class="text-[11px] text-slate-500 mt-1 block">Só você vê estas anotações.</span></label>' +
        '</div>';
    mdIcones();
    if (song.type === 'pdf' && pdfUrl) renderPdfToContainer(pdfUrl, 'pdf-inline-canvas-pages', 1.15);
}

if (typeof selectSong === 'function') {
    const lvSelecionarOriginal = selectSong;
    selectSong = async function (id) {
        await lvSelecionarOriginal(id);
        if (window.innerWidth < 768 && currentTab === 'repertoire') {
            const alvo = document.getElementById('song-detail-view');
            if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
}

/* ---------- Histórico ---------- */
let lvFiltroHistorico = 'louvor';
function lvFiltrarHistorico(f) { lvFiltroHistorico = f; renderRosterHistory(allRostersData); }

function renderRosterHistory(allRosters) {
    const container = document.getElementById('roster-history-list');
    if (!container) return;
    const passadas = lvPassadas(allRosters || []);
    const filtrosEl = document.getElementById('roster-history-filters');
    const conta = function (f) { return passadas.filter(function (r) { return f === 'todos' || (f === 'midia' ? r.department === 'midia' : r.department !== 'midia'); }).length; };
    if (filtrosEl) {
        filtrosEl.innerHTML = [['louvor', 'Louvor'], ['midia', 'Mídia'], ['todos', 'Todos']].map(function (f) {
            return '<button type="button" onclick="lvFiltrarHistorico(\'' + f[0] + '\')" class="md-filter' + (lvFiltroHistorico === f[0] ? ' is-active' : '') + '">' + f[1] + '<b>' + conta(f[0]) + '</b></button>';
        }).join('');
    }
    const lista = passadas.filter(function (r) { return lvFiltroHistorico === 'todos' || (lvFiltroHistorico === 'midia' ? r.department === 'midia' : r.department !== 'midia'); });
    if (!lista.length) {
        container.innerHTML = '<div class="md-empty">' + mdIcone('history', 'w-9 h-9 text-indigo-400/60 mx-auto mb-2') + '<p class="font-semibold text-white">Nenhuma escala anterior</p><p class="text-sm text-slate-400 mt-1">Depois de cada culto, a escala aparece aqui.</p></div>';
        mdIcones();
        return;
    }
    const grupos = [];
    lista.forEach(function (r) {
        const d = new Date(r.dateTime);
        const chave = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        let g = grupos.find(function (x) { return x.chave === chave; });
        if (!g) { g = { chave: chave, itens: [] }; grupos.push(g); }
        g.itens.push(r);
    });
    container.innerHTML = grupos.map(function (g) {
        return '<section><h3 class="lv-month">' + mdEsc(g.chave) + '<span>' + g.itens.length + (g.itens.length === 1 ? ' escala' : ' escalas') + '</span></h3><div class="grid gap-3 md:grid-cols-2">' +
            g.itens.map(function (r) {
                const d = new Date(r.dateTime);
                const nomes = (membersData || []).filter(function (m) { return (r.memberIds || []).map(String).indexOf(String(m.id)) !== -1; }).map(function (m) { return m.name.split(' ')[0]; });
                const musicas = (r.songIds || []).map(lvMusica).filter(Boolean);
                return '<article class="md-card lv-hist"><div class="flex gap-3">' + mdBlocoData(d) + '<div class="min-w-0 flex-1">' +
                    '<div class="flex flex-wrap items-center gap-2"><h4 class="font-bold text-white">' + mdEsc(r.service || 'Culto') + '</h4><span class="md-chip">' + (r.department === 'midia' ? 'Mídia' : 'Louvor') + '</span></div>' +
                    '<p class="mt-1 text-xs text-slate-400 inline-flex items-center gap-1">' + mdIcone('users', 'w-3.5 h-3.5') + mdEsc(nomes.join(', ') || 'Sem equipe registrada') + '</p>' +
                    (musicas.length ? '<div class="lv-mini-setlist">' + musicas.map(function (s) { return '<button type="button" onclick=\'lvAbrirMusica(' + lvIdJs(s.id) + ')\'>' + mdEsc(s.title) + '</button>'; }).join('') + '</div>' : '') +
                    '</div></div></article>';
            }).join('') + '</div></section>';
    }).join('');
    mdIcones();
}

/* ---------- Equipe (Louvor e Mídia) ---------- */
function renderMembers() {
    const admin = (currentUser && currentUser.uid === ADMIN_UID) || currentUserRole === 'admin' || currentUserRole === 'leader';
    const superAdmin = (currentUser && currentUser.uid === ADMIN_UID) || currentUserRole === 'admin';
    const agora = mdInicioDoDia(new Date());
    const futuras = (allRostersData || []).filter(function (r) { return r.dateTime && new Date(r.dateTime) >= agora && mdDiasAte(new Date(r.dateTime)) <= 30; });
    ['louvor', 'midia'].forEach(function (department) {
        const container = document.getElementById('members-' + department);
        if (!container) return;
        const lista = (membersData || []).filter(function (m) { return department === 'midia' ? m.department === 'midia' : m.department !== 'midia'; })
            .sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'pt-BR'); });
        if (!lista.length) {
            container.innerHTML = '<div class="md-empty col-span-full">' + mdIcone('users', 'w-9 h-9 text-indigo-400/60 mx-auto mb-2') + '<p class="font-semibold text-white">Ninguém cadastrado ainda</p>' + (admin ? '<button onclick="addMember(\'' + department + '\')" class="md-btn md-btn-primary mx-auto mt-4">' + mdIcone('user-plus') + 'Adicionar pessoa</button>' : '') + '</div>';
            return;
        }
        container.innerHTML = lista.map(function (m) {
            const phone = typeof cleanPhone === 'function' ? cleanPhone(m.phone) : '';
            const idJs = lvIdJs(m.id);
            const escalas = futuras.filter(function (r) { return (r.memberIds || []).map(String).indexOf(String(m.id)) !== -1; }).length;
            return '<article class="md-card lv-member">' +
                '<span class="md-avatar lv-avatar-lg' + (department === 'midia' ? '' : ' lv-avatar') + '">' + mdEsc(mdIniciais(m.name)) + '</span>' +
                '<div class="min-w-0 flex-1"><h4 class="text-sm font-bold text-white truncate">' + mdEsc(m.name) + '</h4><p class="text-xs text-slate-400 truncate">' + mdEsc(m.role || m.churchRole || 'Integrante') + '</p>' +
                '<p class="mt-1.5 flex flex-wrap gap-1.5"><span class="md-pill ' + (escalas ? 'md-pill-info' : 'md-pill-muted') + '">' + mdIcone('calendar-check', 'w-3 h-3') + escalas + (escalas === 1 ? ' escala' : ' escalas') + ' em 30 dias</span>' + (m.accountUid ? '<span class="md-pill md-pill-ok">' + mdIcone('badge-check', 'w-3 h-3') + 'Tem conta</span>' : '') + '</p></div>' +
                '<div class="lv-member-actions">' +
                (phone ? '<a href="https://wa.me/' + mdEsc(phone) + '" target="_blank" rel="noopener" class="md-icon-btn lv-wa" title="WhatsApp" aria-label="WhatsApp">' + mdIcone('message-circle') + '</a>' : '') +
                (superAdmin && m.accountUid ? '<button onclick=\'toggleMemberLeader(' + lvIdJs(m.accountUid) + ', ' + lvIdJs(m.name) + ')\' class="md-icon-btn lv-crown" title="Dar ou retirar acesso de líder" aria-label="Liderança">' + mdIcone('crown') + '</button>' : '') +
                (admin ? '<button onclick=\'editMember(' + idJs + ')\' class="md-icon-btn" title="Editar" aria-label="Editar">' + mdIcone('pencil') + '</button><button onclick=\'deleteMember(' + idJs + ')\' class="md-icon-btn md-icon-danger" title="Excluir" aria-label="Excluir">' + mdIcone('trash-2') + '</button>' : '') +
                '</div></article>';
        }).join('');
    });
    renderLouvorOverview();
    if (typeof renderMidiaOverview === 'function') renderMidiaOverview();
    mdIcones();
}

/* ---------- Central: presença e trocas (com o ministério indicado) ---------- */
function lvNomeDaResposta(t) {
    const m = (membersData || []).find(function (x) { return String(x.id) === String(t.memberId) || (x.accountUid && x.accountUid === t.id); });
    return m ? m.name : 'Alguém da equipe';
}
async function renderLeaderAttendance() {
    const container = document.getElementById('attendance-leader-panel');
    if (!container || !mdLider()) return;
    const proximas = lvFuturas(allRostersData || []).filter(function (r) { return r.dateTime; }).slice(0, 6);
    const linhas = [];
    for (const r of proximas) {
        let dados = [];
        try {
            const snap = await db.collection('rosters').doc(String(r.id)).collection('responses').get();
            dados = snap.docs.map(function (doc) { const d = doc.data() || {}; d.id = doc.id; return d; });
        } catch (e) {}
        const conf = dados.filter(function (d) { return d.attendance === 'confirmed'; }).length;
        const trocas = dados.filter(function (d) { return d.attendance === 'swap'; });
        const nao = dados.filter(function (d) { return d.attendance === 'declined'; }).length;
        const sem = Math.max(0, (r.memberIds || []).length - dados.length);
        const data = new Date(r.dateTime);
        linhas.push('<article class="lv-att"><div class="flex items-start gap-3">' + mdBlocoData(data) + '<div class="min-w-0 flex-1">' +
            '<div class="flex flex-wrap items-center gap-2"><strong class="text-white text-sm">' + mdEsc(r.service || 'Culto') + '</strong><span class="md-chip">' + (r.department === 'midia' ? 'Mídia' : 'Louvor') + '</span></div>' +
            '<p class="text-[11px] text-slate-500 mt-0.5">' + mdQuando(data) + ' · ' + mdHora(data) + '</p>' +
            '<div class="mt-2 flex flex-wrap gap-1.5"><span class="md-pill md-pill-ok">' + conf + ' confirmados</span>' + (nao ? '<span class="md-pill md-pill-danger">' + nao + ' não vão</span>' : '') + (trocas.length ? '<span class="md-pill md-pill-warn">' + trocas.length + (trocas.length === 1 ? ' troca' : ' trocas') + '</span>' : '') + '<span class="md-pill md-pill-muted">' + sem + ' sem resposta</span></div></div>' +
            '<button onclick=\'editRoster(' + lvIdJs(r.id) + ')\' class="md-icon-btn shrink-0" title="Editar escala" aria-label="Editar escala">' + mdIcone('pencil') + '</button></div>' +
            trocas.map(function (t) { return '<div class="lv-swap"><span>' + mdIcone('repeat-2', 'w-3.5 h-3.5') + mdEsc(t.userName || lvNomeDaResposta(t)) + ' pediu troca</span><button onclick=\'approveSwap(' + lvIdJs(r.id) + ', ' + lvIdJs(t.id) + ')\' class="md-btn md-btn-ok">Aprovar</button></div>'; }).join('') +
            '</article>');
    }
    container.innerHTML = linhas.join('') || '<p class="text-sm text-slate-500">Nenhuma escala futura.</p>';
    mdIcones();
}

/* ---------- Troca de aba do Louvor ---------- */
if (typeof switchTab === 'function') {
    const lvSwitchOriginal = switchTab;
    switchTab = function (tabId) {
        lvSwitchOriginal(tabId);
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('is-active'); });
        const ativo = document.getElementById('tab-btn-' + tabId);
        if (ativo) ativo.classList.add('is-active');
        renderLouvorOverview();
    };
}

/* Favoritar sem trocar a música aberta e sem recarregar o PDF */
async function toggleSongFavorite(songId) {
    if (!currentUser) return;
    const chave = String(songId);
    const favorito = !favoriteSongIds.has(chave);
    if (favorito) favoriteSongIds.add(chave); else favoriteSongIds.delete(chave);
    lvDesenharListaMusicas();
    renderLouvorOverview();
    const ensaio = document.getElementById('rehearsal-modal');
    if (ensaio && !ensaio.classList.contains('hidden')) renderRehearsalSong();
    try {
        await db.collection('privateNotes').doc(currentUser.uid).collection('songs').doc(chave).set({ favorite: favorito, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) {
        if (favorito) favoriteSongIds.delete(chave); else favoriteSongIds.add(chave);
        lvDesenharListaMusicas();
        renderLouvorOverview();
        portalToast('Não foi possível salvar o favorito. Verifique a internet.', 'error');
    }
}

/* ---------- Respostas rápidas: aviso discreto em vez de janela ---------- */
async function lvSemJanela(acao) {
    const alertaAnterior = window.alert;
    window.alert = function (msg) { portalToast(String(msg || '').replace(/\s*✅/g, ''), 'auto'); };
    try { return await acao(); } finally { window.alert = alertaAnterior; }
}
if (typeof respondRosterPresence === 'function') {
    const lvPresencaOriginal = respondRosterPresence;
    const lvTextoResposta = { confirmed: 'Presença confirmada', declined: 'Resposta registrada: você não poderá servir neste dia.', swap: 'Pedido de troca enviado para a liderança.' };
    respondRosterPresence = function (rosterId, status) {
        const args = arguments, self = this;
        return lvSemJanela(function () {
            const toastAnterior = window.alert;
            window.alert = function (msg) { toastAnterior(/Não foi possível|apenas para quem/.test(String(msg)) ? msg : (lvTextoResposta[status] || msg)); };
            return Promise.resolve(lvPresencaOriginal.apply(self, args)).finally(function () { window.alert = toastAnterior; });
        });
    };
}
if (typeof updateRosterResponse === 'function') {
    const lvRespostaOriginal = updateRosterResponse;
    updateRosterResponse = function () { const args = arguments, self = this; return lvSemJanela(function () { return lvRespostaOriginal.apply(self, args); }); };
}

/* Evita repetição infinita ao iniciar o Culto Ao Vivo enquanto a resposta do servidor não chega */
if (typeof startLiveService === 'function') {
    const lvAoVivoOriginal = startLiveService;
    let lvIniciandoAoVivo = false;
    startLiveService = async function () {
        if (lvIniciandoAoVivo) return;
        lvIniciandoAoVivo = true;
        try { return await lvAoVivoOriginal.apply(this, arguments); }
        finally { setTimeout(function () { lvIniciandoAoVivo = false; }, 1500); }
    };
}
