const supabaseUrl = 'https://jecudcxdkgxsfijikach.supabase.co/rest/v1/';
const supabaseKey = 'sb_publishable_PxaejCQl5ylpNDAafFgfeQ_Y6o8fM2M';

const supabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

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

  const { data: user, error } = await supabase
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

  const { data: existente } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email);

  if (existente.length > 0) {
    toast('E-mail já cadastrado!');
    return;
  }

  const { error } = await supabase
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

  const { error } = await supabase
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

  const { data: ags, error } = await supabase
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

  await supabase
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