# language: pt
Funcionalidade: Autenticação de Usuários
  Como um usuário do sistema
  Quero fazer login com minhas credenciais
  Para acessar o sistema de gerenciamento de imóveis

  Contexto:
    Dado que estou na página de login

  Cenário: Login com sucesso - Usuário Admin
    Quando preencho o campo "Usuário" com "admin@teste.com"
    E preencho o campo "Senha" com "Admin@123"
    E clico no botão "Entrar"
    Então devo ser redirecionado para "/dashboard"
    E devo ver a página do dashboard

  Cenário: Login com sucesso - Usuário Financeiro
    Quando preencho o campo "Usuário" com "financeiro@teste.com"
    E preencho o campo "Senha" com "Financeiro@123"
    E clico no botão "Entrar"
    Então devo ser redirecionado para "/dashboard"
    E devo ver a página do dashboard

  Cenário: Login com credenciais inválidas
    Quando preencho o campo "Usuário" com "invalido@teste.com"
    E preencho o campo "Senha" com "SenhaErrada123"
    E clico no botão "Entrar"
    Então devo permanecer na página de login
    E devo ver uma mensagem de erro

  Cenário: Mostrar/Ocultar senha
    Quando preencho o campo "Senha" com "MinhaSenh@123"
    Então o campo senha deve estar oculto
    Quando clico no botão de visualizar senha
    Então o campo senha deve estar visível
    Quando clico no botão de visualizar senha novamente
    Então o campo senha deve estar oculto

  Cenário: Recuperar senha - Email inválido
    Quando clico em "Esqueci minha senha"
    Então devo ver o modal de recuperação de senha
    Quando preencho o email de recuperação com "email-invalido"
    E clico em "Enviar"
    Então devo ver a mensagem "Por favor, insira um e-mail válido."

  Cenário: Recuperar senha - Email válido
    Quando clico em "Esqueci minha senha"
    Então devo ver o modal de recuperação de senha
    Quando preencho o email de recuperação com "usuario@exemplo.com"
    E clico em "Enviar"
    Então devo ver a mensagem "E-mail enviado!"
    E devo ver a mensagem "Verifique sua caixa de entrada"

  Cenário: Logout
    Dado que fiz login como "admin@teste.com"
    Quando clico no menu do usuário
    E clico em "Sair"
    Então devo ser redirecionado para "/login"