import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import WhatsAppLayout from "@/components/whatsapp/WhatsAppLayout";
import whatsflowLogo from "@/assets/whatsflow-logo.png";
import {
  PenLine, TrendingUp, DollarSign, Receipt, FileText, UserCheck,
  Users, Package, ShoppingCart, MessageCircle, LayoutDashboard, Radar,
  FileBarChart, Settings, Puzzle, ArrowLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DockItem {
  icon: LucideIcon; label: string; route: string; group: number;
}

const dock: DockItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", route: "/dashboard", group: 1 },
  { icon: Radar, label: "Int. Digital", route: "/intelligence", group: 1 },
  { icon: FileBarChart, label: "Relatórios", route: "/reports", group: 1 },
  { icon: PenLine, label: "Inserir Dados", route: "/input", group: 2 },
  { icon: TrendingUp, label: "Receitas", route: "/revenue", group: 2 },
  { icon: DollarSign, label: "Despesas", route: "/expenses", group: 2 },
  { icon: Receipt, label: "Cobranças", route: "/cobrancas", group: 2 },
  { icon: FileText, label: "Fiscal", route: "/fiscal", group: 2 },
  { icon: UserCheck, label: "Comissões", route: "/comissoes", group: 2 },
  { icon: Users, label: "Clientes", route: "/customers", group: 3 },
  { icon: Package, label: "Produtos", route: "/products", group: 3 },
  { icon: ShoppingCart, label: "Vendas", route: "/vendas", group: 3 },
  { icon: Puzzle, label: "Integrações", route: "/integracoes", group: 4 },
  { icon: Settings, label: "Configurações", route: "/settings", group: 4 },
];

export default function WhatsAppPage() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ backgroundColor: "var(--wa-bg-deep)" }}>
      {/* Hover trigger zone — top 6px invisible */}
      <div
        className="fixed top-0 left-0 right-0 z-50 h-1.5"
        onMouseEnter={() => setHovered(true)}
      />

      {/* Top Dock — slides down on hover */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-300 ${
          hovered
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-1 px-4 py-2 mt-2 rounded-2xl backdrop-blur-xl border"
          style={{
            background: "rgba(10, 15, 13, 0.85)",
            borderColor: "rgba(0, 200, 150, 0.15)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Logo + back */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl mr-2 hover:bg-[rgba(0,200,150,0.1)] transition-colors"
          >
            <img src={whatsflowLogo} alt="Whatsflow" className="h-6 w-6 rounded-md" />
            <ArrowLeft size={14} className="text-[rgba(240,253,248,0.5)]" />
          </button>

          <div className="h-6 w-px bg-[rgba(0,200,150,0.2)]" />

          {dock.map((item, i) => {
            const showDivider = i > 0 && dock[i - 1].group !== item.group;
            return (
              <div key={item.route} className="flex items-center">
                {showDivider && <div className="h-6 w-px bg-[rgba(0,200,150,0.2)] mx-0.5" />}
                <div className="relative group/icon">
                  <button
                    onClick={() => navigate(item.route)}
                    className="p-2 rounded-xl transition-all text-[rgba(240,253,248,0.5)] hover:text-[#00C896] hover:bg-[rgba(0,200,150,0.1)] hover:scale-110"
                  >
                    <item.icon size={18} />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: "rgba(0,0,0,0.8)", color: "#F0FDF8" }}
                  >
                    {item.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-screen WhatsApp Layout */}
      <WhatsAppLayout />
    </div>
  );
}
