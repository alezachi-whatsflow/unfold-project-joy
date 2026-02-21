import React, { createContext, useContext, useState, useCallback } from "react";
import {
  WebScrap,
  ProfileAnalysis,
  BusinessLead,
  AuthorityDiagnostic,
  AnalysisStatus,
} from "@/types/intelligence";

interface IntelligenceContextType {
  webScraps: WebScrap[];
  profiles: ProfileAnalysis[];
  leads: BusinessLead[];
  currentDiagnostic: AuthorityDiagnostic | null;
  currentStatus: AnalysisStatus;
  addWebScrap: (scrap: WebScrap) => void;
  addProfile: (profile: ProfileAnalysis) => void;
  addLead: (lead: BusinessLead) => void;
  setDiagnostic: (diagnostic: AuthorityDiagnostic | null) => void;
  setCurrentStatus: (status: AnalysisStatus) => void;
  clearResults: () => void;
}

const IntelligenceContext = createContext<IntelligenceContextType | null>(null);

export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [webScraps, setWebScraps] = useState<WebScrap[]>([]);
  const [profiles, setProfiles] = useState<ProfileAnalysis[]>([]);
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [currentDiagnostic, setCurrentDiagnostic] = useState<AuthorityDiagnostic | null>(null);
  const [currentStatus, setCurrentStatus] = useState<AnalysisStatus>("pending");

  const addWebScrap = useCallback((scrap: WebScrap) => {
    setWebScraps((prev) => [scrap, ...prev]);
  }, []);

  const addProfile = useCallback((profile: ProfileAnalysis) => {
    setProfiles((prev) => [profile, ...prev]);
  }, []);

  const addLead = useCallback((lead: BusinessLead) => {
    setLeads((prev) => [lead, ...prev]);
  }, []);

  const setDiagnostic = useCallback((diagnostic: AuthorityDiagnostic | null) => {
    setCurrentDiagnostic(diagnostic);
  }, []);

  const clearResults = useCallback(() => {
    setWebScraps([]);
    setProfiles([]);
    setLeads([]);
    setCurrentDiagnostic(null);
    setCurrentStatus("pending");
  }, []);

  return (
    <IntelligenceContext.Provider
      value={{
        webScraps,
        profiles,
        leads,
        currentDiagnostic,
        currentStatus,
        addWebScrap,
        addProfile,
        addLead,
        setDiagnostic,
        setCurrentStatus,
        clearResults,
      }}
    >
      {children}
    </IntelligenceContext.Provider>
  );
}

export function useIntelligence() {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) throw new Error("useIntelligence must be used within IntelligenceProvider");
  return ctx;
}
