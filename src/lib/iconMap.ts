import { LayoutDashboard, ShoppingCart, Receipt, PenLine, TrendingUp, DollarSign, FileText, UserCheck, Users, Package, Radar, FileBarChart, Settings, LogOut, User, ChevronLeft, ChevronRight, X, Menu, MessageSquare, Puzzle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, Receipt, PenLine, TrendingUp, DollarSign,
  FileText, UserCheck, Users, Package, Radar, FileBarChart, Settings,
  LogOut, User, ChevronLeft, ChevronRight, X, Menu, MessageSquare, Puzzle,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || LayoutDashboard;
}
