import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hghfvlylgnuqakwvgqvm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnaGZ2bHlsZ251cWFrd3ZncXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NjY4ODgsImV4cCI6MjA1MjU0Mjg4OH0.BLjZ3KGJDPXvRQoQNX_K_rXIJ5xBW76YkD-_ByaRNXM';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Executando Edge Function fix-specific-rentals...\n');

try {
  const { data, error } = await supabase.functions.invoke('fix-specific-rentals', {
    body: {}
  });

  if (error) {
    console.error('❌ Erro ao executar Edge Function:');
    console.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('✅ Resultado da Edge Function:\n');
  console.log(JSON.stringify(data, null, 2));
  
  process.exit(0);
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}