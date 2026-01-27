import { Pool } from "pg";

// Singleton pattern para reusar a conexão
let pool: Pool | null = null;

export function getDbPool() {
  if (!pool) {
    const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("Database connection string not found. Please set SUPABASE_DB_URL or DATABASE_URL in .env.local");
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Necessário para Supabase
      },
      max: 10, // Máximo de conexões no pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 10 segundos de timeout
    });

    // Log de conexão
    pool.on("connect", () => {
      console.log("✅ PostgreSQL connected");
    });

    pool.on("error", (err) => {
      console.error("❌ PostgreSQL pool error:", err);
    });
  }

  return pool;
}

// Helper para queries simples
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getDbPool();
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✅ Query executed in ${duration}ms`);
    return result.rows;
  } catch (error) {
    console.error("❌ Query error:", error);
    throw error;
  }
}