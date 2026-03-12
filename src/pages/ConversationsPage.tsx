import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenants } from "@/hooks/useUserTenants";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Send, MessageCircle, CheckCheck, Clock, Archive, User, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConversationsPage() {
  const { user } = useAuth();
  const { data: tenants } = useUserTenants();
  const tenantId = tenants?.[0]?.tenant_id;
  const queryClient = useQueryClient();

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [msgInput, setMsgInput] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Conversations list
  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations', tenantId, statusFilter],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase.from('conversations').select('*, crm_contacts(name, phone)').eq('tenant_id', tenantId).order('last_message_at', { ascending: false }).limit(100);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Messages for selected conversation
  const { data: messages, isLoading: loadingMsgs } = useQuery({
    queryKey: ['chat-messages', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const { data, error } = await supabase.from('chat_messages').select('*').eq('conversation_id', selectedConvId).order('timestamp', { ascending: true }).limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedConvId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase.channel('conv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `tenant_id=eq.${tenantId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedConvId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, selectedConvId, queryClient]);

  // Scroll to bottom
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Send message
  const sendMsg = useMutation({
    mutationFn: async () => {
      if (!selectedConvId || !tenantId || !msgInput.trim()) return;
      const { error } = await supabase.from('chat_messages').insert({
        tenant_id: tenantId,
        conversation_id: selectedConvId,
        direction: 'outbound',
        content: msgInput.trim(),
        sender_id: user?.id,
        status: 'sent',
      });
      if (error) throw error;
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConvId);
    },
    onSuccess: () => {
      setMsgInput('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedConvId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedConv = conversations?.find(c => c.id === selectedConvId);
  const contactName = selectedConv?.crm_contacts?.name || 'Contato';

  const filteredConvs = conversations?.filter(c => {
    if (!search) return true;
    return c.crm_contacts?.name?.toLowerCase().includes(search.toLowerCase()) ||
           c.crm_contacts?.phone?.includes(search);
  });

  const filters = [
    { value: 'all', label: 'Todas' },
    { value: 'open', label: 'Abertas' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'resolved', label: 'Resolvidas' },
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 rounded-lg border overflow-hidden bg-background">
      {/* Column 1: Conversation List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {filters.map(f => (
              <Button key={f.value} size="sm" variant={statusFilter === f.value ? 'default' : 'ghost'} className="text-xs h-7 px-2" onClick={() => setStatusFilter(f.value)}>
                {f.label}
              </Button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingConvs ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : !filteredConvs?.length ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma conversa</div>
          ) : (
            filteredConvs.map(c => (
              <div
                key={c.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedConvId === c.id ? 'bg-muted' : ''}`}
                onClick={() => setSelectedConvId(c.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {(c.crm_contacts?.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm truncate">{c.crm_contacts?.name || 'Desconhecido'}</p>
                      {c.last_message_at && <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false, locale: ptBR })}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground truncate">{c.crm_contacts?.phone || ''}</p>
                      {(c.unread_count || 0) > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{c.unread_count}</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Column 2: Chat */}
      <div className="flex-1 flex flex-col">
        {!selectedConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <p>Selecione uma conversa</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {contactName[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{contactName}</p>
                  <p className="text-xs text-muted-foreground">{selectedConv?.status}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  await supabase.from('conversations').update({ status: 'resolved' }).eq('id', selectedConvId);
                  queryClient.invalidateQueries({ queryKey: ['conversations'] });
                  toast.success('Conversa resolvida');
                }}>
                  <CheckCheck className="h-4 w-4 mr-1" /> Resolver
                </Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  await supabase.from('conversations').update({ status: 'archived' }).eq('id', selectedConvId);
                  queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }}>
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              {loadingMsgs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {messages?.map(m => (
                    <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                        m.is_internal_note
                          ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-200'
                          : m.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <p>{m.content}</p>
                        <p className={`text-[10px] mt-1 ${m.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {m.direction === 'outbound' && (
                            <span className="ml-1">{m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEnd} />
                </div>
              )}
            </ScrollArea>
            <div className="p-3 border-t flex gap-2">
              <Input
                placeholder="Digite uma mensagem..."
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg.mutate(); } }}
                className="flex-1"
              />
              <Button onClick={() => sendMsg.mutate()} disabled={!msgInput.trim() || sendMsg.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Column 3: Contact Details */}
      {selectedConv && (
        <div className="w-72 border-l p-4 space-y-4 hidden lg:block">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl mb-2">
              {contactName[0].toUpperCase()}
            </div>
            <p className="font-semibold">{contactName}</p>
            <p className="text-xs text-muted-foreground">{selectedConv.crm_contacts?.phone}</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{selectedConv.status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Canal</span><span className="capitalize">{selectedConv.channel}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Prioridade</span><span className="capitalize">{selectedConv.priority}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
