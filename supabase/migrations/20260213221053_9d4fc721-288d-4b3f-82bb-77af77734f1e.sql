
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Enum para status do pedido
CREATE TYPE public.order_status AS ENUM ('received', 'preparing', 'out_for_delivery', 'delivered');

-- Enum para forma de pagamento
CREATE TYPE public.payment_method AS ENUM ('cash', 'card_debit', 'card_credit', 'pix');

-- Tabela de categorias
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  ingredients TEXT[],
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_number TEXT NOT NULL,
  address_neighborhood TEXT NOT NULL,
  address_reference TEXT,
  notes TEXT,
  payment_method public.payment_method NOT NULL,
  change_for NUMERIC(10,2),
  status public.order_status NOT NULL DEFAULT 'received',
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens do pedido
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Order items
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Triggers updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para pedidos
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Dados de exemplo
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Pizzas', 'pizzas', '🍕', 1),
  ('Lanches', 'lanches', '🍔', 2),
  ('Bebidas', 'bebidas', '🥤', 3),
  ('Combos', 'combos', '🎉', 4);

INSERT INTO public.products (category_id, name, description, price, ingredients, sort_order) VALUES
  ((SELECT id FROM public.categories WHERE slug = 'pizzas'), 'Pizza Margherita', 'Molho de tomate, mussarela, manjericão fresco e azeite', 39.90, ARRAY['molho de tomate', 'mussarela', 'manjericão', 'azeite'], 1),
  ((SELECT id FROM public.categories WHERE slug = 'pizzas'), 'Pizza Calabresa', 'Calabresa fatiada, cebola, azeitona e mussarela', 42.90, ARRAY['calabresa', 'cebola', 'azeitona', 'mussarela'], 2),
  ((SELECT id FROM public.categories WHERE slug = 'pizzas'), 'Pizza Portuguesa', 'Presunto, ovo, cebola, azeitona, ervilha e mussarela', 44.90, ARRAY['presunto', 'ovo', 'cebola', 'azeitona', 'ervilha', 'mussarela'], 3),
  ((SELECT id FROM public.categories WHERE slug = 'pizzas'), 'Pizza Frango com Catupiry', 'Frango desfiado e catupiry cremoso', 44.90, ARRAY['frango desfiado', 'catupiry'], 4),
  ((SELECT id FROM public.categories WHERE slug = 'lanches'), 'X-Burger', 'Pão, hambúrguer artesanal, queijo, alface, tomate e maionese', 22.90, ARRAY['pão', 'hambúrguer', 'queijo', 'alface', 'tomate', 'maionese'], 1),
  ((SELECT id FROM public.categories WHERE slug = 'lanches'), 'X-Bacon', 'Pão, hambúrguer artesanal, queijo, bacon crocante, alface e tomate', 26.90, ARRAY['pão', 'hambúrguer', 'queijo', 'bacon', 'alface', 'tomate'], 2),
  ((SELECT id FROM public.categories WHERE slug = 'lanches'), 'X-Tudo', 'Pão, hambúrguer duplo, queijo, bacon, ovo, presunto, alface, tomate e maionese', 32.90, ARRAY['pão', 'hambúrguer duplo', 'queijo', 'bacon', 'ovo', 'presunto', 'alface', 'tomate', 'maionese'], 3),
  ((SELECT id FROM public.categories WHERE slug = 'bebidas'), 'Coca-Cola 350ml', 'Lata gelada', 6.00, NULL, 1),
  ((SELECT id FROM public.categories WHERE slug = 'bebidas'), 'Guaraná Antarctica 350ml', 'Lata gelada', 5.50, NULL, 2),
  ((SELECT id FROM public.categories WHERE slug = 'bebidas'), 'Suco Natural 500ml', 'Laranja, limão ou maracujá', 9.90, NULL, 3),
  ((SELECT id FROM public.categories WHERE slug = 'bebidas'), 'Água Mineral 500ml', 'Com ou sem gás', 4.00, NULL, 4),
  ((SELECT id FROM public.categories WHERE slug = 'combos'), 'Combo Pizza + Refri', 'Pizza grande + Coca-Cola 2L', 54.90, NULL, 1),
  ((SELECT id FROM public.categories WHERE slug = 'combos'), 'Combo Lanche + Refri', 'X-Burger + Coca-Cola 350ml', 27.90, NULL, 2);
