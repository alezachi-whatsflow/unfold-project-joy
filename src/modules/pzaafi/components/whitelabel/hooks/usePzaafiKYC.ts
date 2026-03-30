import { useState } from 'react';

/**
 * Placeholder hook for Pzaafi KYC management.
 * Will be expanded with KYC initiation, status polling, and approval flows.
 */
export function usePzaafiKYC() {
  const [loading] = useState(false);

  return {
    loading,
  };
}
