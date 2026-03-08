import { LayoutDashboard, ShoppingCart, Receipt, PenLine, TrendingUp, DollarSign, FileText, UserCheck, Users, Package, Radar, FileBarChart, Settings, LogOut, User, ChevronLeft, ChevronRight, X, Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, Receipt, PenLine, TrendingUp, DollarSign,
  FileText, UserCheck, Users, Package, Radar, FileBarChart, Settings,
  LogOut, User, ChevronLeft, ChevronRight, X, Menu,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || LayoutDashboard;
}
