import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Users2, Plus, ThumbsUp, MessageSquare, TrendingUp, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

const ComunidadePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("dicas");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase.from("community_posts").select("*").order("created_at", { ascending: false });
    if (filter !== "todos") query = query.eq("category", filter);
    const { data } = await query;
    setPosts((data as CommunityPost[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [filter]);

  const handleCreatePost = async () => {
    if (!newContent.trim() || !user) return;
    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      content: newContent.trim(),
      category: newCategory,
    });
    if (error) { toast.error("Erro ao publicar"); return; }
    toast.success("Publicação criada!");
    setNewContent("");
    setDialogOpen(false);
    fetchPosts();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const categoryColors: Record<string, string> = {
    dicas: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    duvidas: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    novidades: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    geral: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Breadcrumb */}
        <p className="text-xs text-muted-foreground">Sistema &gt; Comunidade</p>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Comunidade</h1>
              <p className="text-sm text-muted-foreground">Compartilhe conhecimento e conecte-se com outros usuários</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Publicação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Publicação</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Textarea placeholder="Compartilhe uma dica, dúvida ou novidade..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={5} />
                <div className="flex gap-2">
                  {["dicas", "duvidas", "novidades"].map(c => (
                    <Button key={c} variant={newCategory === c ? "default" : "outline"} size="sm" onClick={() => setNewCategory(c)}>
                      {c === "dicas" ? "💡 Dica" : c === "duvidas" ? "❓ Dúvida" : "🆕 Novidade"}
                    </Button>
                  ))}
                </div>
                <Button onClick={handleCreatePost} className="w-full" disabled={!newContent.trim()}>Publicar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Feed */}
          <div className="lg:col-span-3 space-y-4">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="duvidas">❓ Dúvidas</TabsTrigger>
                <TabsTrigger value="dicas">💡 Dicas</TabsTrigger>
                <TabsTrigger value="novidades">🆕 Novidades</TabsTrigger>
              </TabsList>
            </Tabs>

            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-3 pr-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-5">
                      <Skeleton className="h-4 w-32 mb-3" />
                      <Skeleton className="h-16 w-full mb-3" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))
                ) : posts.length === 0 ? (
                  <div className="text-center py-16">
                    <Users2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma publicação ainda</h3>
                    <p className="text-sm text-muted-foreground mb-4">Seja o primeiro a compartilhar algo com a comunidade!</p>
                    <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4 mr-2" /> Criar Publicação</Button>
                  </div>
                ) : posts.map(post => (
                  <div key={post.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        U
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Usuário</p>
                        <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${categoryColors[post.category] || categoryColors.geral}`}>
                        {post.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-primary transition-colors">
                        <ThumbsUp className="h-3.5 w-3.5" /> {post.likes_count}
                      </button>
                      <button className="flex items-center gap-1 hover:text-primary transition-colors">
                        <MessageSquare className="h-3.5 w-3.5" /> {post.comments_count}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" /> Membros mais ativos
              </h3>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i}.</span>
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">U</div>
                    <span className="text-xs text-muted-foreground">Usuário {i}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" /> Próximos eventos
              </h3>
              <p className="text-xs text-muted-foreground">Nenhum evento agendado</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" /> Novidades
              </h3>
              <p className="text-xs text-muted-foreground">Fique atento às atualizações da plataforma</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ComunidadePage;
