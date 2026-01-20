"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Package,
  Loader2,
  Trash2,
  Edit,
  ShoppingBag,
  Dumbbell,
  Heart,
  Wrench,
  Bike,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  category: string;
  description?: string;
  quantity?: number;
  brand?: string;
  model?: string;
  isFromMarketplace?: boolean;
}

interface MarketplaceItem {
  id?: string;
  name: string;
  category: string;
  description?: string;
  commonBrands?: string[];
}

const CATEGORIES = [
  { value: "cardio", label: "Cardio", icon: Bike },
  { value: "strength", label: "Strength", icon: Dumbbell },
  { value: "flexibility", label: "Flexibility", icon: Heart },
  { value: "accessories", label: "Accessories", icon: Wrench },
];

const getCategoryIcon = (category: string) => {
  const cat = CATEGORIES.find((c) => c.value === category);
  return cat ? cat.icon : Package;
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [marketplaceDialogOpen, setMarketplaceDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("my-equipment");

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    quantity: "1",
    brand: "",
    model: "",
  });

  useEffect(() => {
    fetchEquipment();
    fetchMarketplace();
  }, []);

  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/equipment");
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      }
    } catch (error) {
      console.error("Failed to fetch equipment:", error);
      toast.error("Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketplace = async () => {
    try {
      const response = await fetch("/api/equipment/marketplace");
      if (response.ok) {
        const data = await response.json();
        setMarketplace(data);
      }
    } catch (error) {
      console.error("Failed to fetch marketplace:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      quantity: "1",
      brand: "",
      model: "",
    });
    setEditingItem(null);
  };

  const openEditDialog = (item: Equipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || "",
      quantity: String(item.quantity || 1),
      brand: item.brand || "",
      model: item.model || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingItem
        ? `/api/equipment/${editingItem.id}`
        : "/api/equipment";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          description: formData.description || null,
          quantity: parseInt(formData.quantity) || 1,
          brand: formData.brand || null,
          model: formData.model || null,
        }),
      });

      if (response.ok) {
        toast.success(
          editingItem ? "Equipment updated" : "Equipment added"
        );
        setDialogOpen(false);
        resetForm();
        fetchEquipment();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save equipment");
      }
    } catch (error) {
      console.error("Failed to save equipment:", error);
      toast.error("Failed to save equipment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this equipment?")) {
      return;
    }

    try {
      const response = await fetch(`/api/equipment/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Equipment removed");
        fetchEquipment();
      } else {
        toast.error("Failed to remove equipment");
      }
    } catch (error) {
      console.error("Failed to delete equipment:", error);
      toast.error("Failed to remove equipment");
    }
  };

  const addFromMarketplace = async (item: MarketplaceItem) => {
    try {
      const response = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          description: item.description,
          isFromMarketplace: true,
        }),
      });

      if (response.ok) {
        toast.success(`${item.name} added to your equipment`);
        fetchEquipment();
      } else {
        toast.error("Failed to add equipment");
      }
    } catch (error) {
      console.error("Failed to add from marketplace:", error);
      toast.error("Failed to add equipment");
    }
  };

  const equipmentByCategory = equipment.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Equipment[]>);

  const marketplaceByCategory = marketplace.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MarketplaceItem[]>);

  const isInMyEquipment = (itemName: string) =>
    equipment.some((e) => e.name.toLowerCase() === itemName.toLowerCase());

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
          <h1 className="text-3xl font-bold">Equipment</h1>
          <p className="text-muted-foreground">
            Manage your circle&apos;s workout equipment
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
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Equipment" : "Add Equipment"}
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
                  placeholder="e.g., Adjustable Dumbbells"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder="e.g., Bowflex"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="e.g., SelectTech 552"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Any notes about this equipment..."
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
                <Button type="submit" disabled={saving || !formData.name || !formData.category}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingItem ? "Save Changes" : "Add Equipment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-equipment">My Equipment ({equipment.length})</TabsTrigger>
          <TabsTrigger value="marketplace">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Add from Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-equipment" className="mt-6">
          {equipment.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No equipment yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add equipment to help AI create better workout plans
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("marketplace")}
                  >
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Browse Marketplace
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map((category) => {
                const items = equipmentByCategory[category.value];
                if (!items || items.length === 0) return null;

                const CategoryIcon = category.icon;

                return (
                  <div key={category.value}>
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold">{category.label}</h2>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {items.map((item) => (
                        <Card key={item.id}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base">{item.name}</CardTitle>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            {(item.brand || item.model) && (
                              <CardDescription>
                                {[item.brand, item.model].filter(Boolean).join(" - ")}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {item.description}
                              </p>
                            )}
                            {item.quantity && item.quantity > 1 && (
                              <Badge variant="outline">Qty: {item.quantity}</Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="mt-6">
          <div className="space-y-6">
            {CATEGORIES.map((category) => {
              const items = marketplaceByCategory[category.value];
              if (!items || items.length === 0) return null;

              const CategoryIcon = category.icon;

              return (
                <div key={category.value}>
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">{category.label}</h2>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item, index) => {
                      const isOwned = isInMyEquipment(item.name);
                      return (
                        <Card
                          key={item.id || index}
                          className={isOwned ? "border-primary/50 bg-primary/5" : ""}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-sm">{item.name}</CardTitle>
                              {isOwned ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Check className="h-3 w-3" />
                                  Owned
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addFromMarketplace(item)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {item.description && (
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
