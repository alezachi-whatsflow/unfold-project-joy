// src/components/ui/icon.tsx
// Wrapper central para todos os ícones Lucide da plataforma
// Aplica padrões de strokeWidth e tamanho por contexto

import { type LucideIcon, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

// Contextos de uso com tamanho e stroke definidos
export type IconContext =
  | 'sidebar'      // 16px · stroke 1.5 · cor via className
  | 'topbar'       // 18px · stroke 1.5 · cor via className
  | 'button'       // 14px · stroke 1.5 · herda cor do botão
  | 'kpi'          // 20px · stroke 1.5 · cor semântica
  | 'card'         // 16px · stroke 1.5 · text-muted
  | 'empty-state'  // 32px · stroke 1.5 · text-muted
  | 'channel'      // 24px · stroke 1.5 · cor do canal
  | 'status-dot'   // 8px  · stroke 1.5 · cor semântica
  | 'action'       // 14px · stroke 1.5 · text-muted
  | 'custom'       // usa size e strokeWidth passados diretamente

const CONTEXT_DEFAULTS: Record<IconContext, { size: number; strokeWidth: number }> = {
  sidebar:       { size: 16, strokeWidth: 1.5 },
  topbar:        { size: 18, strokeWidth: 1.5 },
  button:        { size: 14, strokeWidth: 1.5 },
  kpi:           { size: 20, strokeWidth: 1.5 },
  card:          { size: 16, strokeWidth: 1.5 },
  'empty-state': { size: 32, strokeWidth: 1.5 },
  channel:       { size: 24, strokeWidth: 1.5 },
  'status-dot':  { size: 8,  strokeWidth: 1.5 },
  action:        { size: 14, strokeWidth: 1.5 },
  custom:        { size: 16, strokeWidth: 1.5 },
}

interface IconProps extends Omit<LucideProps, 'size' | 'strokeWidth'> {
  icon: LucideIcon
  context?: IconContext
  size?: number
  strokeWidth?: number
}

export function Icon({
  icon: LucideIconComponent,
  context = 'card',
  size,
  strokeWidth,
  className,
  ...props
}: IconProps) {
  const defaults = CONTEXT_DEFAULTS[context]

  return (
    <LucideIconComponent
      size={size ?? defaults.size}
      strokeWidth={strokeWidth ?? defaults.strokeWidth}
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}

// Re-export all 198 icons used in the platform
export {
  Activity, AlertCircle, AlertTriangle, Archive,
  ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight,
  ArrowRightLeft, ArrowUp, Ban, BarChart3, Bell, BellRing,
  BookOpen, Bot, Brain, Briefcase, Building, Building2,
  Calculator, Calendar, CalendarClock, CalendarDays,
  CalendarIcon, CalendarRange, Camera, Check, CheckCheck,
  CheckCircle, CheckCircle2, CheckSquare, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown,
  Circle, CircleDot, ClipboardList, Clock, Columns2,
  Construction, Contact, Copy, Cpu, CreditCard, Database,
  DollarSign, Dot, Download, Edit, Edit2, ExternalLink,
  Eye, EyeOff, Facebook, FileDown, FileKey, FileSpreadsheet,
  FileText, Filter, Flag, Flame, FlaskConical, Gauge,
  GitBranch, Globe, GripVertical, Hand, Hash, Headphones,
  Heart, HelpCircle, History, Home, Image, Info, Instagram,
  Kanban, KeyRound, Landmark, Layers, LayoutDashboard,
  LayoutGrid, LifeBuoy, Lightbulb, LineChart, Link2,
  Linkedin, List, ListOrdered, Loader2, Lock, LockKeyhole,
  LogOut, Mail, MapPin, Megaphone, Menu, MessageCircle,
  MessageCircleX, MessageSquare, MessageSquarePlus,
  MessageSquareText, Mic, Minimize2, Minus, Monitor,
  MonitorPlay, Moon, MoreHorizontal, MoreVertical,
  MousePointerClick, Package, Paintbrush, Palette, PanelLeft,
  PanelRightClose, PanelRightOpen, PartyPopper, Pause, PenLine,
  Pencil, Percent, Phone, PieChart, Pin, PinOff, Play,
  PlayCircle, Plug, Plus, Power, Printer, Puzzle, QrCode,
  Radar, Receipt, RefreshCcw, RefreshCw, Repeat, Rocket,
  RotateCcw, Rss, Save, ScrollText, Search, Send, Server,
  Settings, Settings2, Shield, ShieldAlert, ShieldCheck,
  ShoppingBag, Sliders, SlidersHorizontal, Smartphone,
  Snowflake, Sparkles, Star, StickyNote, Sun, Tag, Target,
  Thermometer, ThumbsDown, ThumbsUp, Ticket, ToggleLeft,
  Trash2, TrendingDown, TrendingUp, Trophy, Type, Unplug,
  Upload, User, UserCheck, UserMinus, UserPlus, UserX,
  Users, Users2, UsersRound, Video, Wallet, Wand2, Webhook,
  Weight, Wifi, WifiOff, X, XCircle, Zap, ZapOff,
} from 'lucide-react'
