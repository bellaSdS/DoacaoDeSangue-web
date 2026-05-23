function getUsuarios(){return JSON.parse(localStorage.getItem('usuarios')||'[]');}
function setUsuarios(u){localStorage.setItem('usuarios',JSON.stringify(u));}
function getAgendamentos(){return JSON.parse(localStorage.getItem('agendamentos')||'[]');}
function setAgendamentos(a){localStorage.setItem('agendamentos',JSON.stringify(a));}

let usuarioLogado=null, agendamentoSelecionado=null;

function ir(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function toast(msg,dur=3000){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),dur);
}

function fazerLogin(){
  const email=document.getElementById('login-email').value.trim();
  const senha=document.getElementById('login-senha').value;
  if(!email||!senha){toast('Preencha todos os campos!');return;}
  const user=getUsuarios().find(u=>u.email===email&&u.senha===senha);
  if(!user){toast('E-mail ou senha incorretos!');return;}
  usuarioLogado=user; abrirMain();
}

function abrirMain(){
  document.getElementById('main-nome').textContent=usuarioLogado.nome;
  document.getElementById('main-tipo').textContent=usuarioLogado.tipoSanguineo;
  ir('screen-main');
  document.getElementById('login-email').value='';
  document.getElementById('login-senha').value='';
}

function fazerLogout(){usuarioLogado=null;ir('screen-login');}

function salvarCadastro(){
  const nome=document.getElementById('cad-nome').value.trim();
  const idade=document.getElementById('cad-idade').value;
  const tipo=document.getElementById('cad-tipo').value;
  const telefone=document.getElementById('cad-telefone').value.trim();
  const email=document.getElementById('cad-email').value.trim();
  const senha=document.getElementById('cad-senha').value;
  const confirmar=document.getElementById('cad-confirmar').value;
  if(!nome||!idade||!tipo||!telefone||!email||!senha){toast('Preencha todos os campos!');return;}
  if(senha!==confirmar){toast('As senhas não coincidem!');return;}
  if(parseInt(idade)<16||parseInt(idade)>69){toast('Idade deve ser entre 16 e 69 anos!');return;}
  const usuarios=getUsuarios();
  if(usuarios.find(u=>u.email===email)){toast('E-mail já cadastrado!');return;}
  usuarios.push({nome,idade:parseInt(idade),tipoSanguineo:tipo,telefone,email,senha});
  setUsuarios(usuarios);
  toast('Cadastro realizado! Faça login.');
  ['cad-nome','cad-idade','cad-telefone','cad-email','cad-senha','cad-confirmar'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cad-tipo').value='';
  setTimeout(()=>ir('screen-login'),1500);
}

function irAgendar(){
  const hoje=new Date().toISOString().split('T')[0];
  document.getElementById('ag-data').min=hoje;
  document.getElementById('ag-data').value='';
  document.getElementById('ag-horario').value='';
  ir('screen-agendar');
}

function confirmarAgendamento(){
  const data=document.getElementById('ag-data').value;
  const horario=document.getElementById('ag-horario').value;
  const local=document.getElementById('ag-local').value;
  if(!data||!horario){toast('Selecione data e horário!');return;}
  const agendamentos=getAgendamentos();
  agendamentos.push({id:Date.now(),usuarioEmail:usuarioLogado.email,data,horario,local});
  setAgendamentos(agendamentos);
  const [ano,mes,dia]=data.split('-');
  toast('✔ Agendamento confirmado!\n'+dia+'/'+mes+'/'+ano+' às '+horario);
  setTimeout(()=>ir('screen-main'),2000);
}

function irAgendamentos(){
  renderAgendamentos(); agendamentoSelecionado=null;
  document.getElementById('btn-cancelar-ag').style.display='none';
  ir('screen-agendamentos');
}

function renderAgendamentos(){
  const lista=document.getElementById('agendamentos-lista');
  const ags=getAgendamentos().filter(a=>a.usuarioEmail===usuarioLogado.email);
  if(!ags.length){
    lista.innerHTML='<div class="empty-state"><div class="empty-icon">📅</div><p>Nenhum agendamento encontrado.</p></div>';
    return;
  }
  lista.innerHTML=ags.map(a=>{
    const [ano,mes,dia]=a.data.split('-');
    return '<div class="agendamento-item" id="ag-item-'+a.id+'" onclick="selecionarAg('+a.id+')"><div><div class="ag-date">'+dia+'/'+mes+'/'+ano+'</div><div class="ag-local">'+a.local+'</div></div><div class="ag-hora">'+a.horario+'</div></div>';
  }).join('');
}

function selecionarAg(id){
  document.querySelectorAll('.agendamento-item').forEach(el=>el.classList.remove('selected'));
  document.getElementById('ag-item-'+id).classList.add('selected');
  agendamentoSelecionado=id;
  document.getElementById('btn-cancelar-ag').style.display='block';
}

function abrirModalCancelar(){if(!agendamentoSelecionado){toast('Selecione um agendamento!');return;}abrirModal('modal-cancelar');}

function cancelarAgendamento(){
  setAgendamentos(getAgendamentos().filter(a=>a.id!==agendamentoSelecionado));
  agendamentoSelecionado=null;
  document.getElementById('btn-cancelar-ag').style.display='none';
  fecharModal('modal-cancelar'); renderAgendamentos();
  toast('Agendamento cancelado.');
}

function irPerfil(){
  const u=usuarioLogado;
  const iniciais=u.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  document.getElementById('perfil-avatar').textContent=iniciais;
  document.getElementById('perfil-nome').textContent=u.nome;
  document.getElementById('perfil-email').textContent=u.email;
  document.getElementById('perfil-tipo').textContent=u.tipoSanguineo;
  document.getElementById('perfil-idade').textContent=u.idade+' anos';
  document.getElementById('perfil-telefone').textContent=u.telefone;
  ir('screen-perfil');
}

function irEditarPerfil(){
  document.getElementById('edit-nome').value=usuarioLogado.nome;
  document.getElementById('edit-idade').value=usuarioLogado.idade;
  document.getElementById('edit-tipo').value=usuarioLogado.tipoSanguineo;
  document.getElementById('edit-telefone').value=usuarioLogado.telefone;
  ir('screen-editar-perfil');
}

function salvarEdicao(){
  const nome=document.getElementById('edit-nome').value.trim();
  const idade=parseInt(document.getElementById('edit-idade').value);
  const tipo=document.getElementById('edit-tipo').value;
  const telefone=document.getElementById('edit-telefone').value.trim();
  if(!nome||!idade||!tipo||!telefone){toast('Preencha todos os campos!');return;}
  if(idade<16||idade>69){toast('Idade deve ser entre 16 e 69 anos!');return;}
  const usuarios=getUsuarios();
  const idx=usuarios.findIndex(u=>u.email===usuarioLogado.email);
  if(idx!==-1){usuarios[idx]={...usuarios[idx],nome,idade,tipoSanguineo:tipo,telefone};setUsuarios(usuarios);usuarioLogado=usuarios[idx];}
  toast('Perfil atualizado!');
  setTimeout(()=>irPerfil(),1000);
}

function abrirModalExcluir(){abrirModal('modal-excluir');}

function excluirConta(){
  setUsuarios(getUsuarios().filter(u=>u.email!==usuarioLogado.email));
  setAgendamentos(getAgendamentos().filter(a=>a.usuarioEmail!==usuarioLogado.email));
  fecharModal('modal-excluir'); usuarioLogado=null;
  toast('Conta excluída.');
  setTimeout(()=>ir('screen-login'),1500);
}

function abrirModal(id){document.getElementById(id).classList.add('open');}
function fecharModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});});