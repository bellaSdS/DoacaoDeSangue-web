const supabaseUrl = 'https://jecudcxdkgxsfijikach.supabase.co';
const supabaseKey = 'sb_publishable_PxaejCQl5ylpNDAafFgfeQ_Y6o8fM2M';

const { createClient } = supabase;

const client = createClient(
  supabaseUrl,
  supabaseKey
);

console.log("Supabase conectado");

let usuarioLogado = null;
let agendamentoSelecionado = null;

/* NAVEGAÇÃO */

function ir(id) {
  document.querySelectorAll('.screen')
    .forEach(s => s.classList.remove('active'));

  document.getElementById(id)
    .classList.add('active');
}

/* TOAST */

function toast(msg, dur = 3000) {
  const t = document.getElementById('toast');

  t.textContent = msg;
  t.classList.add('show');

  setTimeout(() => {
    t.classList.remove('show');
  }, dur);
}

/* LOGIN */

async function fazerLogin() {

  const email = document.getElementById('login-email').value.trim();

  const senha = document.getElementById('login-senha').value;

  if (!email || !senha) {
    toast('Preencha todos os campos!');
    return;
  }

  const { data: user, error } = await client
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('senha', senha)
    .single();

  if (error || !user) {
    toast('E-mail ou senha incorretos!');
    return;
  }

  usuarioLogado = user;

  abrirMain();
}

/* MAIN */

function abrirMain() {

  document.getElementById('main-nome').textContent =
    usuarioLogado.nome;

  document.getElementById('main-tipo').textContent =
    usuarioLogado.tipo_sanguineo;

  ir('screen-main');

  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
}

function fazerLogout() {
  usuarioLogado = null;
  ir('screen-login');
}

/* CADASTRO */

async function salvarCadastro() {

  const nome =
    document.getElementById('cad-nome').value.trim();

  const idade =
    document.getElementById('cad-idade').value;

  const tipo =
    document.getElementById('cad-tipo').value;

  const telefone =
    document.getElementById('cad-telefone').value.trim();

  const email =
    document.getElementById('cad-email').value.trim();

  const senha =
    document.getElementById('cad-senha').value;

  const confirmar =
    document.getElementById('cad-confirmar').value;

  if (!nome || !idade || !tipo || !telefone || !email || !senha) {
    toast('Preencha todos os campos!');
    return;
  }

  if (senha !== confirmar) {
    toast('As senhas não coincidem!');
    return;
  }

  if (parseInt(idade) < 16 || parseInt(idade) > 69) {
    toast('Idade deve ser entre 16 e 69 anos!');
    return;
  }

  const { data: existente } = await client
    .from('usuarios')
    .select('*')
    .eq('email', email);

  if (existente.length > 0) {
    toast('E-mail já cadastrado!');
    return;
  }

  const { error } = await client
    .from('usuarios')
    .insert([
      {
        nome,
        idade: parseInt(idade),
        tipo_sanguineo: tipo,
        telefone,
        email,
        senha
      }
    ]);

  if (error) {
    toast('Erro ao cadastrar!');
    return;
  }

  toast('Cadastro realizado!');

  setTimeout(() => {
    ir('screen-login');
  }, 1500);

  document.getElementById('cad-nome').value = '';
document.getElementById('cad-idade').value = '';
document.getElementById('cad-tipo').value = '';
document.getElementById('cad-telefone').value = '';
document.getElementById('cad-email').value = '';
document.getElementById('cad-senha').value = '';
document.getElementById('cad-confirmar').value = '';
}

/* AGENDAR */

function irAgendar() {

  const hoje = new Date()
    .toISOString()
    .split('T')[0];

  document.getElementById('ag-data').min = hoje;

  ir('screen-agendar');
}

async function confirmarAgendamento() {

  const data =
    document.getElementById('ag-data').value;

  const horario =
    document.getElementById('ag-horario').value;

  const local =
    document.getElementById('ag-local').value;

  if (!data || !horario) {
    toast('Selecione data e horário!');
    return;
  }

  const { error } = await client
    .from('agendamentos')
    .insert([
      {
        usuario_email: usuarioLogado.email,
        data,
        horario,
        local
      }
    ]);

  if (error) {
    toast('Erro ao agendar!');
    return;
  }

  toast('Agendamento confirmado!');

  setTimeout(() => {
    ir('screen-main');
  }, 1500);
}

/* AGENDAMENTOS */

async function irAgendamentos() {

  await renderAgendamentos();

  agendamentoSelecionado = null;

  document.getElementById('btn-cancelar-ag')
    .style.display = 'none';

  ir('screen-agendamentos');
}

async function renderAgendamentos() {

  const lista =
    document.getElementById('historico-agendamentos');

  const { data: ags, error } = await client
    .from('agendamentos')
    .select('*')
    .eq('usuario_email', usuarioLogado.email);

  if (error || !ags || ags.length === 0) {

    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>Nenhum agendamento encontrado.</p>
      </div>
    `;

    return;
  }

  lista.innerHTML = ags.map(a => {

    const [ano, mes, dia] = a.data.split('-');

    return `
      <div class="agendamento-item"
           id="ag-item-${a.id}"
           onclick="selecionarAg(${a.id})">

        <div>
          <div class="ag-date">
            ${dia}/${mes}/${ano}
          </div>

          <div class="ag-local">
            ${a.local}
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

  document.querySelectorAll('.agendamento-item')
    .forEach(el => el.classList.remove('selected'));

  document.getElementById('ag-item-' + id)
    .classList.add('selected');

  agendamentoSelecionado = id;

  document.getElementById('btn-cancelar-ag')
    .style.display = 'block';
}

/* CANCELAR */

function abrirModalCancelar() {

  if (!agendamentoSelecionado) {
    toast('Selecione um agendamento!');
    return;
  }

  abrirModal('modal-cancelar');
}

async function cancelarAgendamento() {

  await client
    .from('agendamentos')
    .delete()
    .eq('id', agendamentoSelecionado);

  fecharModal('modal-cancelar');

  toast('Agendamento cancelado!');

  renderAgendamentos();
}

/* PERFIL */

function irPerfil() {

  const u = usuarioLogado;

  const iniciais = u.nome
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  document.getElementById('perfil-avatar').textContent =
    iniciais;

  document.getElementById('perfil-nome').textContent =
    u.nome;

  document.getElementById('perfil-email').textContent =
    u.email;

  document.getElementById('perfil-tipo').textContent =
    u.tipo_sanguineo;

  document.getElementById('perfil-idade').textContent =
    u.idade + ' anos';

  document.getElementById('perfil-telefone').textContent =
    u.telefone;

  ir('screen-perfil');
}

/* MODAIS */

function abrirModal(id) {
  document.getElementById(id)
    .classList.add('open');
}

function fecharModal(id) {
  document.getElementById(id)
    .classList.remove('open');
}

document.querySelectorAll('.modal-overlay')
  .forEach(m => {

    m.addEventListener('click', e => {

      if (e.target === m) {
        m.classList.remove('open');
      }

    });

  });

function irEditarPerfil() {

  document.getElementById('edit-nome').value =
    usuarioLogado.nome;

  document.getElementById('edit-idade').value =
    usuarioLogado.idade;

  document.getElementById('edit-tipo').value =
    usuarioLogado.tipo_sanguineo;

  document.getElementById('edit-telefone').value =
    usuarioLogado.telefone;

  ir('screen-editar-perfil');
}

async function salvarEdicao() {

  const nome =
    document.getElementById('edit-nome').value;

  const idade =
    document.getElementById('edit-idade').value;

  const tipo =
    document.getElementById('edit-tipo').value;

  const telefone =
    document.getElementById('edit-telefone').value;

  const { error } = await client
    .from('usuarios')
    .update({
      nome,
      idade,
      tipo_sanguineo: tipo,
      telefone
    })
    .eq('email', usuarioLogado.email);

  if (error) {
    toast('Erro ao salvar!');
    return;
  }

  usuarioLogado.nome = nome;
  usuarioLogado.idade = idade;
  usuarioLogado.tipo_sanguineo = tipo;
  usuarioLogado.telefone = telefone;

  toast('Perfil atualizado!');

  irPerfil();
}

function abrirModalExcluir() {
  abrirModal('modal-excluir');
}

async function excluirConta() {

  await client
    .from('agendamentos')
    .delete()
    .eq('usuario_email', usuarioLogado.email);

  await client
    .from('usuarios')
    .delete()
    .eq('email', usuarioLogado.email);

  fecharModal('modal-excluir');

  toast('Conta excluída!');

  setTimeout(() => {
    fazerLogout();
  }, 1500);
}