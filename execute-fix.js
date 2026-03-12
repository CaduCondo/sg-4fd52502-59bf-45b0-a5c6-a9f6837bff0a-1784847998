const fs = require('fs');

async function run() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const urlLine = env.split('\n').find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_URL='));
    const supabaseUrl = urlLine.split('=')[1].trim();
    
    console.log("Chamando Edge Function em:", `${supabaseUrl}/functions/v1/fix-all-rentals-payments`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/fix-all-rentals-payments`);
    const data = await response.json();
    
    if (data.logs) {
      console.log(data.logs.join('\n'));
    } else {
      console.log(data);
    }
  } catch (e) {
    console.error("Erro ao invocar função:", e);
  }
}

run();