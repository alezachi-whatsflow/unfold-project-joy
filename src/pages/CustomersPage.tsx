import { useCustomers } from "@/contexts/CustomerContext";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useFinancial } from "@/contexts/FinancialContext";
import { formatCurrency, getMonthFullLabel } from "@/lib/calculations";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Users, UserCheck, UserX, DollarSign, CalendarRange, Plus, Pencil } from "lucide-react";
import { useCustomerFilters, ColumnFilterPopover, CustomerSearchBar } from "@/components/customers/CustomerTableFilters";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { useState } from "react";
import type { Customer } from "@/types/customers";

function formatDateBR(date: string | null): string {
  if (!date) return "-";
  const parts = date.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return date;
}

export default function CustomersPage() {
  const { entries, selectedMonth, setSelectedMonth } = useFinancial();
  const {
    customers, activeCount, churnedCount, totalMRR, totalCustomers, deleteCustomer, importCustomers, isLoading,
  } = useCustomers();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const handleSaveCustomer = async (customer: Customer) => {
    await importCustomers([customer]);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const { filters, uniqueValues, filteredCustomers, toggleFilter, clearFilter, activeFilterCount, searchQuery, setSearchQuery, clearAll } =
    useCustomerFilters(customers);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Gestão de Clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize e gerencie a base de clientes da Whatsflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate module="clientes" action="create">
            <Button size="sm" onClick={openNew} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo Cliente
            </Button>
          </PermissionGate>
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-9 w-[200px] border-border bg-secondary text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entries.map((e) => (
                <SelectItem key={e.month} value={e.month}>
                  {getMonthFullLabel(e.month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Clientes</p>
              <p className="font-display text-xl font-bold text-foreground">{totalCustomers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center bg-primary/10">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="font-display text-xl font-bold text-foreground">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center bg-destructive/10">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Desativados</p>
              <p className="font-display text-xl font-bold text-foreground">{churnedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center bg-accent/10">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MRR (Clientes Ativos)</p>
              <p className="font-display text-xl font-bold text-foreground">
                {formatCurrency(totalMRR)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <CustomerSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        uniqueValues={uniqueValues}
        filters={filters}
        toggleFilter={toggleFilter}
        clearFilter={clearFilter}
        clearAll={clearAll}
        activeFilterCount={activeFilterCount}
      />

      {/* Customer Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            Lista de Clientes ({filteredCustomers.length}
            {(activeFilterCount > 0 || searchQuery) && ` de ${customers.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">Empresa / Titular</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs">
                    <ColumnFilterPopover label="Status" filterKey="status" options={uniqueValues.status} selected={filters.status} onToggle={toggleFilter} onClear={clearFilter} />
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground">Ativação</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Cancelado</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Bloqueio</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Desbloqueio</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Vencimento</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">Disp. Oficial</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">Atendentes</TableHead>
                  <TableHead className="text-xs">
                    <ColumnFilterPopover label="Checkout" filterKey="checkout" options={uniqueValues.checkout} selected={filters.checkout} onToggle={toggleFilter} onClear={clearFilter} />
                  </TableHead>
                  <TableHead className="text-xs">
                    <ColumnFilterPopover label="Condição" filterKey="condicao" options={uniqueValues.condicao} selected={filters.condicao} onToggle={toggleFilter} onClear={clearFilter} />
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">Valor</TableHead>
                  <TableHead className="text-xs text-muted-foreground w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-sm text-muted-foreground py-8">
                      {customers.length === 0
                        ? "Nenhum cliente importado. Vá em Inserir Dados → Clientes para importar."
                        : "Nenhum cliente encontrado com os filtros aplicados."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="border-border hover:bg-secondary/50">
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{customer.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{customer.email}</TableCell>
                      <TableCell>
                        <Badge variant={customer.status.toLowerCase() === "ativo" ? "default" : "destructive"} className="text-[10px]">
                          {customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateBR(customer.dataAtivacao)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateBR(customer.dataCancelado)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateBR(customer.dataBloqueio)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateBR(customer.dataDesbloqueio)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateBR(customer.dataVencimento)}</TableCell>
                      <TableCell className="text-right font-display text-sm">{customer.dispositivosOficial}</TableCell>
                      <TableCell className="text-right font-display text-sm">{customer.atendentes}</TableCell>
                      <TableCell className="text-sm">{customer.checkout}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="text-[10px]">{customer.condicao || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-display text-sm">{formatCurrency(customer.valorUltimaCobranca)}</TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <PermissionGate module="clientes" action="edit">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(customer)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate module="clientes" action="delete">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteCustomer(customer.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSaveCustomer}
        editing={editingCustomer}
      />
    </div>
  );
}
