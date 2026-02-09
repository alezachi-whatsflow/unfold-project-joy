import { useCustomers } from "@/contexts/CustomerContext";
import { CustomerCSVImport } from "@/components/input/CustomerCSVImport";
import { formatCurrency } from "@/lib/calculations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Users, UserCheck, UserX, DollarSign } from "lucide-react";

export default function CustomersPage() {
  const {
    customers,
    activeCount,
    churnedCount,
    totalMRR,
    totalCustomers,
    deleteCustomer,
    isLoading,
  } = useCustomers();

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
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Gestão de Clientes
        </h1>
        <p className="text-sm text-muted-foreground">
          Importe e gerencie a base de clientes da Whatsflow
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
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

      {/* Import Section */}
      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              Lista de Clientes ({customers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Email</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs text-muted-foreground text-right">Dispositivos</TableHead>
                    <TableHead className="text-xs text-muted-foreground text-right">Atendentes</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Checkout</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Condição</TableHead>
                    <TableHead className="text-xs text-muted-foreground text-right">Valor</TableHead>
                    <TableHead className="text-xs text-muted-foreground w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum cliente importado. Use o botão ao lado para importar um CSV.
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="border-border hover:bg-secondary/50"
                      >
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">
                          {customer.nome}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {customer.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.status.toLowerCase() === "ativo"
                                ? "default"
                                : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-display text-sm">
                          {customer.dispositivosOficial}
                        </TableCell>
                        <TableCell className="text-right font-display text-sm">
                          {customer.atendentes}
                        </TableCell>
                        <TableCell className="text-sm">{customer.checkout}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className="text-[10px]">
                            {customer.condicao || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-display text-sm">
                          {formatCurrency(customer.valorUltimaCobranca)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteCustomer(customer.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <CustomerCSVImport />

          {/* Placeholder for future expense CSV import */}
          <Card className="border-border border-dashed opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Importar Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Em breve: importe dados de despesas financeiras via CSV.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
