// ── Services ───────────────────────────────────────────────────
export {
  type PzaafiRole,
  type PzaafiPermission,
  PERMISSIONS,
  hasPermission,
  getRolePermissions,
  getUserRole,
} from './services/rbacService';

export {
  type Subaccount,
  type CreateSubaccountInput,
  createSubaccount,
  listSubaccounts,
  activateSubaccount,
} from './services/subaccountService';

export {
  type BrandingConfig,
  type UpdateBrandingInput,
  updateBranding,
  getBrandingForCheckout,
} from './services/brandingService';

export {
  type CommissionRule,
  type CommissionResult,
  calculateCommission,
  chargeCommission,
} from './services/commissionService';

export {
  type KYCRecord,
  type InitiateKYCInput,
  initiateKYC,
} from './services/kycService';

// ── Hooks ──────────────────────────────────────────────────────
export { usePzaafiRBAC } from './hooks/usePzaafiRBAC';
export { usePzaafiWhiteLabel } from './hooks/usePzaafiWhiteLabel';
export { usePzaafiKYC } from './hooks/usePzaafiKYC';
