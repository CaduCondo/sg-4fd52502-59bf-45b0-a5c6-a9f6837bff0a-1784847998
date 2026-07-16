const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=============================================');
console.log('🌟 CONFIGURADOR DE AMBIENTE LOCAL 🌟');
console.log('=============================================\n');
console.log('Vamos configurar suas chaves do Supabase para rodar os testes.');
console.log('Você pode encontrar essas chaves no seu painel do Supabase em:');
console.log('Configurações (Settings) -> API\n');

rl.question('1. Cole a URL do Projeto (Ex: https://xyz.supabase.co): ', (url) => {
  rl.question('2. Cole a chave pública "anon" (começa com eyJ...): ', (anonKey) => {
    rl.question('3. Cole a chave secreta "service_role" (começa com eyJ...): ', (serviceRoleKey) => {
      
      const envContent = `NEXT_PUBLIC_SUPABASE_URL=${url.trim()}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey.trim()}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey.trim()}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
`;

      const envPath = path.join(__dirname, '..', '.env.local');
      fs.writeFileSync(envPath, envContent);
      
      console.log('\n✅ EXCELENTE! Arquivo .env.local criado com sucesso!');
      console.log('🎉 O seu VSCode está pronto para rodar os testes.');
      console.log('=============================================\n');
      
      rl.close();
    });
  });
});