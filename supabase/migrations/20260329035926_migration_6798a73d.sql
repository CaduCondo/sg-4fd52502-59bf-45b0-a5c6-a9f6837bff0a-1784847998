-- Recriar a função com a ordem correta dos parâmetros
DROP FUNCTION IF EXISTS get_valid_due_date(INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_valid_due_date(
  p_rent_due_day INTEGER,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS DATE AS $$
DECLARE
  v_date DATE;
  v_max_day INTEGER;
  v_current_day INTEGER;
BEGIN
  -- Obter o último dia do mês
  v_max_day := EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month - 1 day')::DATE);
  
  -- Se o dia escolhido existe no mês, usa ele
  IF p_rent_due_day <= v_max_day THEN
    v_date := MAKE_DATE(p_year, p_month, p_rent_due_day);
  ELSE
    -- Se não existe, usa o último dia do mês
    v_date := MAKE_DATE(p_year, p_month, v_max_day);
  END IF;
  
  RETURN v_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;