import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  WebScrap,
  ProfileAnalysis,
  BusinessLead,
  AuthorityDiagnostic,
  AnalysisStatus,
} from "@/types/intelligence";
import { fetchWebScraps, fetchProfiles, fetchBusinessLeads, insertWebScrap } from "@/lib/intelligenceQueries";

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
  persistWebScrap: (scrap: Omit<WebScrap, "id">) => Promise<WebScrap>;
  isLoadingHistory: boolean;
}

const IntelligenceContext = createContext<IntelligenceContextType | null>(null);

export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [webScraps, setWebScraps] = useState<WebScrap[]>([]);
  const [profiles, setProfiles] = useState<ProfileAnalysis[]>([]);
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [currentDiagnostic, setCurrentDiagnostic] = useState<AuthorityDiagnostic | null>(null);
  const [currentStatus, setCurrentStatus] = useState<AnalysisStatus>("pending");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load history from Supabase on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const [scraps, profs, bLeads] = await Promise.all([
          fetchWebScraps(),
          fetchProfiles(),
          fetchBusinessLeads(),
        ]);
        setWebScraps(scraps);
        setProfiles(profs);
        setLeads(bLeads);
      } catch (err) {
        console.error("Failed to load intelligence history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, []);

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

  const persistWebScrap = useCallback(async (scrap: Omit<WebScrap, "id">): Promise<WebScrap> => {
    const saved = await insertWebScrap(scrap);
    setWebScraps((prev) => [saved, ...prev]);
    return saved;
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
        persistWebScrap,
        isLoadingHistory,
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
