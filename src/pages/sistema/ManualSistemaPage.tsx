import { fmtDate } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Search, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Article {
  id: string;
  category: string;
  title: string;
  slug: string;
  content: string;
  order_index: number;
  updated_at: string;
}

interface ArticleProgress {
  article_id: string;
  rating: number;
}

const categoryLabels: Record<string, string> = {
  primeiros_passos: "Primeiros Passos",
  clientes: "Gestao de Clientes",
  financeiro: "Modulo Financeiro",
  whatsapp: "WhatsApp & Mensagens",
  playbooks_ia: "Playbooks de I.A.",
  relatorios: "Relatorios & Analytics",
  configuracoes: "Configuracoes",
};

const categoryIcons: Record<string, string> = {
  primeiros_passos: "🚀",
  clientes: "👥",
  financeiro: "💰",
  whatsapp: "📱",
  playbooks_ia: "🤖",
  relatorios: "📊",
  configuracoes: "⚙️",
};

const ManualSistemaPage = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [progress, setProgress] = useState<ArticleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: arts } = await supabase.from("manual_articles").select("*").eq("is_published", true).order("order_index");
      setArticles((arts as Article[]) || []);
      if (user) {
        const { data: prog } = await supabase.from("manual_progress").select("article_id, rating").eq("user_id", user.id);
        setProgress((prog as ArticleProgress[]) || []);
      }
      if (arts && arts.length > 0) setSelectedArticle(arts[0] as Article);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const categories = [...new Set(articles.map(a => a.category))];
  const filteredArticles = articles.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));
  const articlesByCategory = categories.map(cat => ({
    category: cat,
    articles: filteredArticles.filter(a => a.category === cat),
    read: filteredArticles.filter(a => a.category === cat && progress.some(p => p.article_id === a.id)).length,
    total: filteredArticles.filter(a => a.category === cat).length,
  }));

  const isRead = (id: string) => progress.some(p => p.article_id === id);
  const currentIndex = articles.findIndex(a => a.id === selectedArticle?.id);
  const prevArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const nextArticle = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

  const markAsRead = async () => {
    if (!user || !selectedArticle) return;
    const { error } = await supabase.from("manual_progress").upsert({
      user_id: user.id,
      article_id: selectedArticle.id,
      read_at: new Date().toISOString(),
    }, { onConflict: "user_id,article_id" });
    if (!error) {
      setProgress(prev => [...prev.filter(p => p.article_id !== selectedArticle.id), { article_id: selectedArticle.id, rating: 0 }]);
      toast.success("Artigo marcado como lido!");
    }
  };

  const rateArticle = async (rating: number) => {
    if (!user || !selectedArticle) return;
    await supabase.from("manual_progress").upsert({
      user_id: user.id,
      article_id: selectedArticle.id,
      read_at: new Date().toISOString(),
      rating,
    }, { onConflict: "user_id,article_id" });
    setProgress(prev => [...prev.filter(p => p.article_id !== selectedArticle.id), { article_id: selectedArticle.id, rating }]);
    toast.success(rating > 0 ? "Obrigado pelo feedback positivo! 👍" : "Obrigado pelo feedback! Vamos melhorar 🙏");
  };

  return (
    <>
      <div className="p-4 md:p-6 space-y-4">
        <p className="text-xs text-muted-foreground">Sistema &gt; Manual de Uso</p>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 border border-primary/20">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Manual de Uso</h1>
            <p className="text-sm text-muted-foreground">Guia completo de todas as funcionalidades da plataforma</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-40 w-full" /></div>
            <div className="lg:col-span-3"><Skeleton className="h-96 w-full" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Sidebar Categories */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar artigo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
              </div>
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-1 pr-2">
                  {articlesByCategory.map(({ category, articles: catArticles, read, total }) => (
                    <div key={category}>
                      <div className="flex items-center justify-between px-2 py-2">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          {categoryIcons[category] || "📄"} {categoryLabels[category] || category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{read}/{total}</span>
                      </div>
                      {catArticles.map(article => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className={`w-full text-left text-xs px-3 py-2 flex items-center gap-2 transition-colors ${
                            selectedArticle?.id === article.id
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {isRead(article.id) ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className="truncate">{article.title}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Content */}
            <div className="lg:col-span-3 bg-card border border-border p-6">
              {selectedArticle ? (
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="pr-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] text-muted-foreground">
                        Atualizado em {fmtDate(selectedArticle.updated_at)}
                      </span>
                      {!isRead(selectedArticle.id) && (
                        <Button size="sm" variant="outline" onClick={markAsRead} className="gap-1.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como lido
                        </Button>
                      )}
                    </div>

                    <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
                    </article>

                    {/* Rating */}
                    <div className="mt-8 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-3">Este artigo foi útil?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant={progress.find(p => p.article_id === selectedArticle.id)?.rating === 1 ? "default" : "outline"} onClick={() => rateArticle(1)} className="gap-1.5">
                          <ThumbsUp className="h-4 w-4" /> Sim
                        </Button>
                        <Button size="sm" variant={progress.find(p => p.article_id === selectedArticle.id)?.rating === -1 ? "default" : "outline"} onClick={() => rateArticle(-1)} className="gap-1.5">
                          <ThumbsDown className="h-4 w-4" /> Não
                        </Button>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="mt-6 flex justify-between">
                      <Button size="sm" variant="ghost" disabled={!prevArticle} onClick={() => prevArticle && setSelectedArticle(prevArticle)} className="gap-1.5">
                        <ChevronLeft className="h-4 w-4" /> {prevArticle?.title || "Anterior"}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={!nextArticle} onClick={() => nextArticle && setSelectedArticle(nextArticle)} className="gap-1.5">
                        {nextArticle?.title || "Próximo"} <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Selecione um artigo para ler</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ManualSistemaPage;
