-- Master Orders
CREATE TABLE public.master_orders (
  spk_number TEXT PRIMARY KEY,
  scheduling_number TEXT,
  customer_name TEXT,
  article_number TEXT,
  delivery_date DATE,
  box_type TEXT,
  substance TEXT,
  qty_order INTEGER,
  sheet_width NUMERIC,
  sheet_length NUMERIC,
  outgoing_instructions TEXT,
  status_karet TEXT NOT NULL DEFAULT 'BELUM_ORDER',
  status_mounting TEXT NOT NULL DEFAULT 'BELUM_MOUNTING',
  status_bahan TEXT NOT NULL DEFAULT 'WAITING',
  status_voting TEXT,
  catatan_ppic TEXT,
  is_released BOOLEAN NOT NULL DEFAULT FALSE,
  is_finished BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Materials
CREATE TABLE public.stock_materials (
  id BIGSERIAL PRIMARY KEY,
  substance TEXT,
  sheet_width NUMERIC,
  sheet_length NUMERIC,
  qty_available INTEGER,
  qty_palet INTEGER,
  allocated_to TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App Settings
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at trigger for master_orders
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER master_orders_touch_updated_at
BEFORE UPDATE ON public.master_orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER app_settings_touch_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: internal single-user app, allow anonymous full access
ALTER TABLE public.master_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access" ON public.master_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.stock_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER TABLE public.master_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_materials;