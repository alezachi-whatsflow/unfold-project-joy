
-- Manual Articles
CREATE TABLE public.manual_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT '',
  category text NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text DEFAULT '',
  order_index int DEFAULT 0,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.manual_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read published articles" ON public.manual_articles FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Admins can manage articles" ON public.manual_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Manual Progress
CREATE TABLE public.manual_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  article_id uuid REFERENCES public.manual_articles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  rating int DEFAULT 0,
  UNIQUE(user_id, article_id)
);
ALTER TABLE public.manual_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own progress" ON public.manual_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Tutorials
CREATE TABLE public.tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'geral',
  level text DEFAULT 'iniciante',
  duration_seconds int DEFAULT 0,
  thumbnail_url text,
  video_url text,
  order_index int DEFAULT 0,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read published tutorials" ON public.tutorials FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Admins can manage tutorials" ON public.tutorials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tutorial Progress
CREATE TABLE public.tutorial_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tutorial_id uuid REFERENCES public.tutorials(id) ON DELETE CASCADE NOT NULL,
  progress_percent int DEFAULT 0,
  completed_at timestamptz,
  UNIQUE(user_id, tutorial_id)
);
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tutorial progress" ON public.tutorial_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Onboarding Steps
CREATE TABLE public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step_key text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, step_key)
);
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own onboarding" ON public.onboarding_steps FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Community Posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'geral',
  likes_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read posts" ON public.community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own posts" ON public.community_posts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own posts" ON public.community_posts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Seed manual articles
INSERT INTO public.manual_articles (category, title, slug, content, order_index, is_published) VALUES
('primeiros_passos', 'Bem-vindo ao Whatsflow Finance', 'bem-vindo', '# Bem-vindo ao Whatsflow Finance\n\nEste é o guia completo para começar a usar a plataforma.\n\n## O que é o Whatsflow Finance?\n\nO Whatsflow Finance é uma plataforma SaaS B2B completa para gestão financeira, CRM, mensageria e muito mais.\n\n## Primeiros passos\n\n1. Configure seu perfil\n2. Conecte seu WhatsApp\n3. Cadastre seus clientes\n4. Crie sua primeira cobrança', 1, true),
('primeiros_passos', 'Configurando seu Perfil', 'configurando-perfil', '# Configurando seu Perfil\n\n## Acesse as configurações\n\n1. Clique no seu avatar no canto inferior da sidebar\n2. Selecione **Meu Perfil**\n3. Preencha suas informações\n\n## Dados obrigatórios\n\n- Nome completo\n- E-mail\n- Foto (opcional)', 2, true),
('clientes', 'Gestão de Clientes', 'gestao-clientes', '# Gestão de Clientes\n\n## Cadastrando um novo cliente\n\n1. Acesse o menu **Clientes**\n2. Clique em **Novo Cliente**\n3. Preencha os dados do cliente\n4. Clique em **Salvar**\n\n## Importando clientes via CSV\n\n1. Acesse **Clientes > Importar**\n2. Faça upload do arquivo CSV\n3. Mapeie as colunas\n4. Confirme a importação', 1, true),
('financeiro', 'Módulo Financeiro - Visão Geral', 'financeiro-visao-geral', '# Módulo Financeiro\n\n## Receitas\n\nGerencie todas as receitas da sua empresa.\n\n## Despesas\n\nControle seus custos e despesas.\n\n## Cobranças\n\nCrie e gerencie cobranças automatizadas.\n\n## Comissões\n\nDefina regras de comissão para seus vendedores.', 1, true),
('whatsapp', 'WhatsApp & Mensagens', 'whatsapp-mensagens', '# WhatsApp & Mensagens\n\n## Conectando seu WhatsApp\n\n1. Acesse **Conexões WA**\n2. Clique em **Nova Conexão**\n3. Escaneie o QR Code com seu celular\n4. Aguarde a conexão ser estabelecida\n\n## Enviando mensagens\n\n1. Acesse **Conversas**\n2. Selecione um contato\n3. Digite sua mensagem\n4. Clique em enviar', 1, true),
('relatorios', 'Relatórios & Analytics', 'relatorios-analytics', '# Relatórios & Analytics\n\n## Dashboard\n\nVisualize os principais KPIs da sua empresa.\n\n## Relatórios personalizados\n\n1. Acesse **Relatórios**\n2. Selecione o tipo de relatório\n3. Defina os filtros\n4. Exporte em PDF ou Excel', 1, true),
('configuracoes', 'Configurações do Sistema', 'configuracoes-sistema', '# Configurações\n\n## Configurações gerais\n\nPersonalize o comportamento do sistema.\n\n## Integrações\n\nConecte com outras ferramentas.\n\n## Usuários\n\nGerencie os acessos da sua equipe.', 1, true);

-- Seed tutorials
INSERT INTO public.tutorials (title, description, category, level, duration_seconds, video_url, order_index, is_published) VALUES
('Primeiros passos no Whatsflow', 'Aprenda a configurar sua conta e começar a usar a plataforma', 'inicio', 'iniciante', 312, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, true),
('Criando cobranças automáticas', 'Configure cobranças recorrentes para seus clientes', 'financeiro', 'intermediario', 485, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, true),
('Conectando WhatsApp Business', 'Guia completo para conectar seu número ao sistema', 'whatsapp', 'iniciante', 267, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 3, true),
('Dashboard e KPIs avançados', 'Entenda todos os indicadores do seu dashboard', 'analytics', 'avancado', 620, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 4, true),
('Gestão de vendas e pipeline', 'Como usar o pipeline de vendas para fechar mais negócios', 'vendas', 'intermediario', 540, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 5, true),
('Inteligência Digital', 'Analise a presença digital dos seus prospects', 'intelligence', 'avancado', 420, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 6, true);
