import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useAdmins } from "@/hooks/use-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Shield, AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminDashboard() {
  const { admin } = useAuth();
  const [, setLocation] = useLocation();
  const { admins, isLoading, createAdmin, updateAdmin, deleteAdmin } = useAdmins();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);

  const [formData, setFormData] = useState({
    adminId: "",
    password: "",
    name: "",
    wardAssigned: "",
    role: "ADMIN",
  });

  // Redirect if not Super Admin
  if (admin && admin.role !== "SUPER_ADMIN") {
    setLocation("/admin/dashboard");
    return null;
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdmin.mutateAsync(formData);
      toast({
        title: "Admin Created",
        description: `Admin account '${formData.adminId}' has been created successfully.`,
      });
      setIsCreateOpen(false);
      setFormData({ adminId: "", password: "", name: "", wardAssigned: "", role: "ADMIN" });
    } catch (err: any) {
      toast({
        title: "Creation Failed",
        description: err.message || "Failed to create admin",
        variant: "destructive",
      });
    }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    try {
      const updateData: any = {
        name: formData.name,
        wardAssigned: formData.wardAssigned,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await updateAdmin.mutateAsync({ id: editingAdmin.id, data: updateData });
      toast({
        title: "Admin Updated",
        description: `Admin '${editingAdmin.adminId}' has been updated successfully.`,
      });
      setIsEditOpen(false);
      setEditingAdmin(null);
      setFormData({ adminId: "", password: "", name: "", wardAssigned: "", role: "ADMIN" });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update admin",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdmin = async (id: number, adminId: string) => {
    if (!confirm(`Are you sure you want to delete admin '${adminId}'?`)) return;
    try {
      await deleteAdmin.mutateAsync(id);
      toast({
        title: "Admin Deleted",
        description: `Admin '${adminId}' has been deleted successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete admin",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (admin: any) => {
    setEditingAdmin(admin);
    setFormData({
      adminId: admin.adminId,
      password: "",
      name: admin.name,
      wardAssigned: admin.wardAssigned,
      role: admin.role,
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-slate-500">Manage admin accounts and ward assignments</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-admin">
              <Plus className="h-4 w-4" /> Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Admin Account</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new admin account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <Label htmlFor="adminId" className="text-slate-700">Admin ID (Username)</Label>
                <Input
                  id="adminId"
                  type="text"
                  placeholder="e.g., admin_ward5"
                  value={formData.adminId}
                  onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                  required
                  data-testid="input-admin-id"
                />
              </div>

              <div>
                <Label htmlFor="name" className="text-slate-700">Admin Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-admin-name"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="input-admin-password"
                />
              </div>

              <div>
                <Label htmlFor="wardAssigned" className="text-slate-700">Ward Assigned</Label>
                <Input
                  id="wardAssigned"
                  type="text"
                  placeholder="e.g., Ward 5 or All"
                  value={formData.wardAssigned}
                  onChange={(e) => setFormData({ ...formData, wardAssigned: e.target.value })}
                  data-testid="input-ward-assigned"
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={createAdmin.isPending} data-testid="button-submit-admin">
                {createAdmin.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Admin
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin Account</DialogTitle>
            <DialogDescription>
              Update admin details. Leave password blank to keep current password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAdmin} className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-slate-700">Admin Name</Label>
              <Input
                id="edit-name"
                type="text"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-edit-admin-name"
              />
            </div>

            <div>
              <Label htmlFor="edit-password" className="text-slate-700">Password (Optional)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                data-testid="input-edit-admin-password"
              />
            </div>

            <div>
              <Label htmlFor="edit-wardAssigned" className="text-slate-700">Ward Assigned</Label>
              <Input
                id="edit-wardAssigned"
                type="text"
                placeholder="e.g., Ward 5 or All"
                value={formData.wardAssigned}
                onChange={(e) => setFormData({ ...formData, wardAssigned: e.target.value })}
                data-testid="input-edit-ward-assigned"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={updateAdmin.isPending} data-testid="button-save-admin">
                {updateAdmin.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingAdmin(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Accounts</CardTitle>
          <CardDescription>Total active administrators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">{admins.length}</div>
          <p className="text-sm text-slate-500 mt-2">Admins managing municipal issues</p>
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin List</CardTitle>
          <CardDescription>All administrators and their ward assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
              <p className="text-slate-500 mt-2">Loading admins...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed">
              <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">No admins created yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Ward Assigned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin: any) => (
                    <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                      <TableCell className="font-medium">{admin.adminId}</TableCell>
                      <TableCell>{admin.name}</TableCell>
                      <TableCell>
                        <Badge variant={admin.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{admin.wardAssigned || "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant={admin.isActive ? "default" : "destructive"}>
                          {admin.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(admin)}
                          data-testid={`button-edit-admin-${admin.id}`}
                          disabled={admin.role === "SUPER_ADMIN"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAdmin(admin.id, admin.adminId)}
                          data-testid={`button-delete-admin-${admin.id}`}
                          disabled={admin.role === "SUPER_ADMIN"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
