import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import type { AsaasCustomer } from "@/types/asaas";
import { supabase } from "@/integrations/supabase/client";

interface UnifiedCustomer {
  id: string; // asaas_id for asaas customers, uuid for manual customers
  name: string;
  cpfCnpj: string;
  email: string;
  source: "asaas" | "manual";
}

interface Props {
  customers: AsaasCustomer[];
  selectedCustomers: string[];
  setSelectedCustomers: (ids: string[]) => void;
}

export function CustomerSelectionCard({ customers: asaasCustomers, selectedCustomers, setSelectedCustomers }: Props) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [manualCustomers, setManualCustomers] = useState<UnifiedCustomer[]>([]);

  // Load manual customers from the customers table
  useEffect(() => {
    async function loadManual() {
      const { data } = await supabase
        .from("customers")
        .select("id, nome, email, cpf_cnpj")
        .order("nome", { ascending: true });

      if (data) {
        setManualCustomers(
          data.map((c: any) => ({
            id: `manual_${c.id}`,
            name: c.nome || "",
            cpfCnpj: c.cpf_cnpj || "",
            email: c.email || "",
            source: "manual" as const,
          }))
        );
      }
    }
    loadManual();
  }, []);

  // Merge asaas + manual customers, dedup by email
  const allCustomers = useMemo(() => {
    const unified: UnifiedCustomer[] = [];
    const seenEmails = new Set<string>();

    // Asaas customers first
    for (const c of asaasCustomers) {
      const email = (c.email || "").toLowerCase();
      if (email) seenEmails.add(email);
      unified.push({
        id: c.asaas_id,
        name: c.name,
        cpfCnpj: c.cpf_cnpj || "",
        email: c.email || "",
        source: "asaas",
      });
    }

    // Manual customers not already in Asaas
    for (const c of manualCustomers) {
      const email = c.email.toLowerCase();
      if (email && seenEmails.has(email)) continue;
      unified.push(c);
    }

    return unified;
  }, [asaasCustomers, manualCustomers]);

  const filteredCustomers = allCustomers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.cpfCnpj.includes(customerSearch)
  );

  const toggleCustomer = (id: string) => {
    setSelectedCustomers(
      selectedCustomers.includes(id)
        ? selectedCustomers.filter((i) => i !== id)
        : [...selectedCustomers, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map((c) => c.id));
    }
    setSelectAll(!selectAll);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Selecionar Clientes
          {selectedCustomers.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {selectedCustomers.length} selecionado(s)
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Selecione os clientes que receberão a cobrança
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder="Buscar cliente por nome, email ou CPF/CNPJ..."
          className="h-8 text-xs"
        />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={toggleSelectAll}>
            {selectAll ? "Desmarcar todos" : "Selecionar todos"}
          </Button>
          {selectedCustomers.length > 0 && (
            <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => { setSelectedCustomers([]); setSelectAll(false); }}>
              Limpar seleção
            </Button>
          )}
        </div>

        <div className="max-h-[320px] overflow-y-auto border border-border">
          {filteredCustomers.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {allCustomers.length === 0
                ? "Nenhum cliente encontrado. Cadastre ou sincronize clientes primeiro."
                : "Nenhum cliente encontrado para a busca."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10 text-xs"></TableHead>
                  <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-xs text-muted-foreground">CPF/CNPJ</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs text-muted-foreground w-16">Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((c) => (
                  <TableRow
                    key={c.id}
                    className={`border-border cursor-pointer transition-colors ${
                      selectedCustomers.includes(c.id) ? "bg-primary/5" : "hover:bg-secondary/50"
                    }`}
                    onClick={() => toggleCustomer(c.id)}
                  >
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="rounded border-border"
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.cpfCnpj || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.email || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.source === "asaas" ? "default" : "outline"} className="text-[9px] px-1.5">
                        {c.source === "asaas" ? "Asaas" : "Manual"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
