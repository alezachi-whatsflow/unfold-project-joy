import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import type { AsaasCustomer } from "@/types/asaas";

interface Props {
  customers: AsaasCustomer[];
  selectedCustomers: string[];
  setSelectedCustomers: (ids: string[]) => void;
}

export function CustomerSelectionCard({ customers, selectedCustomers, setSelectedCustomers }: Props) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (c.cpf_cnpj && c.cpf_cnpj.includes(customerSearch))
  );

  const toggleCustomer = (asaasId: string) => {
    setSelectedCustomers(
      selectedCustomers.includes(asaasId)
        ? selectedCustomers.filter((id) => id !== asaasId)
        : [...selectedCustomers, asaasId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map((c) => c.asaas_id));
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

        <div className="max-h-[320px] overflow-y-auto rounded-md border border-border">
          {filteredCustomers.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {customers.length === 0
                ? "Nenhum cliente sincronizado. Sincronize na aba Cobranças primeiro."
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((c) => (
                  <TableRow
                    key={c.asaas_id}
                    className={`border-border cursor-pointer transition-colors ${
                      selectedCustomers.includes(c.asaas_id) ? "bg-primary/5" : "hover:bg-secondary/50"
                    }`}
                    onClick={() => toggleCustomer(c.asaas_id)}
                  >
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(c.asaas_id)}
                        onChange={() => toggleCustomer(c.asaas_id)}
                        className="rounded border-border"
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.cpf_cnpj || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.email || "-"}</TableCell>
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
