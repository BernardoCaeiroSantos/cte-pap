import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDevices } from "@/components/admin/AdminDevices";
import { AdminReservations } from "@/components/admin/AdminReservations";
import { AdminIssues } from "@/components/admin/AdminIssues";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { Monitor, Calendar, AlertTriangle, Shield, Users } from "lucide-react";

const Admin = () => {
  const { isStaff, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isStaff) {
      navigate("/");
    }
  }, [isStaff, isLoading, navigate]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </Layout>
    );
  }

  if (!isStaff) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel de Administração</h1>
            <p className="text-muted-foreground">
              Gerir dispositivos, reservas e avarias
            </p>
          </div>
        </div>

        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Dispositivos</span>
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Avarias</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Utilizadores</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices">
            <AdminDevices />
          </TabsContent>

          <TabsContent value="reservations">
            <AdminReservations />
          </TabsContent>

          <TabsContent value="issues">
            <AdminIssues />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
