export type ProductCategory =
  | "plan_base"
  | "addon_technology"
  | "service_support"
  | "service_onetime";

export type ProductType = "recurring" | "one_time";
export type ProductStatus = "active" | "inactive" | "planning";
export type BillingCycle = "monthly" | "quarterly" | "annual" | "one_time";
export type ProductHealth = "excellent" | "good" | "warning" | "critical";

export interface ProductIncludes {
  devicesWeb: number;
  devicesMeta: number;
  attendants: number;
  aiAgents: number;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  type: ProductType;
  status: ProductStatus;
  price: number;
  billingCycle: BillingCycle;

  // Facilite Whatsflow specific
  hourlyRate?: number;
  monthlyHours?: number;
  weeklyHours?: number;

  // One-time service specific
  deliveryTime?: string;

  // Plan base includes
  includes?: ProductIncludes;

  // Cost structure
  cogs: number;
  laborCost: number;
  salesCommission: number;
  supportCost: number;

  // Description
  description?: string;
  features?: string[];
  limitations?: string[];

  // Business data
  activeCustomers: number;
  mrr: number;
  totalRevenue: number;
  churnRate?: number;

  createdAt: Date;
  updatedAt: Date;
}

// Calculated metrics
export interface ProductMetrics {
  contributionMargin: number;
  contributionMarginPercent: number;
  health: ProductHealth;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  plan_base: "Plano Base",
  addon_technology: "Add-on Tecnologia",
  service_support: "Facilite Whatsflow",
  service_onetime: "Serviço Único",
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  planning: "Em Planejamento",
};

export const BILLING_LABELS: Record<BillingCycle, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  annual: "Anual",
  one_time: "Único",
};
