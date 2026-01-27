import { Pool } from "pg";

// Singleton pattern para reusar a conexão
let pool: Pool | null = null;

/**
 * Obter pool de conexões do PostgreSQL
 * Configurado para usar IPv4 e connection pooling otimizado
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.SUPABASE_DB_URL;

    if (!connectionString || connectionString === "COLE_SUA_CONNECTION_STRING_AQUI") {
      throw new Error(
        "❌ SUPABASE_DB_URL não configurado! Configure no .env.local"
      );
    }

    // Log de conexão (apenas em desenvolvimento)
    if (process.env.NODE_ENV === "development") {
      console.log("🔌 Conectando ao PostgreSQL...");
      console.log("📍 URL:", connectionString.replace(/:[^:@]+@/, ":****@")); // Esconde senha
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Necessário para Supabase
      },
      // Preferência IPv4 para evitar problemas de rede
      host: undefined, // Deixa o driver resolver do connectionString
      // Connection pooling otimizado
      max: 10, // Máximo de conexões simultâneas
      idleTimeoutMillis: 30000, // 30 segundos
      connectionTimeoutMillis: 10000, // 10 segundos timeout
    });

    // Event handlers para debug
    pool.on("error", (err) => {
      console.error("❌ Unexpected database error:", err);
    });

    pool.on("connect", () => {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Database connected successfully");
      }
    });
  }

  return pool;
}

/**
 * Executar query no PostgreSQL
 */
export async function query(text: string, params?: any[]) {
  const pool = getPool();
  
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === "development") {
      console.log(`⚡ Query executed in ${duration}ms`);
    }

    return result.rows;
  } catch (error: any) {
    console.error("❌ Query error:", error.message);
    console.error("📝 Query:", text);
    if (params) console.error("📦 Params:", params);
    throw error;
  }
}

/**
 * Fechar pool de conexões (útil para testes)
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("🔌 Database pool closed");
  }
}