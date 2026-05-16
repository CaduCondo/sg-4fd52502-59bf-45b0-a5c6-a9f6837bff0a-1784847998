const https = require('https');

const data = JSON.stringify({});

const options = {
  hostname: 'hghfvlylgnuqakwvgqvm.supabase.co',
  path: '/functions/v1/fix-specific-rentals',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnaGZ2bHlsZ251cWFrd3ZncXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NjY4ODgsImV4cCI6MjA1MjU0Mjg4OH0.BLjZ3KGJDPXvRQoQNX_K_rXIJ5xBW76YkD-_ByaRNXM',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🚀 Executando Edge Function fix-specific-rentals...\n');

const req = https.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('📊 Status Code:', res.statusCode);
    console.log('\n✅ Resposta da Edge Function:\n');
    
    try {
      const result = JSON.parse(body);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro ao executar Edge Function:', error);
});

req.write(data);
req.end();