import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Termos de Serviço</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: Abril de 2026</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma Whatsflow disponível em app.whatsflow.com.br,
              você concorda com estes Termos de Serviço. Se não concordar, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>
              A Whatsflow é uma plataforma SaaS de gestão empresarial que oferece:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Comunicação omnicanal (WhatsApp, Telegram, Instagram, Facebook)</li>
              <li>CRM e gestão de vendas</li>
              <li>Gestão financeira (receitas, despesas, cobranças)</li>
              <li>Automação com inteligência artificial</li>
              <li>Integrações com serviços de terceiros (Google Calendar, Asaas, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Conta do Usuário</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Você é responsável por manter a segurança de suas credenciais de acesso</li>
              <li>Cada conta é pessoal e intransferível</li>
              <li>Você deve fornecer informações verdadeiras e atualizadas</li>
              <li>O uso compartilhado de credenciais é proibido</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Integrações com Terceiros</h2>
            <p>
              A plataforma permite integração com serviços de terceiros como Google Calendar,
              WhatsApp Business API, Asaas e outros. Ao ativar uma integração:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Você autoriza o acesso aos dados necessários para a integração funcionar</li>
              <li>A integração pode ser desativada a qualquer momento por você</li>
              <li>Cada integração está sujeita aos termos do serviço terceiro</li>
              <li>Não nos responsabilizamos por indisponibilidade de serviços de terceiros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Uso do Google Calendar</h2>
            <p>
              O uso da integração com o Google Calendar está sujeito aos{" "}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Termos de Serviço do Google
              </a> e à{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Política de Privacidade do Google
              </a>.
            </p>
            <p>
              Nosso uso e transferência de informações recebidas das APIs do Google seguem a{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Política de Dados de Usuários dos Serviços de API do Google
              </a>, incluindo os requisitos de Uso Limitado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Planos e Pagamentos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Os planos e preços estão disponíveis na plataforma</li>
              <li>O pagamento é processado por provedores terceiros (Asaas)</li>
              <li>Cancelamentos seguem a política do plano contratado</li>
              <li>Não há reembolso proporcional em cancelamentos antecipados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Uso Aceitável</h2>
            <p>Você concorda em NÃO utilizar a plataforma para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Enviar spam ou mensagens não solicitadas em massa</li>
              <li>Violar a privacidade de terceiros</li>
              <li>Distribuir malware ou conteúdo malicioso</li>
              <li>Violar leis ou regulamentos aplicáveis</li>
              <li>Tentar acessar dados de outros usuários/tenants</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Propriedade Intelectual</h2>
            <p>
              A plataforma Whatsflow, incluindo código, design, marcas e conteúdo,
              é propriedade da Whatsflow/IAZIS. Seus dados permanecem seus — nós apenas
              processamos conforme necessário para fornecer o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Disponibilidade</h2>
            <p>
              Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos
              disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Limitação de Responsabilidade</h2>
            <p>
              Na extensão máxima permitida pela lei, não nos responsabilizamos por danos
              indiretos, incidentais ou consequentes decorrentes do uso da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Alterações nos Termos</h2>
            <p>
              Podemos atualizar estes termos a qualquer momento. Alterações significativas
              serão comunicadas com 30 dias de antecedência. O uso contínuo após as alterações
              constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Contato</h2>
            <p>
              Em caso de dúvidas sobre estes termos, entre em contato:<br />
              <strong>Email:</strong> contato@whatsflow.com.br<br />
              <strong>WhatsApp:</strong> Suporte via plataforma
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
