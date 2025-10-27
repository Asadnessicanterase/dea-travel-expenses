"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
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
import { Building2, Plus, Edit, Trash2, ArrowLeft, Users, FileText } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Approver {
  id: string;
  name: string | null;
  email: string | null;
}

interface Department {
  id: string;
  name: string;
  approverId: string | null;
  approver: Approver | null;
  createdAt: string;
  _count?: {
    users: number;
    travelRequests: number;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export default function DepartmentsClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    approverId: "",
  });

  useEffect(() => {
    fetchDepartments();
    fetchApprovers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      } else {
        toast.error("Failed to fetch departments");
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      toast.error("Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        // Filter users with APPROVER role
        const approverUsers = data.filter((user: User) => user.role === "APPROVER");
        setApprovers(approverUsers);
      }
    } catch (error) {
      console.error("Failed to fetch approvers:", error);
    }
  };

  const handleAddDepartment = async () => {
    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      const response = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          approverId: formData.approverId || null,
        }),
      });

      if (response.ok) {
        toast.success("Department created successfully");
        setShowAddDialog(false);
        setFormData({ name: "", approverId: "" });
        fetchDepartments();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create department");
      }
    } catch (error) {
      console.error("Failed to create department:", error);
      toast.error("Failed to create department");
    }
  };

  const handleEditDepartment = async () => {
    if (!selectedDepartment) return;

    if (!formData.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      const response = await fetch(`/api/admin/departments?id=${selectedDepartment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          approverId: formData.approverId || null,
        }),
      });

      if (response.ok) {
        toast.success("Department updated successfully");
        setShowEditDialog(false);
        setSelectedDepartment(null);
        setFormData({ name: "", approverId: "" });
        fetchDepartments();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update department");
      }
    } catch (error) {
      console.error("Failed to update department:", error);
      toast.error("Failed to update department");
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      const response = await fetch(`/api/admin/departments?id=${selectedDepartment.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Department deleted successfully");
        setShowDeleteDialog(false);
        setSelectedDepartment(null);
        fetchDepartments();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete department");
      }
    } catch (error) {
      console.error("Failed to delete department:", error);
      toast.error("Failed to delete department");
    }
  };

  const openAddDialog = () => {
    setFormData({ name: "", approverId: "" });
    setShowAddDialog(true);
  };

  const openEditDialog = (department: Department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      approverId: department.approverId || "",
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (department: Department) => {
    setSelectedDepartment(department);
    setShowDeleteDialog(true);
  };

  // Get available approvers (not assigned to other departments, excluding current department in edit mode)
  const getAvailableApprovers = () => {
    const assignedApproverIds = departments
      .filter((dept) => dept.approverId && dept.id !== selectedDepartment?.id)
      .map((dept) => dept.approverId);

    return approvers.filter((approver) => !assignedApproverIds.includes(approver.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Department Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage departments and assign approvers for travel request routing
            </p>
          </div>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            {departments.length} department{departments.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No departments configured yet.</p>
              <p className="text-sm mt-2">Users without departments will use the global approver.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Requests</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">{department.name}</TableCell>
                    <TableCell>
                      {department.approver ? (
                        <div>
                          <div className="font-medium">{department.approver.name}</div>
                          <div className="text-sm text-gray-500">{department.approver.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No approver assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        {department._count?.users || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {department._count?.travelRequests || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(department)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(department)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Department Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Create a new department and optionally assign an approver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="add-name">Department Name *</Label>
              <Input
                id="add-name"
                placeholder="e.g., Finance, Marketing, Operations"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add-approver">Approver (Optional)</Label>
              <Select
                value={formData.approverId || "none"}
                onValueChange={(value) => setFormData({ ...formData, approverId: value === "none" ? "" : value })}
              >
                <SelectTrigger id="add-approver">
                  <SelectValue placeholder="Select an approver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No approver</SelectItem>
                  {getAvailableApprovers().map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      {approver.name} ({approver.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Only users with APPROVER role can be assigned
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDepartment}>Create Department</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update department name or reassign approver.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-approver">Approver</Label>
              <Select
                value={formData.approverId || "none"}
                onValueChange={(value) => setFormData({ ...formData, approverId: value === "none" ? "" : value })}
              >
                <SelectTrigger id="edit-approver">
                  <SelectValue placeholder="Select an approver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No approver</SelectItem>
                  {getAvailableApprovers().map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      {approver.name} ({approver.email})
                    </SelectItem>
                  ))}
                  {/* Include current approver if editing */}
                  {selectedDepartment?.approver &&
                    !getAvailableApprovers().find(
                      (a) => a.id === selectedDepartment.approver?.id
                    ) && (
                      <SelectItem value={selectedDepartment.approver.id}>
                        {selectedDepartment.approver.name} (
                        {selectedDepartment.approver.email}) - Current
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDepartment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the department "{selectedDepartment?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedDepartment?._count && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This department has:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-800 mt-2">
                  <li>{selectedDepartment._count.users} user(s)</li>
                  <li>{selectedDepartment._count.travelRequests} travel request(s)</li>
                </ul>
                <p className="text-sm text-yellow-800 mt-2">
                  Deletion is only allowed when no users or requests are associated.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDepartment}>
              Delete Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
