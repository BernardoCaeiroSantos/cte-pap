import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, UserCog } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { UserRole } from "@/lib/supabase-types";

const roleLabels: Record<UserRole, string> = {
  student: "Aluno",
  teacher: "Professor",
  technician: "Técnico",
  admin: "Administrador",
};

const roleColors: Record<UserRole, string> = {
  student: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  teacher: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  technician: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  department?: string;
  created_at: string;
  role: UserRole;
  role_id: string;
}

export function AdminUsers() {
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("student");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles.map(r => [r.user_id, { role: r.role as UserRole, role_id: r.id }]));

      return profiles.map(p => ({
        ...p,
        role: rolesMap.get(p.user_id)?.role || "student" as UserRole,
        role_id: rolesMap.get(p.user_id)?.role_id || "",
      })) as UserWithRole[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      roleId,
      userId,
      newRole,
    }: {
      roleId: string;
      userId: string;
      newRole: UserRole;
    }) => {
      if (roleId) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", roleId);

        if (error) throw error;
      } else {
        // Insert new role if none exists
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role do utilizador atualizado!");
      setSelectedUser(null);
    },
    onError: () => toast.error("Erro ao atualizar role"),
  });

  const handleUpdateRole = () => {
    if (!selectedUser) return;

    updateRoleMutation.mutate({
      roleId: selectedUser.role_id,
      userId: selectedUser.user_id,
      newRole,
    });
  };

  const openRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole(user.role);
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return <div className="text-muted-foreground">A carregar utilizadores...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Utilizadores</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os roles</SelectItem>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Registado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department || "-"}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "dd/MM/yyyy", {
                        locale: pt,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRoleDialog(user)}
                      >
                        <UserCog className="h-4 w-4 mr-1" />
                        Alterar Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum utilizador encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role do Utilizador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">{selectedUser?.full_name}</h4>
              <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newRole}
                onValueChange={(value: UserRole) => setNewRole(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateRole}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
