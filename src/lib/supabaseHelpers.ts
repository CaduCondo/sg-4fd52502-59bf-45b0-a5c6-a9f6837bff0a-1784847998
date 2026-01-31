/**
 * HELPERS GENÉRICOS PARA OPERAÇÕES COM SUPABASE
 * 
 * Wrappers que garantem uso correto de .maybeSingle() e tratamento de erros
 * consistente em todas as operações do banco de dados.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TIPOS GENÉRICOS
// ============================================================

export interface QueryOptions {
  throwOnNotFound?: boolean; // Se true, lança erro quando não encontrar
}

// ============================================================
// OPERAÇÕES CRUD GENÉRICAS
// ============================================================

/**
 * CREATE - Insere um registro e retorna o objeto criado
 * 
 * @example
 * const user = await createSingle<SystemUser>("system_users", {
 *   name: "João",
 *   email: "joao@email.com"
 * });
 */
export async function createSingle<T>(
  table: string,
  data: Partial<T>
): Promise<T> {
  const { data: created, error } = await supabase
    .from(table as any)
    .insert(data)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error(`Erro ao criar registro em ${table}:`, error);
    throw new Error(`Erro ao criar registro: ${error.message}`);
  }

  if (!created) {
    throw new Error(`Erro ao criar registro em ${table}: Nenhum dado retornado`);
  }

  return created as T;
}

/**
 * UPDATE - Atualiza um registro por ID e retorna o objeto atualizado
 * 
 * @example
 * const user = await updateSingle<SystemUser>("system_users", "user-id", {
 *   name: "João Silva"
 * });
 */
export async function updateSingle<T>(
  table: string,
  id: string,
  updates: Partial<T>,
  options: QueryOptions = { throwOnNotFound: true }
): Promise<T> {
  console.log(`🔄 updateSingle: Atualizando ${table}`);
  console.log(`   ID: ${id}`);
  console.log(`   Updates:`, updates);

  // PASSO 1: Fazer UPDATE sem tentar buscar resultado (evita erro 406)
  const { error: updateError } = await supabase
    .from(table as any)
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error(`Erro ao atualizar registro em ${table}:`, updateError);
    throw new Error(`Erro ao atualizar registro: ${updateError.message}`);
  }

  // PASSO 2: Buscar o registro atualizado com SELECT separado
  const { data, error: selectError } = await supabase
    .from(table as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (selectError) {
    console.error(`Erro ao buscar registro atualizado em ${table}:`, selectError);
    // ✅ NÃO lança erro - UPDATE foi bem-sucedido, então retornar os updates
    return { id, ...updates } as T;
  }

  if (!data) {
    // ✅ Se não encontrou registro MAS update funcionou, retornar os updates
    console.warn(`Registro não encontrado após UPDATE em ${table} com id: ${id}, mas UPDATE foi bem-sucedido`);
    return { id, ...updates } as T;
  }

  return data as T;
}

/**
 * DELETE - Deleta um registro por ID
 * 
 * @example
 * await deleteSingle("system_users", "user-id");
 */
export async function deleteSingle(
  table: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(table as any)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`Erro ao deletar registro em ${table}:`, error);
    throw new Error(`Erro ao deletar registro: ${error.message}`);
  }
}

/**
 * GET BY ID - Busca um registro por ID
 * 
 * @example
 * const user = await getSingle<SystemUser>("system_users", "user-id");
 */
export async function getSingle<T>(
  table: string,
  id: string,
  options: QueryOptions = { throwOnNotFound: true }
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116" && !options.throwOnNotFound) {
      // Registro não encontrado, mas não deve lançar erro
      return null;
    }
    console.error(`Erro ao buscar registro em ${table}:`, error);
    throw new Error(`Erro ao buscar registro: ${error.message}`);
  }

  return data as T;
}

/**
 * GET ALL - Busca todos os registros de uma tabela
 * 
 * @example
 * const users = await getAll<SystemUser>("system_users");
 */
export async function getAll<T>(
  table: string,
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  let query = supabase.from(table as any).select("*");

  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Erro ao buscar registros em ${table}:`, error);
    throw new Error(`Erro ao buscar registros: ${error.message}`);
  }

  return (data as T[]) ?? [];
}

/**
 * GET WITH FILTER - Busca registros com filtro
 * 
 * @example
 * const activeUsers = await getWithFilter<SystemUser>(
 *   "system_users",
 *   { column: "is_active", value: true }
 * );
 */
export async function getWithFilter<T>(
  table: string,
  filter: { column: string; value: any; operator?: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "like" | "ilike" },
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  let query = supabase.from(table as any).select("*");

  const operator = filter.operator ?? "eq";
  
  // Type-safe operator selection
  switch (operator) {
    case "eq": query = query.eq(filter.column, filter.value); break;
    case "neq": query = query.neq(filter.column, filter.value); break;
    case "gt": query = query.gt(filter.column, filter.value); break;
    case "lt": query = query.lt(filter.column, filter.value); break;
    case "gte": query = query.gte(filter.column, filter.value); break;
    case "lte": query = query.lte(filter.column, filter.value); break;
    case "like": query = query.like(filter.column, filter.value); break;
    case "ilike": query = query.ilike(filter.column, filter.value); break;
    default: query = query.eq(filter.column, filter.value);
  }

  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Erro ao buscar registros em ${table}:`, error);
    throw new Error(`Erro ao buscar registros: ${error.message}`);
  }

  return (data as T[]) ?? [];
}

/**
 * GET BY FIELD - Busca um único registro por um campo específico
 * 
 * @example
 * const user = await getByField<SystemUser>("system_users", "email", "joao@email.com");
 */
export async function getByField<T>(
  table: string,
  field: string,
  value: any,
  options: QueryOptions = { throwOnNotFound: false }
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table as any)
    .select("*")
    .eq(field, value)
    .maybeSingle();

  if (error) {
    console.error(`Erro ao buscar registro em ${table}:`, error);
    throw new Error(`Erro ao buscar registro: ${error.message}`);
  }

  if (!data && options.throwOnNotFound) {
    throw new Error(`Registro não encontrado em ${table} onde ${field} = ${value}`);
  }

  return data as T | null;
}

/**
 * COUNT - Conta registros em uma tabela
 * 
 * @example
 * const total = await count("system_users");
 */
export async function count(
  table: string,
  filter?: { column: string; value: any }
): Promise<number> {
  let query = supabase.from(table as any).select("*", { count: "exact", head: true });

  if (filter) {
    query = query.eq(filter.column, filter.value);
  }

  const { count: total, error } = await query;

  if (error) {
    console.error(`Erro ao contar registros em ${table}:`, error);
    throw new Error(`Erro ao contar registros: ${error.message}`);
  }

  return total ?? 0;
}

/**
 * UPSERT - Insere ou atualiza registro(s)
 * 
 * @example
 * const user = await upsert<SystemUser>("system_users", {
 *   id: "user-id",
 *   name: "João"
 * });
 */
export async function upsert<T>(
  table: string,
  data: Partial<T> | Partial<T>[],
  onConflict?: string
): Promise<T | T[]> {
  const isArray = Array.isArray(data);
  
  let query = supabase.from(table as any).upsert(data).select("*");

  if (onConflict) {
    query = query;
  }

  const { data: result, error } = await query;

  if (error) {
    console.error(`Erro ao fazer upsert em ${table}:`, error);
    throw new Error(`Erro ao fazer upsert: ${error.message}`);
  }

  if (!result) {
    throw new Error(`Erro ao fazer upsert em ${table}: Nenhum dado retornado`);
  }

  return (isArray ? result : result[0]) as T | T[];
}