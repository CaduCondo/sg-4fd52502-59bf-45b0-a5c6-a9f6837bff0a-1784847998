const fs = require('fs');

async function run() {
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const supabaseUrlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const supabaseKeyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    
    if (supabaseUrlMatch && supabaseKeyMatch) {
      const url = `${supabaseUrlMatch[1].trim()}/functions/v1/fix-all-rentals-payments`;
      console.log("Invocando correção no banco de dados...");
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKeyMatch[1].trim()}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.details) {
         console.log(data.details);
      }
      console.log(data.message);
    }
  } catch (e) {
    console.error("Erro ao invocar função:", e);
  }
}

run();