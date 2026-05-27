const supabaseUrl = 'https://jecudcxdkgxsfijikach.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplY3VkY3hka2d4c2ZpamlrYWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Mzc1NTIsImV4cCI6MjA5NTExMzU1Mn0.CFO1Z6NcRNxooQeB8ZOfxJ1dZ9cqOHvhyFFNEqPymGY';

const { createClient } = supabase;
const client = createClient(supabaseUrl, supabaseKey);

let usuarioLogado = null;
let hemocentroLogado = null;
let agendamentoSelecionado = null;
let hemocentroSelecionado = null;

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const LIMITE_CRITICO = 5;

/* ──────────── CONTRASTE ──────────── */

let contrasteAtivo = localStorage.getItem('contraste') === '1';
if (contrasteAtivo) document.body.classList.add('alto-contraste');

function toggleContraste() {
  contrasteAtivo = !contrasteAtivo;
  document.body.classList.toggle('alto-contraste', contrasteAtivo);
  const btn = document.getElementById('btn-contraste');
  if (btn) {
    btn.setAttribute('aria-pressed', contrasteAtivo);
    btn.classList.toggle('acess-btn-ativo', contrasteAtivo);
  }
  localStorage.setItem('contraste', contrasteAtivo ? '1' : '0');
  // Sempre fala, independente do audioAtivo
  _falarAgora(contrasteAtivo ? 'Alto contraste ativado' : 'Alto contraste desativado');
}

/* ──────────── TTS ──────────── */

// Restaura preferência salva
let audioAtivo = localStorage.getItem('audio') === '1';

let synth = window.speechSynthesis;
let vozPT = null;

function carregarVoz() {
  const vozes = synth.getVoices();
  vozPT = vozes.find(v => v.lang === 'pt-BR') ||
          vozes.find(v => v.lang.startsWith('pt')) ||
          vozes[0] || null;
}
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = carregarVoz;
carregarVoz();

// Atualiza visual do botão conforme estado atual
function sincronizarBotaoAudio() {
  const btn = document.getElementById('btn-audio');
  if (!btn) return;
  btn.setAttribute('aria-pressed', audioAtivo);
  btn.classList.toggle('acess-btn-ativo', audioAtivo);
}

function toggleAudio() {
  audioAtivo = !audioAtivo;
  sincronizarBotaoAudio();
  localStorage.setItem('audio', audioAtivo ? '1' : '0');

  if (!audioAtivo) {
    // Avisa ANTES de cancelar, para o usuário ouvir a confirmação
    _falarAgora('Transcrição de áudio desativada');
    // Cancela qualquer fala em andamento após o aviso terminar
    setTimeout(() => {
      if (!audioAtivo) synth.cancel();
    }, 2000);
  } else {
    _falarAgora('Transcrição de áudio ativada');
  }
}

// Fala interna — sempre executa, independente de audioAtivo
function _falarAgora(texto) {
  if (!synth || !texto?.trim()) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(texto.trim());
  utter.lang = 'pt-BR';
  if (vozPT) utter.voice = vozPT;
  utter.rate = 1.1;
  utter.pitch = 1;
  synth.speak(utter);
}

// Fala pública — respeita audioAtivo
function falar(texto) {
  if (!audioAtivo) return;
  _falarAgora(texto);
}

// Anúncio de sistema (mudança de tela, confirmações) — respeita audioAtivo
function anunciar(texto) {
  const el = document.getElementById('aria-announcer');
  if (el) {
    el.textContent = '';
    setTimeout(() => { el.textContent = texto; }, 50);
  }
  falar(texto);
}

/* ──────────── LEITOR DE TELA POR TELA ──────────── */

let leitorController = null;

// Extrai texto limpo e legível de um elemento,
// incluindo contexto (label do campo, tipo do elemento, etc.)
function extrairTextoElemento(el) {
  // Campos de formulário: lê "Campo [label]: [placeholder ou valor]"
  if (el.tagName === 'INPUT') {
    const lbl = el.closest('.form-group')?.querySelector('label')?.textContent?.trim() || '';
    const val = el.value?.trim();
    const ph  = el.placeholder || '';
    if (lbl) return `Campo ${lbl}${val ? ': ' + val : ph ? ', ' + ph : ''}`;
    return ph ? `Campo: ${ph}` : '';
  }

  if (el.tagName === 'SELECT') {
    const lbl = el.closest('.form-group')?.querySelector('label')?.textContent?.trim() || '';
    const sel = el.options[el.selectedIndex]?.text?.trim() || '';
    return `${lbl ? lbl + ': ' : 'Seleção: '}${sel || 'nenhuma opção selecionada'}`;
  }

  if (el.tagName === 'BUTTON') {
    return el.innerText?.trim() || el.getAttribute('aria-label') || 'Botão';
  }

  // Para qualquer outro elemento, pega o innerText direto
  return (el.innerText || el.textContent || '').trim();
}

// Monta a leitura completa da tela: título + todo o conteúdo visível
function lerTelaToda(telaAtiva) {
  if (!telaAtiva) return;

  // Clona para não afetar o DOM real
  const clone = telaAtiva.cloneNode(true);

  // Remove elementos que não devem ser lidos
  clone.querySelectorAll(
    '.acess-bar, .sr-only, script, style, [aria-hidden="true"], #aria-announcer, .modal-overlay, .toast'
  ).forEach(el => el.remove());

  // Substitui inputs pelo texto do label + placeholder para leitura
  clone.querySelectorAll('input').forEach(inp => {
    const lbl = inp.closest('.form-group')?.querySelector('label')?.textContent?.trim() || '';
    const ph  = inp.placeholder || '';
    const sub = document.createTextNode(`Campo ${lbl}${ph ? ': ' + ph : ''}. `);
    inp.replaceWith(sub);
  });

  // Substitui selects pelo label
  clone.querySelectorAll('select').forEach(sel => {
    const lbl = sel.closest('.form-group')?.querySelector('label')?.textContent?.trim() || '';
    const sub = document.createTextNode(`Seleção ${lbl}. `);
    sel.replaceWith(sub);
  });

  // Extrai o texto limpo, colapsando espaços e quebras excessivas
  const texto = clone.innerText
    .replace(/\n{3,}/g, '\n\n')   // máximo 2 quebras seguidas
    .replace(/[ \t]+/g, ' ')        // espaços múltiplos → um
    .trim();

  return texto;
}

function ativarLeitorNaTelaAtual(telaAtiva) {
  if (!telaAtiva) return;

  // Cancela listeners da tela anterior
  if (leitorController) leitorController.abort();
  leitorController = new AbortController();
  const { signal } = leitorController;

  // Lê a tela toda automaticamente ao navegar (se áudio ativo)
  if (audioAtivo) {
    const textoTela = lerTelaToda(telaAtiva);
    if (textoTela) {
      // Pequeno delay para o anúncio de "Tela: X" terminar antes
      setTimeout(() => falar(textoTela), 800);
    }
  }

  // ── Leitura por hover/foco em qualquer elemento com texto ──
  // Usa TreeWalker para pegar todos os nós de texto visíveis e seus pais
  const elementosLegiveis = new Set();

  // Adiciona elementos interativos e containers de conteúdo
  const seletoresAlvo = [
    'button', 'a', 'input', 'select', 'textarea',
    // Containers de conteúdo — lê o bloco inteiro de uma vez
    '.menu-item', '.escolha-card', '.hemo-card-busca',
    '.agendamento-item', '.info-card', '.estoque-item',
    '.blood-type-badge', '.blood-badge', '.hemo-alerta-mini',
    '.alerta-item', '.alerta-ok', '.requisitos',
    '.perfil-info', '.menu-header',
    // Textos soltos
    'h1', 'h2', 'h3', 'h4', 'p', 'label',
    '.ag-date', '.ag-local', '.ag-info-extra', '.ag-hora',
    '.hemo-card-nome', '.hemo-card-end', '.hemo-card-hor',
    '.screen-title', '.section-label',
    '.estoque-tipo', '.estoque-badge-alerta', '.estoque-badge-ok',
    '.empty-state',
  ].join(',');

  telaAtiva.querySelectorAll(seletoresAlvo).forEach(el => {
    if (el.closest('.acess-bar') || el.id === 'aria-announcer') return;
    elementosLegiveis.add(el);
  });

  elementosLegiveis.forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      const txt = extrairTextoElemento(el);
      // Limita para não ler blocos imensos de uma vez (leitura por hover)
      if (txt.length > 0 && txt.length < 400) falar(txt);
    }, { signal });

    el.addEventListener('mouseleave', () => {
      synth.cancel();
    }, { signal });

    el.addEventListener('focus', (e) => {
      e.stopPropagation();
      const txt = extrairTextoElemento(el);
      if (txt.length > 0 && txt.length < 400) falar(txt);
    }, { signal });

    el.addEventListener('blur', () => {
      synth.cancel();
    }, { signal });
  });
}

/* ──────────── NAVEGAÇÃO ──────────── */

function ir(id) {
  const novaTela = document.getElementById(id);
  if (!novaTela) {
    console.error(`Tela "${id}" não encontrada.`);
    return;
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  novaTela.classList.add('active');

  const elementoTitulo = novaTela.querySelector('.screen-title') || novaTela.querySelector('h2, h3');
  const tituloTela = elementoTitulo?.textContent?.trim() || 'Painel';

  anunciar(`Tela: ${tituloTela}`);
  ativarLeitorNaTelaAtual(novaTela);
}

/* ──────────── TOAST ──────────── */

function toast(msg, dur = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

/* ──────────── INIT — registra tela inicial ──────────── */

window.addEventListener('DOMContentLoaded', () => {
  sincronizarBotaoAudio();
  // Registra listeners na tela de login que já está ativa
  const telaInicial = document.querySelector('.screen.active');
  if (telaInicial) ativarLeitorNaTelaAtual(telaInicial);
});

/* ──────────── LOGIN ──────────── */

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  const { data: user } = await client
    .from('usuarios').select('*')
    .eq('email', email).eq('senha', senha).maybeSingle();

  if (user) { usuarioLogado = user; abrirMain(); return; }

  const { data: hemo } = await client
    .from('hemocentros').select('*')
    .eq('email', email).eq('senha', senha).maybeSingle();

  if (hemo) { hemocentroLogado = hemo; abrirMainHemo(); return; }

  toast('Login inválido!');
}

function limparLogin() {
  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
}

/* ──────────── MAIN DOADOR ──────────── */

function abrirMain() {
  document.getElementById('main-nome').textContent = usuarioLogado.nome;
  document.getElementById('main-tipo').textContent = usuarioLogado.tipo_sanguineo;
  ir('screen-main');
  anunciar(`Olá, ${usuarioLogado.nome}. Tipo sanguíneo: ${usuarioLogado.tipo_sanguineo}.`);
}

/* ──────────── MAIN HEMOCENTRO ──────────── */

function abrirMainHemo() {
  document.getElementById('main-hemo-nome').textContent = hemocentroLogado.nome;
  document.getElementById('main-hemo-cidade').textContent =
    hemocentroLogado.cidade + ' — ' + hemocentroLogado.estado;
  ir('screen-main-hemo');
}

/* ──────────── LOGOUT ──────────── */

function fazerLogout() {
  usuarioLogado = null;
  hemocentroLogado = null;
  ir('screen-login');
}

/* ──────────── CADASTRO DOADOR ──────────── */

async function salvarCadastro() {
  const nome      = document.getElementById('cad-nome').value.trim();
  const idade     = document.getElementById('cad-idade').value;
  const tipo      = document.getElementById('cad-tipo').value;
  const telefone  = document.getElementById('cad-telefone').value.trim();
  const email     = document.getElementById('cad-email').value.trim();
  const senha     = document.getElementById('cad-senha').value;
  const confirmar = document.getElementById('cad-confirmar').value;

  if (!nome || !idade || !tipo || !telefone || !email || !senha) { toast('Preencha todos os campos!'); return; }
  if (senha !== confirmar) { toast('As senhas não coincidem!'); return; }
  if (parseInt(idade) < 16 || parseInt(idade) > 69) { toast('Idade deve ser entre 16 e 69 anos!'); return; }

  const { data: existente } = await client.from('usuarios').select('*').eq('email', email);
  if (existente && existente.length > 0) { toast('E-mail já cadastrado!'); return; }

  const { error } = await client.from('usuarios').insert([{
    nome, idade: parseInt(idade), tipo_sanguineo: tipo, telefone, email, senha
  }]);

  if (error) { toast('Erro ao cadastrar!'); return; }

  toast('Cadastro realizado!');
  setTimeout(() => ir('screen-login'), 1500);
  ['cad-nome','cad-idade','cad-tipo','cad-telefone','cad-email','cad-senha','cad-confirmar']
    .forEach(id => document.getElementById(id).value = '');
}

/* ──────────── CADASTRO HEMOCENTRO ──────────── */

async function salvarCadastroHemo() {
  const nome        = document.getElementById('hemo-nome').value.trim();
  const cnpj        = document.getElementById('hemo-cnpj').value.trim();
  const responsavel = document.getElementById('hemo-responsavel').value.trim();
  const telefone    = document.getElementById('hemo-telefone').value.trim();
  const endereco    = document.getElementById('hemo-endereco').value.trim();
  const cidade      = document.getElementById('hemo-cidade').value.trim();
  const estado      = document.getElementById('hemo-estado').value;
  const email       = document.getElementById('hemo-email').value.trim();
  const senha       = document.getElementById('hemo-senha').value;
  const confirmar   = document.getElementById('hemo-confirmar').value;
  const horario     = document.getElementById('hemo-horario').value.trim();

  if (!nome || !cnpj || !responsavel || !telefone || !endereco || !cidade || !estado || !email || !senha || !horario) {
    toast('Preencha todos os campos!'); return;
  }
  if (senha !== confirmar) { toast('As senhas não coincidem!'); return; }

  const { data: existente } = await client.from('hemocentros').select('*').eq('email', email);
  if (existente && existente.length > 0) { toast('E-mail já cadastrado!'); return; }

  const estoqueInicial = {};
  TIPOS_SANGUINEOS.forEach(t => estoqueInicial[t] = 0);

  const { error } = await client.from('hemocentros').insert([{
    nome, cnpj, responsavel, telefone, endereco, cidade, estado,
    email, senha, horario, estoque: estoqueInicial
  }]);

  if (error) { console.error(error); toast('Erro ao cadastrar hemocentro!'); return; }

  toast('Hemocentro cadastrado com sucesso!');
  setTimeout(() => ir('screen-login'), 1500);
  ['hemo-nome','hemo-cnpj','hemo-responsavel','hemo-telefone','hemo-endereco',
   'hemo-cidade','hemo-email','hemo-senha','hemo-confirmar','hemo-horario']
    .forEach(id => document.getElementById(id).value = '');
}

/* ──────────── BUSCAR HEMOCENTRO ──────────── */

let todosHemocentros = [];

async function irBuscarHemocentro() {
  document.getElementById('busca-cidade').value = '';

  const { data, error } = await client.from('hemocentros').select('*');
  if (error) { toast('Erro ao carregar hemocentros!'); return; }

  todosHemocentros = data || [];
  renderListaHemocentros(todosHemocentros);
  ir('screen-buscar-hemo');
}

function filtrarHemocentros() {
  const termo = document.getElementById('busca-cidade').value.trim().toLowerCase();
  if (!termo) { renderListaHemocentros(todosHemocentros); return; }

  const filtrados = todosHemocentros.filter(h =>
    (h.cidade    && h.cidade.toLowerCase().includes(termo)) ||
    (h.endereco  && h.endereco.toLowerCase().includes(termo)) ||
    (h.nome      && h.nome.toLowerCase().includes(termo)) ||
    (h.estado    && h.estado.toLowerCase().includes(termo))
  );
  renderListaHemocentros(filtrados);
}

function renderListaHemocentros(listaHemocentros) {
  const lista = document.getElementById('lista-hemocentros');

  if (!listaHemocentros.length) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">😔</div><p>Nenhum hemocentro encontrado.</p></div>`;
    return;
  }

  lista.innerHTML = listaHemocentros.map(h => {
    const estoque = h.estoque || {};
    const alertas = TIPOS_SANGUINEOS.filter(tipo => (estoque[tipo] || 0) < LIMITE_CRITICO);
    const alertaHTML = alertas.length
      ? `<div class="hemo-alerta-mini">⚠️ Necessita: ${alertas.join(', ')}</div>` : '';

    return `
      <div class="hemo-card-busca" onclick="selecionarHemocentro(${h.id})">
        <div class="hemo-card-info">
          <div class="hemo-card-nome">${h.nome}</div>
          <div class="hemo-card-end">📍 ${h.endereco}, ${h.cidade} — ${h.estado}</div>
          <div class="hemo-card-hor">🕐 ${h.horario}</div>
          ${alertaHTML}
        </div>
        <div class="hemo-card-arrow">›</div>
      </div>`;
  }).join('');

  // Re-registra listeners nos cards recém-criados
  const tela = document.getElementById('screen-buscar-hemo');
  if (tela) ativarLeitorNaTelaAtual(tela);
}

function selecionarHemocentro(id) {
  hemocentroSelecionado = todosHemocentros.find(h => h.id === id);
  if (!hemocentroSelecionado) return;
  irAgendar();
}

/* ──────────── AGENDAR ──────────── */

function irAgendar() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('ag-data').min   = hoje;
  document.getElementById('ag-data').value = '';
  document.getElementById('ag-horario').value = '';

  const h = hemocentroSelecionado;
  const estoque = h.estoque || {};
  const alertas = TIPOS_SANGUINEOS.filter(tipo => (estoque[tipo] || 0) < LIMITE_CRITICO);
  const alertaHTML = alertas.length
    ? `<div class="hemo-alerta-mini">⚠️ Necessita: ${alertas.join(', ')}</div>` : '';

  document.getElementById('hemo-selecionado-info').innerHTML = `
    <div class="hemo-card-info">
      <div class="hemo-card-nome">${h.nome}</div>
      <div class="hemo-card-end">📍 ${h.endereco}, ${h.cidade} — ${h.estado}</div>
      <div class="hemo-card-hor">🕐 ${h.horario}</div>
      ${alertaHTML}
    </div>`;

  ir('screen-agendar');
}

async function confirmarAgendamento() {
  const data    = document.getElementById('ag-data').value;
  const horario = document.getElementById('ag-horario').value;

  if (!data || !horario)       { toast('Selecione data e horário!'); return; }
  if (!hemocentroSelecionado)  { toast('Nenhum hemocentro selecionado!'); return; }

  const { error } = await client.from('agendamentos').insert([{
    usuario_email: usuarioLogado.email,
    data, horario,
    local:               hemocentroSelecionado.nome,
    endereco:            hemocentroSelecionado.endereco,
    cidade:              hemocentroSelecionado.cidade,
    estado:              hemocentroSelecionado.estado,
    horario_atendimento: hemocentroSelecionado.horario,
    telefone:            hemocentroSelecionado.telefone,
    hemocentro_id:       hemocentroSelecionado.id
  }]);

  if (error) { toast('Erro ao agendar!'); return; }

  toast('Agendamento confirmado!');
  setTimeout(() => ir('screen-main'), 1500);
}

/* ──────────── AGENDAMENTOS DOADOR ──────────── */

async function irAgendamentos() {
  agendamentoSelecionado = null;
  const btn = document.getElementById('btn-cancelar-ag');
  if (btn) btn.style.display = 'none';
  await renderAgendamentos();
  ir('screen-agendamentos');
}

async function renderAgendamentos() {
  const lista = document.getElementById('historico-agendamentos');

  const { data: ags, error } = await client
    .from('agendamentos').select('*')
    .eq('usuario_email', usuarioLogado.email);

  if (error || !ags || ags.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhum agendamento encontrado.</p></div>`;
    return;
  }

  lista.innerHTML = ags.map(a => {
    const [ano, mes, dia] = a.data.split('-');
    return `
      <div class="agendamento-item" id="ag-item-${a.id}" onclick="selecionarAg(${a.id})">
        <div>
          <div class="ag-date">${dia}/${mes}/${ano}</div>
          <div class="ag-local">🏥 ${a.local}</div>
          <div class="ag-info-extra">📍 ${a.endereco || 'Endereço não informado'}, ${a.cidade || ''} ${a.estado || ''}</div>
          <div class="ag-info-extra">🕐 Atendimento: ${a.horario_atendimento || 'Não informado'}</div>
          <div class="ag-info-extra">📞 Telefone: ${a.telefone || 'Não informado'}</div>
        </div>
        <div class="ag-hora">${a.horario}</div>
      </div>`;
  }).join('');

  // Re-registra leitor nos itens recém-renderizados
  const telaAg = document.getElementById('screen-agendamentos');
  if (telaAg) ativarLeitorNaTelaAtual(telaAg);
}

function selecionarAg(id) {
  document.querySelectorAll('.agendamento-item').forEach(el => el.classList.remove('selected'));
  document.getElementById('ag-item-' + id).classList.add('selected');
  agendamentoSelecionado = id;
  document.getElementById('btn-cancelar-ag').style.display = 'block';
}

/* ──────────── AGENDAMENTOS HEMOCENTRO ──────────── */

async function irAgendamentosHemo() {
  const lista = document.getElementById('lista-agendamentos-hemo');
  lista.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>`;
  ir('screen-agendamentos-hemo');

  const { data: ags, error } = await client
    .from('agendamentos').select('*')
    .eq('hemocentro_id', hemocentroLogado.id)
    .order('data', { ascending: true });

  if (error || !ags || ags.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhum agendamento encontrado.</p></div>`;
    return;
  }

  const emails = [...new Set(ags.map(a => a.usuario_email).filter(e => e))];
  const { data: usuarios, error: erroUsuarios } = await client
    .from('usuarios').select('*').in('email', emails);

  if (erroUsuarios) { console.error(erroUsuarios); toast('Erro ao carregar usuários!'); return; }

  lista.innerHTML = ags.map(a => {
    const usuario = usuarios.find(u => u.email === a.usuario_email);
    const [ano, mes, dia] = a.data.split('-');
    return `
      <div class="agendamento-item">
        <div>
          <div class="ag-date">${dia}/${mes}/${ano}</div>
          <div class="ag-local">👤 ${usuario?.nome || 'Usuário'}</div>
          <div class="ag-info-extra">📧 ${usuario?.email || 'Não informado'}</div>
          <div class="ag-info-extra">🩸 Tipo sanguíneo: ${usuario?.tipo_sanguineo || 'Não informado'}</div>
          <div class="ag-info-extra">🎂 Idade: ${usuario?.idade || 'Não informado'}</div>
          <div class="ag-info-extra">📞 Telefone: ${usuario?.telefone || 'Não informado'}</div>
        </div>
        <div class="ag-hora">${a.horario}</div>
      </div>`;
  }).join('');

  // Re-registra leitor nos cards recém-renderizados
  const telaHemoAg = document.getElementById('screen-agendamentos-hemo');
  if (telaHemoAg) ativarLeitorNaTelaAtual(telaHemoAg);
}

/* ──────────── CANCELAR AGENDAMENTO ──────────── */

function abrirModalCancelar() {
  if (!agendamentoSelecionado) { toast('Selecione um agendamento!'); return; }
  abrirModal('modal-cancelar');
}

async function cancelarAgendamento() {
  await client.from('agendamentos').delete().eq('id', agendamentoSelecionado);
  fecharModal('modal-cancelar');
  toast('Agendamento cancelado!');
  renderAgendamentos();
}

/* ──────────── PERFIL DOADOR ──────────── */

function irPerfil() {
  const u = usuarioLogado;
  const iniciais = u.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('perfil-avatar').textContent   = iniciais;
  document.getElementById('perfil-nome').textContent     = u.nome;
  document.getElementById('perfil-email').textContent    = u.email;
  document.getElementById('perfil-tipo').textContent     = u.tipo_sanguineo;
  document.getElementById('perfil-idade').textContent    = u.idade + ' anos';
  document.getElementById('perfil-telefone').textContent = u.telefone;
  ir('screen-perfil');
}

/* ──────────── PERFIL HEMOCENTRO ──────────── */

async function irPerfilHemo() {
  const { data: hemo } = await client
    .from('hemocentros').select('*').eq('id', hemocentroLogado.id).maybeSingle();
  if (hemo) hemocentroLogado = hemo;

  const h = hemocentroLogado;
  const iniciais = h.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('hemo-avatar-initials', iniciais);
  set('hemo-perfil-nome',     h.nome);
  set('hemo-perfil-endereco', h.endereco);
  set('hemo-perfil-cidade',   h.cidade + ' — ' + h.estado);
  set('hemo-perfil-resp',     h.responsavel);
  set('hemo-perfil-tel',      h.telefone);
  set('hemo-perfil-horario',  h.horario);
  set('hemo-perfil-email',    h.email);

  ir('screen-perfil-hemo');
}

/* ──────────── EDITAR HEMOCENTRO ──────────── */

function irEditarHemo() {
  const h = hemocentroLogado;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('edit-hemo-nome',        h.nome);
  set('edit-hemo-responsavel', h.responsavel);
  set('edit-hemo-telefone',    h.telefone);
  set('edit-hemo-endereco',    h.endereco);
  set('edit-hemo-cidade',      h.cidade);
  set('edit-hemo-estado',      h.estado);
  set('edit-hemo-horario',     h.horario);
  ir('screen-editar-hemo');
}

async function salvarEdicaoHemo() {
  const get = id => document.getElementById(id).value;
  const nome        = get('edit-hemo-nome');
  const responsavel = get('edit-hemo-responsavel');
  const telefone    = get('edit-hemo-telefone');
  const endereco    = get('edit-hemo-endereco');
  const cidade      = get('edit-hemo-cidade');
  const estado      = get('edit-hemo-estado');
  const horario     = get('edit-hemo-horario');

  const { error } = await client.from('hemocentros')
    .update({ nome, responsavel, telefone, endereco, cidade, estado, horario })
    .eq('id', hemocentroLogado.id);

  if (error) { toast('Erro ao atualizar hemocentro!'); return; }

  Object.assign(hemocentroLogado, { nome, responsavel, telefone, endereco, cidade, estado, horario });
  toast('Perfil atualizado!');
  irPerfilHemo();
}

/* ──────────── EXCLUIR HEMOCENTRO ──────────── */

async function excluirHemocentro() {
  const confirmar = confirm('Tem certeza que deseja excluir o hemocentro? Esta ação não pode ser desfeita.');
  if (!confirmar) return;

  await client.from('agendamentos').delete().eq('hemocentro_id', hemocentroLogado.id);
  const { error } = await client.from('hemocentros').delete().eq('id', hemocentroLogado.id);

  if (error) { toast('Erro ao excluir hemocentro!'); return; }

  toast('Hemocentro removido com sucesso!');
  hemocentroLogado = null;
  setTimeout(() => ir('screen-login'), 1500);
}

/* ──────────── ESTOQUE ──────────── */

function abrirEstoque() {
  renderEstoque();
  renderAlertasEstoque();
  ir('screen-estoque');
}

function renderEstoque() {
  const grid    = document.getElementById('estoque-grid');
  const estoque = hemocentroLogado.estoque || {};

  grid.innerHTML = TIPOS_SANGUINEOS.map(tipo => {
    const qtd    = estoque[tipo] ?? 0;
    const critico = qtd < LIMITE_CRITICO;
    return `
      <div class="estoque-item ${critico ? 'critico' : ''}">
        <div class="estoque-tipo">${tipo}</div>
        <div class="${critico ? 'estoque-badge-alerta' : 'estoque-badge-ok'}">${critico ? 'Crítico' : 'Normal'}</div>
        <div class="estoque-controles">
          <button class="est-btn" onclick="alterarEstoque('${tipo}', -1)">−</button>
          <input type="number" id="estoque-${tipo}" class="est-input ${critico ? 'est-input-critico' : ''}" value="${qtd}" min="0">
          <button class="est-btn" onclick="alterarEstoque('${tipo}', 1)">+</button>
        </div>
      </div>`;
  }).join('');
}

function alterarEstoque(tipo, valor) {
  const input = document.getElementById(`estoque-${tipo}`);
  let qtd = parseInt(input.value) || 0;
  qtd = Math.max(0, qtd + valor);
  input.value = qtd;
}

async function salvarEstoque() {
  const novoEstoque = {};
  TIPOS_SANGUINEOS.forEach(tipo => {
    novoEstoque[tipo] = parseInt(document.getElementById(`estoque-${tipo}`).value) || 0;
  });

  const { error } = await client.from('hemocentros')
    .update({ estoque: novoEstoque }).eq('id', hemocentroLogado.id);

  if (error) { toast('Erro ao salvar estoque!'); return; }

  hemocentroLogado.estoque = novoEstoque;
  renderEstoque();
  renderAlertasEstoque();
  // Re-registra leitor após re-render do estoque
  const telaEst = document.getElementById('screen-estoque');
  if (telaEst) ativarLeitorNaTelaAtual(telaEst);

  const msg = document.getElementById('mensagem-estoque');
  msg.innerHTML = '✅ Estoque atualizado com sucesso!';
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 3000);

  toast('Estoque atualizado!');
}

function renderAlertasEstoque() {
  const container     = document.getElementById('alertas-estoque');
  const estoque       = hemocentroLogado.estoque || {};
  const tiposCriticos = TIPOS_SANGUINEOS.filter(tipo => (estoque[tipo] || 0) < LIMITE_CRITICO);

  if (tiposCriticos.length === 0) {
    container.innerHTML = `<div class="alerta-ok">✅ Todos os estoques estão normais.</div>`;
    return;
  }
  container.innerHTML = tiposCriticos.map(tipo =>
    `<div class="alerta-item">⚠️ Estoque crítico: <strong>${tipo}</strong></div>`
  ).join('');
}

/* ──────────── EDITAR PERFIL DOADOR ──────────── */

function irEditarPerfil() {
  document.getElementById('edit-nome').value     = usuarioLogado.nome;
  document.getElementById('edit-idade').value    = usuarioLogado.idade;
  document.getElementById('edit-tipo').value     = usuarioLogado.tipo_sanguineo;
  document.getElementById('edit-telefone').value = usuarioLogado.telefone;
  ir('screen-editar-perfil');
}

async function salvarEdicao() {
  const nome     = document.getElementById('edit-nome').value;
  const idade    = document.getElementById('edit-idade').value;
  const tipo     = document.getElementById('edit-tipo').value;
  const telefone = document.getElementById('edit-telefone').value;

  const { error } = await client.from('usuarios')
    .update({ nome, idade, tipo_sanguineo: tipo, telefone })
    .eq('email', usuarioLogado.email);

  if (error) { toast('Erro ao salvar!'); return; }

  Object.assign(usuarioLogado, { nome, idade, tipo_sanguineo: tipo, telefone });
  toast('Perfil atualizado!');
  irPerfil();
}

/* ──────────── EXCLUIR CONTA ──────────── */

function abrirModalExcluir() { abrirModal('modal-excluir'); }

async function excluirConta() {
  await client.from('agendamentos').delete().eq('usuario_email', usuarioLogado.email);
  await client.from('usuarios').delete().eq('email', usuarioLogado.email);
  fecharModal('modal-excluir');
  toast('Conta excluída!');
  setTimeout(() => fazerLogout(), 1500);
}

/* ──────────── MODAIS ──────────── */

function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function fecharModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});