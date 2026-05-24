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

/* ──────────── NAVEGAÇÃO ──────────── */

function ir(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
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

  if (!email || !senha) { toast('Preencha todos os campos!'); return; }

  // Tenta login como doador
  const { data: user } = await client
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('senha', senha)
    .maybeSingle();

  if (user) {
    usuarioLogado = user;
    hemocentroLogado = null;
    abrirMain();
    limparLogin();
    return;
  }

  // Tenta login como hemocentro
  const { data: hemo } = await client
    .from('hemocentros')
    .select('*')
    .eq('email', email)
    .eq('senha', senha)
    .maybeSingle();

  if (hemo) {
    hemocentroLogado = hemo;
    usuarioLogado = null;
    abrirMainHemo();
    limparLogin();
    return;
  }

  toast('E-mail ou senha incorretos!');
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
  document.getElementById('lista-hemocentros').innerHTML =
    '<div class="empty-state"><div class="empty-icon">🔍</div><p>Digite uma cidade para buscar hemocentros.</p></div>';

  // Carrega todos os hemocentros
  const { data, error } = await client.from('hemocentros').select('*');
  if (error) { toast('Erro ao carregar hemocentros!'); return; }
  todosHemocentros = data || [];

  ir('screen-buscar-hemo');
}

function filtrarHemocentros() {
  const termo = document.getElementById('busca-cidade').value.trim().toLowerCase();
  const lista = document.getElementById('lista-hemocentros');

  if (!termo) {
    lista.innerHTML =
      '<div class="empty-state"><div class="empty-icon">🔍</div><p>Digite uma cidade para buscar hemocentros.</p></div>';
    return;
  }

  const filtrados = todosHemocentros.filter(h =>
    (h.cidade && h.cidade.toLowerCase().includes(termo)) ||
    (h.endereco && h.endereco.toLowerCase().includes(termo)) ||
    (h.nome && h.nome.toLowerCase().includes(termo)) ||
    (h.estado && h.estado.toLowerCase().includes(termo))
  );

  if (!filtrados.length) {
    lista.innerHTML =
      '<div class="empty-state"><div class="empty-icon">😔</div><p>Nenhum hemocentro encontrado para "<strong>' + termo + '</strong>".</p></div>';
    return;
  }

  lista.innerHTML = filtrados.map(h => {
    const estoque = h.estoque || {};
    const alertas = TIPOS_SANGUINEOS.filter(t => (estoque[t] || 0) < LIMITE_CRITICO);
    const alertaHTML = alertas.length
      ? `<div class="hemo-alerta-mini">⚠️ Necessita: ${alertas.join(', ')}</div>`
      : '';
    return `
      <div class="hemo-card-busca" onclick="selecionarHemocentro(${h.id})">
        <div class="hemo-card-info">
          <div class="hemo-card-nome">${h.nome}</div>
          <div class="hemo-card-end">📍 ${h.endereco}, ${h.cidade} — ${h.estado}</div>
          <div class="hemo-card-hor">🕐 ${h.horario}</div>
          ${alertaHTML}
        </div>
        <div class="hemo-card-arrow">›</div>
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
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('ag-data').min = hoje;
  document.getElementById('ag-data').value = '';
  document.getElementById('ag-horario').value = '';

  const h = hemocentroSelecionado;
  document.getElementById('hemo-selecionado-info').innerHTML = `
    <div class="hemo-card-info">
      <div class="hemo-card-nome">${h.nome}</div>
      <div class="hemo-card-end">📍 ${h.endereco}, ${h.cidade} — ${h.estado}</div>
      <div class="hemo-card-hor">🕐 ${h.horario}</div>
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
    hemocentro_id: hemocentroSelecionado.id
  }]);

  if (error) { toast('Erro ao agendar!'); return; }

  toast('Agendamento confirmado!');
  setTimeout(() => ir('screen-main'), 1500);
}

/* ──────────── AGENDAMENTOS DOADOR ──────────── */

async function irAgendamentos() {
  await renderAgendamentos();
  agendamentoSelecionado = null;
  document.getElementById('btn-cancelar-ag').style.display = 'none';
  ir('screen-agendamentos');
}

async function renderAgendamentos() {
  const lista = document.getElementById('historico-agendamentos');
  const { data: ags, error } = await client
    .from('agendamentos').select('*').eq('usuario_email', usuarioLogado.email);

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
          <div class="ag-local">${a.local}</div>
        </div>
        <div class="ag-hora">${a.horario}</div>
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
  const lista = document.getElementById('lista-agendamentos-hemo');
  lista.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  ir('screen-agendamentos-hemo');

  const { data: ags, error } = await client
    .from('agendamentos')
    .select('*')
    .eq('hemocentro_id', hemocentroLogado.id)
    .order('data', { ascending: true });

  if (error || !ags || ags.length === 0) {
    lista.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhum agendamento encontrado.</p></div>';
    return;
  }

  lista.innerHTML = ags.map(a => {
    const [ano, mes, dia] = a.data.split('-');
    return `
      <div class="agendamento-item">
        <div>
          <div class="ag-date">${dia}/${mes}/${ano}</div>
          <div class="ag-local">👤 ${a.usuario_email}</div>
        </div>
        <div class="ag-hora">${a.horario}</div>
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
function renderAlertasEstoque() {

  const container = document.getElementById('alertas-estoque');

  if (!hemocentroLogado || !hemocentroLogado.estoque) {
    container.innerHTML = '';
    return;
  }

  const estoque = hemocentroLogado.estoque;

  const criticos = TIPOS_SANGUINEOS.filter(tipo =>
    (estoque[tipo] || 0) < LIMITE_CRITICO
  );

  if (criticos.length === 0) {

    container.innerHTML = `
      <div class="alerta-escassez"
           style="background: var(--green-light); border-color: var(--green);">

        <div class="alerta-icon">
          ✅
        </div>

        <div>
          <strong style="color: var(--green);">
            Estoque estável
          </strong>

          <p>
            Todos os tipos sanguíneos estão em nível adequado.
          </p>
        </div>

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="alerta-escassez">

      <div class="alerta-icon">
        ⚠️
      </div>

      <div>

        <strong>
          Estoque crítico
        </strong>

        <p>
          Os tipos ${criticos.join(', ')} estão abaixo do nível recomendado.
        </p>

      </div>

    </div>
  `;
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
