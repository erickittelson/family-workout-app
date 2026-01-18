"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Loader2, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  latestMetrics?: {
    weight?: number;
    height?: number;
    bodyFatPercentage?: number;
    fitnessLevel?: string;
  };
}

export default function MembersPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    gender: "",
    weight: "",
    height: "",
    bodyFatPercentage: "",
    fitnessLevel: "",
    notes: "",
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load family members");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      dateOfBirth: "",
      gender: "",
      weight: "",
      height: "",
      bodyFatPercentage: "",
      fitnessLevel: "",
      notes: "",
    });
    setEditingMember(null);
  };

  const openEditDialog = (member: FamilyMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      dateOfBirth: member.dateOfBirth || "",
      gender: member.gender || "",
      weight: member.latestMetrics?.weight?.toString() || "",
      height: member.latestMetrics?.height?.toString() || "",
      bodyFatPercentage: member.latestMetrics?.bodyFatPercentage?.toString() || "",
      fitnessLevel: member.latestMetrics?.fitnessLevel || "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingMember
        ? `/api/members/${editingMember.id}`
        : "/api/members";
      const method = editingMember ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          dateOfBirth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          metrics: {
            weight: formData.weight ? parseFloat(formData.weight) : null,
            height: formData.height ? parseFloat(formData.height) : null,
            bodyFatPercentage: formData.bodyFatPercentage
              ? parseFloat(formData.bodyFatPercentage)
              : null,
            fitnessLevel: formData.fitnessLevel || null,
            notes: formData.notes || null,
          },
        }),
      });

      if (response.ok) {
        toast.success(
          editingMember ? "Member updated successfully" : "Member added successfully"
        );
        setDialogOpen(false);
        resetForm();
        fetchMembers();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save member");
      }
    } catch (error) {
      console.error("Failed to save member:", error);
      toast.error("Failed to save member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this family member?")) {
      return;
    }

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Member removed successfully");
        fetchMembers();
      } else {
        toast.error("Failed to remove member");
      }
    } catch (error) {
      console.error("Failed to delete member:", error);
      toast.error("Failed to remove member");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Family Members</h1>
          <p className="text-muted-foreground">
            Manage your family&apos;s profiles and metrics
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Edit Member" : "Add Family Member"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Current Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({ ...formData, weight: e.target.value })
                      }
                      placeholder="150"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (inches)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) =>
                        setFormData({ ...formData, height: e.target.value })
                      }
                      placeholder="70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bodyFat">Body Fat %</Label>
                    <Input
                      id="bodyFat"
                      type="number"
                      step="0.1"
                      value={formData.bodyFatPercentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bodyFatPercentage: e.target.value,
                        })
                      }
                      placeholder="15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fitnessLevel">Fitness Level</Label>
                    <Select
                      value={formData.fitnessLevel}
                      onValueChange={(value) =>
                        setFormData({ ...formData, fitnessLevel: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingMember ? "Save Changes" : "Add Member"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No family members yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first family member to get started
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-lg">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {member.dateOfBirth && (
                          <span className="text-sm text-muted-foreground">
                            {calculateAge(member.dateOfBirth)} years old
                          </span>
                        )}
                        {member.gender && (
                          <Badge variant="outline" className="text-xs">
                            {member.gender}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(member)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(member.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {member.latestMetrics ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {member.latestMetrics.weight && (
                      <div>
                        <span className="text-muted-foreground">Weight:</span>{" "}
                        {member.latestMetrics.weight} lbs
                      </div>
                    )}
                    {member.latestMetrics.height && (
                      <div>
                        <span className="text-muted-foreground">Height:</span>{" "}
                        {Math.floor(member.latestMetrics.height / 12)}&apos;
                        {member.latestMetrics.height % 12}&quot;
                      </div>
                    )}
                    {member.latestMetrics.bodyFatPercentage && (
                      <div>
                        <span className="text-muted-foreground">Body Fat:</span>{" "}
                        {member.latestMetrics.bodyFatPercentage}%
                      </div>
                    )}
                    {member.latestMetrics.fitnessLevel && (
                      <div>
                        <Badge variant="secondary">
                          {member.latestMetrics.fitnessLevel}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No metrics recorded yet
                  </p>
                )}
                <div className="mt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/members/${member.id}`}>View Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
