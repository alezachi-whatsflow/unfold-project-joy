import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: Abril de 2026</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introdução</h2>
            <p>
              A Whatsflow ("nós", "nosso") opera a plataforma de comunicação e gestão empresarial
              disponível em app.whatsflow.com.br. Esta Política de Privacidade descreve como coletamos,
              usamos, armazenamos e protegemos suas informações pessoais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Dados que Coletamos</h2>
            <p>Coletamos os seguintes tipos de dados:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de conta:</strong> nome, email, telefone, empresa, CPF/CNPJ</li>
              <li><strong>Dados de uso:</strong> mensagens enviadas/recebidas, atividades, negócios</li>
              <li><strong>Dados de integração:</strong> tokens OAuth do Google Calendar, configurações de sincronização</li>
              <li><strong>Dados financeiros:</strong> registros de receitas, despesas e cobranças</li>
              <li><strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Integração com Google Calendar</h2>
            <p>Quando você conecta seu Google Calendar à plataforma:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Solicitamos acesso apenas ao Google Calendar e informações básicas do perfil</li>
              <li>Seus tokens de acesso são armazenados com criptografia e protegidos por políticas de segurança (RLS)</li>
              <li>Usamos os dados exclusivamente para sincronizar atividades entre a plataforma e seu calendário</li>
              <li>Não compartilhamos seus dados do Google Calendar com terceiros</li>
              <li>Você pode desconectar a qualquer momento — seus tokens são apagados imediatamente</li>
              <li>Não armazenamos o conteúdo dos seus eventos — apenas metadados de sincronização (ID do evento, data, título)</li>
            </ul>
            <p>
              O uso dos dados do Google está em conformidade com a{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Política de Dados de Usuários dos Serviços de API do Google
              </a>, incluindo os requisitos de Uso Limitado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Como Usamos os Dados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fornecer e manter a plataforma</li>
              <li>Sincronizar atividades com o Google Calendar</li>
              <li>Gerar relatórios e análises para sua empresa</li>
              <li>Comunicações de suporte e notificações do sistema</li>
              <li>Melhorar a experiência do usuário</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Compartilhamento de Dados</h2>
            <p>
              Não vendemos seus dados pessoais. Compartilhamos dados apenas com:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Provedores de serviço:</strong> Supabase (banco de dados), Railway (hospedagem)</li>
              <li><strong>Integrações autorizadas:</strong> Google Calendar, WhatsApp, Asaas (apenas quando você ativa)</li>
              <li><strong>Obrigações legais:</strong> quando exigido por lei</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Segurança</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criptografia em trânsito (TLS/HTTPS) e em repouso</li>
              <li>Row Level Security (RLS) — isolamento de dados por tenant</li>
              <li>Tokens OAuth armazenados com acesso restrito</li>
              <li>Autenticação via JWT com refresh automático</li>
              <li>Auditoria de acessos e ações</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Seus Direitos (LGPD)</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incorretos</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar consentimento de integrações (ex: Google Calendar)</li>
              <li>Solicitar portabilidade dos dados</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato pelo email{" "}
              <a href="mailto:privacidade@whatsflow.com.br" className="text-primary hover:underline">privacidade@whatsflow.com.br</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Retenção de Dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Ao cancelar sua conta,
              seus dados são mantidos por 30 dias para recuperação e depois excluídos permanentemente.
              Tokens de integrações são excluídos imediatamente ao desconectar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta política, entre em contato:<br />
              <strong>Email:</strong> privacidade@whatsflow.com.br<br />
              <strong>WhatsApp:</strong> Suporte via plataforma
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
