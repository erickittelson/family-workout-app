"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Trophy,
  Dumbbell,
  Calendar,
  Flag,
  Loader2,
  Star,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Challenge {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  durationDays: number;
  isOfficial: boolean;
  isFeatured: boolean;
  visibility: string;
  participantCount: number;
  createdAt: string;
}

interface Program {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  durationWeeks: number;
  isOfficial: boolean;
  isFeatured: boolean;
  visibility: string;
  enrollmentCount: number;
  createdAt: string;
}

interface Report {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  details: string | null;
  status: string;
  reporterId: string;
  createdAt: string;
}

interface Counts {
  challenges: number;
  programs: number;
  pendingReports: number;
}

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState("challenges");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Counts>({ challenges: 0, programs: 0, pendingReports: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Report resolution dialog
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchContent(activeTab);
  }, [activeTab]);

  const fetchContent = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/content?type=${type}`);
      if (response.ok) {
        const data = await response.json();
        setCounts(data.counts);
        
        if (type === "challenges") {
          setChallenges(data.data);
        } else if (type === "programs") {
          setPrograms(data.data);
        } else if (type === "reports") {
          setReports(data.data);
        }
      } else if (response.status === 403) {
        toast.error("Admin access required. You must be an admin of a system circle.");
      }
    } catch (error) {
      console.error("Failed to fetch content:", error);
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const updateContent = async (type: string, id: string, updates: Record<string, unknown>) => {
    setUpdating(id);
    try {
      const response = await fetch(`/api/admin/content/${type}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success("Content updated");
        fetchContent(type);
      } else {
        toast.error("Failed to update content");
      }
    } catch (error) {
      console.error("Failed to update content:", error);
      toast.error("Failed to update content");
    } finally {
      setUpdating(null);
    }
  };

  const resolveReport = async (status: "resolved" | "dismissed") => {
    if (!selectedReport) return;
    
    setResolving(true);
    try {
      const response = await fetch(`/api/admin/content/reports/${selectedReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNotes }),
      });

      if (response.ok) {
        toast.success(`Report ${status}`);
        setSelectedReport(null);
        setResolutionNotes("");
        fetchContent("reports");
      } else {
        toast.error("Failed to resolve report");
      }
    } catch (error) {
      console.error("Failed to resolve report:", error);
      toast.error("Failed to resolve report");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Content Management
          </h1>
          <p className="text-muted-foreground">
            Manage official challenges, programs, and community reports
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Challenges</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.challenges}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.programs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Flag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{counts.pendingReports}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="reports" className="relative">
            Reports
            {counts.pendingReports > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {counts.pendingReports}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Challenges</CardTitle>
              <CardDescription>Manage official and featured challenges</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Official</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Visible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challenges.map((challenge) => (
                      <TableRow key={challenge.id}>
                        <TableCell className="font-medium">{challenge.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{challenge.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            challenge.difficulty === "extreme" ? "destructive" :
                            challenge.difficulty === "advanced" ? "default" :
                            "secondary"
                          }>
                            {challenge.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>{challenge.durationDays} days</TableCell>
                        <TableCell>{challenge.participantCount}</TableCell>
                        <TableCell>
                          <Switch
                            checked={challenge.isOfficial}
                            onCheckedChange={(checked) => 
                              updateContent("challenges", challenge.id, { isOfficial: checked })
                            }
                            disabled={updating === challenge.id}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={challenge.isFeatured}
                            onCheckedChange={(checked) => 
                              updateContent("challenges", challenge.id, { isFeatured: checked })
                            }
                            disabled={updating === challenge.id}
                          />
                        </TableCell>
                        <TableCell>
                          {challenge.visibility === "public" ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Programs</CardTitle>
              <CardDescription>Manage official and featured programs</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Enrollments</TableHead>
                      <TableHead>Official</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Visible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">{program.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{program.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            program.difficulty === "advanced" ? "default" :
                            "secondary"
                          }>
                            {program.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>{program.durationWeeks} weeks</TableCell>
                        <TableCell>{program.enrollmentCount}</TableCell>
                        <TableCell>
                          <Switch
                            checked={program.isOfficial}
                            onCheckedChange={(checked) => 
                              updateContent("programs", program.id, { isOfficial: checked })
                            }
                            disabled={updating === program.id}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={program.isFeatured}
                            onCheckedChange={(checked) => 
                              updateContent("programs", program.id, { isFeatured: checked })
                            }
                            disabled={updating === program.id}
                          />
                        </TableCell>
                        <TableCell>
                          {program.visibility === "public" ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Reports</CardTitle>
              <CardDescription>Review and resolve community reports</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                  <p>No pending reports</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant="outline">{report.contentType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            report.reason === "harassment" ? "destructive" :
                            report.reason === "spam" ? "secondary" :
                            "default"
                          }>
                            {report.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {report.details || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            report.status === "pending" ? "default" :
                            report.status === "resolved" ? "secondary" :
                            "outline"
                          }>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {report.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReport(report)}
                            >
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Resolution Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Review the report and take appropriate action
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Content Type</Label>
                  <p className="font-medium">{selectedReport.contentType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="font-medium">{selectedReport.reason}</p>
                </div>
              </div>
              
              {selectedReport.details && (
                <div>
                  <Label className="text-muted-foreground">Details</Label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedReport.details}</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="notes">Resolution Notes</Label>
                <Textarea
                  id="notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => resolveReport("dismissed")}
              disabled={resolving}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
            <Button
              onClick={() => resolveReport("resolved")}
              disabled={resolving}
            >
              {resolving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
