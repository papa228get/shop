-- 1. Таблица товаров
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Одежда',
  description TEXT,
  price NUMERIC NOT NULL,
  old_price NUMERIC,
  image TEXT,
  is_preorder BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL,
  user_name TEXT,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. НОВАЯ: Таблица состояний админа (для пошагового создания товаров)
CREATE TABLE IF NOT EXISTS admin_states (
  user_id BIGINT PRIMARY KEY,
  step TEXT NOT NULL,
  data JSONB DEFAULT '{}'
);

-- 4. Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Включаем защиту (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Очищаем старые правила
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON products;
DROP POLICY IF EXISTS "Enable update access for all users" ON products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON products;
DROP POLICY IF EXISTS "Enable all for orders" ON orders;
DROP POLICY IF EXISTS "Enable all for admin_states" ON admin_states;

-- 6. Создаем правила доступа
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON products FOR DELETE USING (true);

CREATE POLICY "Enable all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for admin_states" ON admin_states FOR ALL USING (true) WITH CHECK (true);

-- 7. Настройка хранилища (Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Storage Access" ON storage.objects;
CREATE POLICY "Public Storage Access" ON storage.objects FOR ALL USING ( bucket_id = 'product-images' );