const https = require('https');

const options = {
  hostname: 'jxqhycivhhcfbzmfevtb.supabase.co',
  port: 443,
  path: '/functions/v1/fix-all-rentals-payments',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cWh5Y2l2aGhjZmJ6bWZldnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NjI4MTQsImV4cCI6MjA1MjUzODgxNH0.TY6Uo2Ev0O8xKvBkjcVHgz5FmQMI_a5LK-vkj1T-wds',
    'Content-Type': 'application/json'
  }
};

console.log('🔄 Iniciando correção de todos os recebimentos...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ CORREÇÃO CONCLUÍDA COM SUCESSO!\n');
        console.log('📊 RELATÓRIO GERAL:');
        console.log('━'.repeat(80));
        console.log(`📋 Total de locações analisadas: ${result.summary.totalRentals}`);
        console.log(`✅ Total de locações corrigidas: ${result.summary.totalFixed}`);
        console.log(`➕ Total de parcelas criadas: ${result.summary.paymentsCreated}`);
        console.log(`🔄 Total de parcelas atualizadas: ${result.summary.paymentsUpdated}`);
        console.log('━'.repeat(80));
        
        if (result.details && result.details.length > 0) {
          console.log('\n📝 DETALHES POR LOCAÇÃO:\n');
          
          result.details.forEach((detail, index) => {
            console.log(`\n${index + 1}. ${detail.rentalInfo}`);
            console.log(`   Alterações:`);
            detail.changes.forEach(change => {
              console.log(`   • ${change}`);
            });
          });
        }
        
        console.log('\n✨ Todas as correções foram aplicadas com sucesso!');
      } else {
        console.error('❌ ERRO:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao processar resposta:', error.message);
      console.log('Resposta bruta:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
});

req.end();