const supabaseUrl = 'https://jecudcxdkgxsfijikach.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplY3VkY3hka2d4c2ZpamlrYWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Mzc1NTIsImV4cCI6MjA5NTExMzU1Mn0.CFO1Z6NcRNxooQeB8ZOfxJ1dZ9cqOHvhyFFNEqPymGY';

const { createClient } = supabase;
const client = createClient(supabaseUrl, supabaseKey);

console.log("Supabase conectado");

let usuarioLogado = null;
let hemocentroLogado = null;
let agendamentoSelecionado = null;
let hemocentroSelecionado = null;

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const LIMITE_CRITICO = 5; // bolsas abaixo deste valor disparam alerta

/* ──────────── ACESSIBILIDADE — CONTRASTE DE CORES ──────────── */

let contrasteAtivo = false;

function toggleContraste() {
  contrasteAtivo = !contrasteAtivo;
  document.body.classList.toggle('alto-contraste', contrasteAtivo);
  const btn = document.getElementById('btn-contraste');
  btn.setAttribute('aria-pressed', contrasteAtivo);
  btn.classList.toggle('acess-btn-ativo', contrasteAtivo);
  localStorage.setItem('contraste', contrasteAtivo ? '1' : '0');
  anunciar(contrasteAtivo ? 'Alto contraste ativado' : 'Alto contraste desativado');
}

// Restaurar preferência de contraste salva
if (localStorage.getItem('contraste') === '1') {
  document.body.classList.add('alto-contraste');
  contrasteAtivo = true;
}

/* ──────────── ACESSIBILIDADE — TRANSCRIÇÃO DE ÁUDIO (TTS) ──────────── */

let audioAtivo = false;
let synth = window.speechSynthesis;
let vozPT = null;

// Carrega vozes e prioriza pt-BR
function carregarVoz() {
  const vozes = synth.getVoices();
  vozPT = vozes.find(v => v.lang === 'pt-BR') ||
          vozes.find(v => v.lang.startsWith('pt')) ||
          vozes[0] || null;
}
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = carregarVoz;
carregarVoz();

function toggleAudio() {
  audioAtivo = !audioAtivo;

  const btn = document.getElementById('btn-audio');
  btn.setAttribute('aria-pressed', audioAtivo);
  btn.classList.toggle('acess-btn-ativo', audioAtivo);

  localStorage.setItem('audio', audioAtivo ? '1' : '0');

  falar(
    audioAtivo ? 'Narração por voz ativada' : 'Narração por voz desativada',
    true
  );
}

function falar(texto, forcar = false) {
  if ((!audioAtivo && !forcar) || !synth) return;

  synth.cancel();
  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = 'pt-BR';
  if (vozPT) utter.voice = vozPT;
  utter.rate = 1;
  utter.pitch = 1;
  synth.speak(utter);
}

// Narração automática ao trocar de tela
function anunciar(texto) {
  document.getElementById('aria-announcer').textContent = '';
  setTimeout(() => { document.getElementById('aria-announcer').textContent = texto; }, 50);
  falar(texto);
}

// Restaura preferências salvas ao carregar
(function restaurarPreferencias() {
  if (localStorage.getItem('contraste') === '1') toggleContraste();
  if (localStorage.getItem('audio') === '1') {
    audioAtivo = true;
    const btn = document.getElementById('btn-audio');
    if (btn) { btn.setAttribute('aria-pressed', true); btn.classList.add('acess-btn-ativo'); }
  }
})();

/* ──────────── LEITURA AUTOMÁTICA DE ELEMENTOS ──────────── */

function inicializarLeituraAcessivel() {

  const elementosFocaveis = document.querySelectorAll('button, input, select, a, .escolha-card, .hemo-card-busca, h2, h3, .screen p, .screen span, strong');

  elementosFocaveis.forEach(el => {
    const dispararLeitura = (e) => {
      if (!audioAtivo) return;
      
      // Impede que o som seja duplicado se passar o mouse em elementos filhos
      e.stopPropagation();

      let textoParaFalar = "";

      if (el.tagName === 'INPUT') {
        const label = el.previousElementSibling?.tagName === 'LABEL' ? el.previousElementSibling.textContent : "";
        textoParaFalar = `Campo de entrada: ${label}. ${el.placeholder || ''}`;
      } else if (el.tagName === 'SELECT') {
        const label = el.previousElementSibling?.tagName === 'LABEL' ? el.previousElementSibling.textContent : "";
        textoParaFalar = `Caixa de seleção: ${label}`;
      } else {
        textoParaFalar = el.textContent || el.innerText;
      }

      if (textoParaFalar.trim().length > 0) {
        falar(textoParaFalar);
      }
    };

    el.addEventListener('mouseenter', dispararLeitura);
    el.addEventListener('focus', dispararLeitura);
  });
}

/* ──────────── NAVEGAÇÃO ──────────── */

function ir(id) {
  const novaTela = document.getElementById(id);
  
  // Segurança: Se a tela não existir no HTML, avisa no console e não trava o sistema
  if (!novaTela) {
    console.error(`A tela com o ID "${id}" não foi encontrada no HTML.`);
    return;
  }

  // Remove o active de todas as telas
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  
  // Ativa a nova tela
  novaTela.classList.add('active');

  // Descobre o título da nova tela para narrar ao usuário (Acessibilidade)
  const tituloTela = novaTela.querySelector('h2, .screen-title, h3')?.textContent || "Nova tela carregada";
  
  // Anuncia a mudança de tela
  anunciar(`Entrou na tela: ${tituloTela}`);
}

/* ──────────── TOAST ──────────── */

function toast(msg, dur = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

/* ──────────── LOGIN ──────────── */

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  console.log("Tentando login:", email, senha);

  const { data: user, error } = await client
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('senha', senha)
    .maybeSingle();

  console.log("USER:", user);
  console.log("ERROR:", error);

  if (user) {
    usuarioLogado = user;
    abrirMain();
    return;
  }

  const { data: hemo, error: error2 } = await client
    .from('hemocentros')
    .select('*')
    .eq('email', email)
    .eq('senha', senha)
    .maybeSingle();

  console.log("HEMO:", hemo);
  console.log("ERROR2:", error2);

  if (hemo) {
    hemocentroLogado = hemo;
    abrirMainHemo();
    return;
  }

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

  const textoBoasVindas = `Olá, ${usuarioLogado.nome}. Bem-vindo ao seu painel. Seu tipo sanguíneo cadastrado é ${usuarioLogado.tipo_sanguineo}.`;
  anunciar(textoBoasVindas);
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

  if (!nome || !idade || !tipo || !telefone || !email || !senha) {
    toast('Preencha todos os campos!'); return;
  }
  if (senha !== confirmar) { toast('As senhas não coincidem!'); return; }
  if (parseInt(idade) < 16 || parseInt(idade) > 69) {
    toast('Idade deve ser entre 16 e 69 anos!'); return;
  }

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

  // Estoque inicial zerado para todos os tipos
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

  // Carrega todos os hemocentros
  const { data, error } = await client
    .from('hemocentros')
    .select('*');

  if (error) {

    toast('Erro ao carregar hemocentros!');
    return;
  }

  todosHemocentros = data || [];

  // renderiza TODOS
  renderListaHemocentros(todosHemocentros);

  ir('screen-buscar-hemo');
}

function filtrarHemocentros() {

  const termo =
    document.getElementById('busca-cidade')
    .value
    .trim()
    .toLowerCase();

  // se vazio → mostra todos
  if (!termo) {

    renderListaHemocentros(todosHemocentros);
    return;
  }

  const filtrados = todosHemocentros.filter(h =>

    (h.cidade &&
      h.cidade.toLowerCase().includes(termo))

    ||

    (h.endereco &&
      h.endereco.toLowerCase().includes(termo))

    ||

    (h.nome &&
      h.nome.toLowerCase().includes(termo))

    ||

    (h.estado &&
      h.estado.toLowerCase().includes(termo))

  );

  renderListaHemocentros(filtrados);
}

function renderListaHemocentros(listaHemocentros) {

  const lista =
    document.getElementById('lista-hemocentros');

  if (!listaHemocentros.length) {

    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😔</div>
        <p>Nenhum hemocentro encontrado.</p>
      </div>
    `;

    return;
  }

  lista.innerHTML = listaHemocentros.map(h => {

    const estoque = h.estoque || {};

    const alertas =
      TIPOS_SANGUINEOS.filter(tipo =>
        (estoque[tipo] || 0) < LIMITE_CRITICO
      );

    const alertaHTML = alertas.length
      ? `
        <div class="hemo-alerta-mini">
          ⚠️ Necessita:
          ${alertas.join(', ')}
        </div>
      `
      : '';

    return `
      <div class="hemo-card-busca"
           onclick="selecionarHemocentro(${h.id})">

        <div class="hemo-card-info">

          <div class="hemo-card-nome">
            ${h.nome}
          </div>

          <div class="hemo-card-end">
            📍 ${h.endereco},
            ${h.cidade} — ${h.estado}
          </div>

          <div class="hemo-card-hor">
            🕐 ${h.horario}
          </div>

          ${alertaHTML}

        </div>

        <div class="hemo-card-arrow">
          ›
        </div>

      </div>
    `;

  }).join('');
}

function selecionarHemocentro(id) {
  hemocentroSelecionado = todosHemocentros.find(h => h.id === id);
  if (!hemocentroSelecionado) return;
  irAgendar();
}

/* ──────────── AGENDAR ──────────── */

function irAgendar() {

  const hoje =
    new Date().toISOString().split('T')[0];

  document.getElementById('ag-data').min = hoje;

  document.getElementById('ag-data').value = '';

  document.getElementById('ag-horario').value = '';

  const h = hemocentroSelecionado;

  // ALERTAS DE ESTOQUE
  const estoque = h.estoque || {};

  const alertas =
    TIPOS_SANGUINEOS.filter(tipo =>
      (estoque[tipo] || 0) < LIMITE_CRITICO
    );

  const alertaHTML = alertas.length
    ? `
      <div class="hemo-alerta-mini">
        ⚠️ Necessita:
        ${alertas.join(', ')}
      </div>
    `
    : '';

  document.getElementById(
    'hemo-selecionado-info'
  ).innerHTML = `

    <div class="hemo-card-info">

      <div class="hemo-card-nome">
        ${h.nome}
      </div>

      <div class="hemo-card-end">
        📍 ${h.endereco},
        ${h.cidade} — ${h.estado}
      </div>

      <div class="hemo-card-hor">
        🕐 ${h.horario}
      </div>

      ${alertaHTML}

    </div>
  `;

  ir('screen-agendar');
}

async function confirmarAgendamento() {
  const data    = document.getElementById('ag-data').value;
  const horario = document.getElementById('ag-horario').value;

  if (!data || !horario) { toast('Selecione data e horário!'); return; }
  if (!hemocentroSelecionado) { toast('Nenhum hemocentro selecionado!'); return; }

  const { error } = await client.from('agendamentos').insert([{
    usuario_email: usuarioLogado.email,
    data,
    horario,
    local: hemocentroSelecionado.nome,
    endereco: hemocentroSelecionado.endereco,
    cidade: hemocentroSelecionado.cidade,
    estado: hemocentroSelecionado.estado,
    horario_atendimento: hemocentroSelecionado.horario,
    telefone: hemocentroSelecionado.telefone,
    hemocentro_id: hemocentroSelecionado.id
  }]);

  if (error) { toast('Erro ao agendar!'); return; }

  toast('Agendamento confirmado!');
  setTimeout(() => ir('screen-main'), 1500);
}

/* ──────────── AGENDAMENTOS DOADOR ──────────── */
async function irAgendamentos() {

  agendamentoSelecionado = null;

  const btn =
    document.getElementById('btn-cancelar-ag');

  if (btn) {
    btn.style.display = 'none';
  }

  await renderAgendamentos();

  ir('screen-agendamentos');
}

async function renderAgendamentos() {

  const lista =
    document.getElementById(
      'historico-agendamentos'
    );

  const { data: ags, error } = await client
    .from('agendamentos')
    .select('*')
    .eq(
      'usuario_email',
      usuarioLogado.email
    );

  if (error || !ags || ags.length === 0) {

    lista.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          📅
        </div>

        <p>
          Nenhum agendamento encontrado.
        </p>

      </div>
    `;

    return;
  }

  lista.innerHTML = ags.map(a => {

    const [ano, mes, dia] =
      a.data.split('-');

    return `

      <div class="agendamento-item"
           id="ag-item-${a.id}"
           onclick="selecionarAg(${a.id})">

        <div>

          <div class="ag-date">
            ${dia}/${mes}/${ano}
          </div>

          <div class="ag-local">
            🏥 ${a.local}
          </div>

          <div class="ag-info-extra">
            📍 ${a.endereco || 'Endereço não informado'},
            ${a.cidade || ''}
            ${a.estado || ''}
          </div>

          <div class="ag-info-extra">
            🕐 Atendimento:
            ${a.horario_atendimento || 'Não informado'}
          </div>

          <div class="ag-info-extra">
            📞 Telefone:
            ${a.telefone || 'Não informado'}
          </div>

        </div>

        <div class="ag-hora">
          ${a.horario}
        </div>

      </div>

    `;

  }).join('');
}

function selecionarAg(id) {
  document.querySelectorAll('.agendamento-item').forEach(el => el.classList.remove('selected'));
  document.getElementById('ag-item-' + id).classList.add('selected');
  agendamentoSelecionado = id;
  document.getElementById('btn-cancelar-ag').style.display = 'block';
}

/* ──────────── AGENDAMENTOS HEMOCENTRO ──────────── */

async function irAgendamentosHemo() {

  const lista =
    document.getElementById(
      'lista-agendamentos-hemo'
    );

  lista.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>Carregando...</p>
    </div>
  `;

  ir('screen-agendamentos-hemo');

  // busca agendamentos
  const { data: ags, error } = await client
    .from('agendamentos')
    .select('*')
    .eq(
      'hemocentro_id',
      hemocentroLogado.id
    )
    .order('data', {
      ascending: true
    });

  if (error || !ags || ags.length === 0) {

    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>Nenhum agendamento encontrado.</p>
      </div>
    `;

    return;
  }

  // busca dados dos usuários
  const emails = [
  ...new Set(
    ags
      .map(a => a.usuario_email)
      .filter(e => e)
  )
];

const { data: usuarios, error: erroUsuarios } =
  await client
    .from('usuarios')
    .select('*')
    .in('email', emails);

if (erroUsuarios) {

  console.error(erroUsuarios);

  toast('Erro ao carregar usuários!');

  return;
}

  lista.innerHTML = ags.map(a => {

    const usuario =
      usuarios.find(
        u => u.email === a.usuario_email
      );

    const [ano, mes, dia] =
      a.data.split('-');

    return `
      <div class="agendamento-item">

        <div>

          <div class="ag-date">
            ${dia}/${mes}/${ano}
          </div>

          <div class="ag-local">
            👤 ${usuario?.nome || 'Usuário'}
          </div>

          <div class="ag-info-extra">
            📧 ${usuario?.email || 'Não informado'}
          </div>

          <div class="ag-info-extra">
            🩸 Tipo sanguíneo:
            ${usuario?.tipo_sanguineo || 'Não informado'}
          </div>

          <div class="ag-info-extra">
            🎂 Idade:
            ${usuario?.idade || 'Não informado'}
          </div>

          <div class="ag-info-extra">
            📞 Telefone:
            ${usuario?.telefone || 'Não informado'}
          </div>

        </div>

        <div class="ag-hora">
          ${a.horario}
        </div>

      </div>
    `;

  }).join('');
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
  document.getElementById('perfil-avatar').textContent = iniciais;
  document.getElementById('perfil-nome').textContent = u.nome;
  document.getElementById('perfil-email').textContent = u.email;
  document.getElementById('perfil-tipo').textContent = u.tipo_sanguineo;
  document.getElementById('perfil-idade').textContent = u.idade + ' anos';
  document.getElementById('perfil-telefone').textContent = u.telefone;
  ir('screen-perfil');
}

/* ──────────── PERFIL HEMOCENTRO ──────────── */

async function irPerfilHemo() {

  const { data: hemo } = await client
    .from('hemocentros')
    .select('*')
    .eq('id', hemocentroLogado.id)
    .maybeSingle();

  if (hemo) hemocentroLogado = hemo;

  const h = hemocentroLogado;

  const iniciais = h.nome
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // VERIFICA se os elementos existem antes de usar
  const avatar = document.getElementById('hemo-avatar-initials');
  const nome = document.getElementById('hemo-perfil-nome');
  const endereco = document.getElementById('hemo-perfil-endereco');
  const cidade = document.getElementById('hemo-perfil-cidade');
  const resp = document.getElementById('hemo-perfil-resp');
  const tel = document.getElementById('hemo-perfil-tel');
  const horario = document.getElementById('hemo-perfil-horario');
  const email = document.getElementById('hemo-perfil-email');

  if (avatar) avatar.textContent = iniciais;
  if (nome) nome.textContent = h.nome;
  if (endereco) endereco.textContent = h.endereco;
  if (cidade) cidade.textContent = h.cidade + ' — ' + h.estado;
  if (resp) resp.textContent = h.responsavel;
  if (tel) tel.textContent = h.telefone;
  if (horario) horario.textContent = h.horario;
  if (email) email.textContent = h.email;

  ir('screen-perfil-hemo');
}

/* ──────────── EDITAR HEMOCENTRO ──────────── */

function irEditarHemo() {

  const h = hemocentroLogado;

  const nome = document.getElementById('edit-hemo-nome');
  const responsavel = document.getElementById('edit-hemo-responsavel');
  const telefone = document.getElementById('edit-hemo-telefone');
  const endereco = document.getElementById('edit-hemo-endereco');
  const cidade = document.getElementById('edit-hemo-cidade');
  const estado = document.getElementById('edit-hemo-estado');
  const horario = document.getElementById('edit-hemo-horario');

  if (nome) nome.value = h.nome;
  if (responsavel) responsavel.value = h.responsavel;
  if (telefone) telefone.value = h.telefone;
  if (endereco) endereco.value = h.endereco;
  if (cidade) cidade.value = h.cidade;
  if (estado) estado.value = h.estado;
  if (horario) horario.value = h.horario;

  ir('screen-editar-hemo');
}

/* ──────────── SALVAR EDIÇÃO HEMOCENTRO ──────────── */
async function salvarEdicaoHemo() {

  const nome = document.getElementById('edit-hemo-nome').value;
  const responsavel = document.getElementById('edit-hemo-responsavel').value;
  const telefone = document.getElementById('edit-hemo-telefone').value;
  const endereco = document.getElementById('edit-hemo-endereco').value;
  const cidade = document.getElementById('edit-hemo-cidade').value;
  const estado = document.getElementById('edit-hemo-estado').value;
  const horario = document.getElementById('edit-hemo-horario').value;

  const { error } = await client
    .from('hemocentros')
    .update({
      nome,
      responsavel,
      telefone,
      endereco,
      cidade,
      estado,
      horario
    })
    .eq('id', hemocentroLogado.id);

  if (error) {
    toast('Erro ao atualizar hemocentro!');
    return;
  }

  Object.assign(hemocentroLogado, {
    nome,
    responsavel,
    telefone,
    endereco,
    cidade,
    estado,
    horario
  });

  toast('Perfil atualizado!');
  irPerfilHemo();
}

/* ──────────── EXCLUIR HEMOCENTRO ──────────── */

async function excluirHemocentro() {

  const confirmar = confirm(
    'Tem certeza que deseja excluir o hemocentro? Esta ação não pode ser desfeita.'
  );

  if (!confirmar) return;

  // Remove agendamentos vinculados
  await client
    .from('agendamentos')
    .delete()
    .eq('hemocentro_id', hemocentroLogado.id);

  // Remove hemocentro
  const { error } = await client
    .from('hemocentros')
    .delete()
    .eq('id', hemocentroLogado.id);

  if (error) {
    toast('Erro ao excluir hemocentro!');
    return;
  }

  toast('Hemocentro removido com sucesso!');

  hemocentroLogado = null;

  setTimeout(() => {
    ir('screen-login');
  }, 1500);
}

/* ──────────── ESTOQUE HEMOCENTRO ──────────── */
function abrirEstoque(){

  renderEstoque();
  renderAlertasEstoque();

  ir('screen-estoque');
}

function renderEstoque() {

  const grid = document.getElementById('estoque-grid');

  const estoque = hemocentroLogado.estoque || {};

  grid.innerHTML = TIPOS_SANGUINEOS.map(tipo => {

    const qtd = estoque[tipo];

    const critico = qtd < LIMITE_CRITICO;

    return `
      <div class="estoque-item ${critico ? 'critico' : ''}">

        <div class="estoque-tipo">
          ${tipo}
        </div>

        <div class="${critico ? 'estoque-badge-alerta' : 'estoque-badge-ok'}">
          ${critico ? 'Crítico' : 'Normal'}
        </div>

        <div class="estoque-controles">

          <button class="est-btn"
                  onclick="alterarEstoque('${tipo}', -1)">
            −
          </button>

          <input type="number"
                 id="estoque-${tipo}"
                 class="est-input ${critico ? 'est-input-critico' : ''}"
                  value="${qtd ?? ''}"
                 min="0">

          <button class="est-btn"
                  onclick="alterarEstoque('${tipo}', 1)">
            +
          </button>

        </div>

      </div>
    `;
  }).join('');
}

function alterarEstoque(tipo, valor) {

  const input = document.getElementById(`estoque-${tipo}`);

  let qtd = parseInt(input.value) || 0;

  qtd += valor;

  if (qtd < 0) qtd = 0;

  input.value = qtd;
}

async function salvarEstoque() {

  const novoEstoque = {};

  TIPOS_SANGUINEOS.forEach(tipo => {

    novoEstoque[tipo] =
      parseInt(
        document.getElementById(`estoque-${tipo}`).value
      ) || 0;

  });

  // salva no banco
  const { error } = await client
    .from('hemocentros')
    .update({
      estoque: novoEstoque
    })
    .eq('id', hemocentroLogado.id);

  // erro
  if (error) {

    toast('Erro ao salvar estoque!');
    return;
  }

  // atualiza objeto local
  hemocentroLogado.estoque = novoEstoque;

  // rerender
  renderEstoque();
  renderAlertasEstoque();

  // mensagem visual
  const msg =
    document.getElementById("mensagem-estoque");

  msg.innerHTML =
    "✅ Estoque atualizado com sucesso!";

  msg.classList.add("show");

  setTimeout(() => {

    msg.classList.remove("show");

  }, 3000);

  // toast
  toast('Estoque atualizado!');
}

function renderAlertasEstoque() {

  const container =
    document.getElementById('alertas-estoque');

  const estoque =
    hemocentroLogado.estoque || {};

  const tiposCriticos =
    TIPOS_SANGUINEOS.filter(tipo => {

      return (estoque[tipo] || 0) < LIMITE_CRITICO;

    });

  // sem alertas
  if (tiposCriticos.length === 0) {

    container.innerHTML = `
      <div class="alerta-ok">
        ✅ Todos os estoques estão normais.
      </div>
    `;

    return;
  }

  // com alertas
  container.innerHTML = tiposCriticos.map(tipo => {

    return `
      <div class="alerta-item">
        ⚠️ Estoque crítico:
        <strong>${tipo}</strong>
      </div>
    `;

  }).join('');
}

/* ──────────── EDITAR PERFIL DOADOR ──────────── */

function irEditarPerfil() {
  document.getElementById('edit-nome').value = usuarioLogado.nome;
  document.getElementById('edit-idade').value = usuarioLogado.idade;
  document.getElementById('edit-tipo').value = usuarioLogado.tipo_sanguineo;
  document.getElementById('edit-telefone').value = usuarioLogado.telefone;
  ir('screen-editar-perfil');
}

async function salvarEdicao() {
  const nome     = document.getElementById('edit-nome').value;
  const idade    = document.getElementById('edit-idade').value;
  const tipo     = document.getElementById('edit-tipo').value;
  const telefone = document.getElementById('edit-telefone').value;

  const { error } = await client
    .from('usuarios')
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
