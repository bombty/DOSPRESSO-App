/**
 * RecruitmentSection — İşe Alım Modülü
 * Extracted from ik.tsx for maintainability
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isHQRole, type User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { UserPlus, Calendar, Users, MapPin, Building2, FileText, Star } from "lucide-react";
import { format } from "date-fns";

export default function RecruitmentSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [addPositionOpen, setAddPositionOpen] = useState(false);
  const [addApplicationOpen, setAddApplicationOpen] = useState(false);
  const [addInterviewOpen, setAddInterviewOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [interviewDetailOpen, setInterviewDetailOpen] = useState(false);
  const [positionClosingOpen, setPositionClosingOpen] = useState(false);
  const [branchFilterId, setBranchFilterId] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState<string>("all");
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  // Fetch job positions
  const { data: positions = [], isLoading: isPositionsLoading } = useQuery<any[]>({
    queryKey: ["/api/job-positions"],
    enabled: !!user,
  });

  // Fetch recruitment stats
  const { data: stats } = useQuery<{
    openPositions: number;
    newApplications: number;
    scheduledInterviews: number;
    hiredThisMonth: number;
  }>({
    queryKey: ["/api/hr/recruitment-stats"],
    enabled: !!user,
  });

  // Fetch applications
  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/job-applications"],
    enabled: !!user,
  });

  // Fetch branches
  const { data: branches = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
  });

  // Fetch interviews
  const { data: interviewsData = [] } = useQuery<any[]>({
    queryKey: ["/api/interviews"],
    enabled: !!user,
  });

  const statusLabels: Record<string, string> = {
    open: "Açık",
    paused: "Durduruldu",
    filled: "Dolduruldu",
    cancelled: "İptal",
    new: "Yeni",
    screening: "Ön Değerlendirme",
    interview_scheduled: "Mülakat Planlandı",
    interview_completed: "Mülakat Tamamlandı",
    offered: "Teklif Yapıldı",
    hired: "İşe Alındı",
    rejected: "Reddedildi",
    withdrawn: "Çekildi",
  };

  const priorityLabels: Record<string, string> = {
    low: "Düşük",
    normal: "Normal",
    high: "Yüksek",
    urgent: "Acil",
  };

  const filteredApplications = branchFilterId === "all" 
    ? applications 
    : applications.filter((app: any) => {
        const position = positions.find((p: any) => p.id === app.positionId);
        return position?.branchId?.toString() === branchFilterId;
      });

  const filteredInterviews = interviewsData.filter((interview: any) => {
    const app = applications.find((a: any) => a.id === interview.applicationId);
    const position = positions.find((p: any) => p.id === app?.positionId);
    
    // Branch filter
    if (branchFilterId !== "all" && position?.branchId?.toString() !== branchFilterId) {
      return false;
    }
    
    // Position filter
    if (positionFilter !== "all" && position?.id?.toString() !== positionFilter) {
      return false;
    }
    
    // Status filter
    if (interviewStatusFilter !== "all" && interview.status !== interviewStatusFilter) {
      return false;
    }
    
    return true;
  });

  const hiredCount = applications.filter((a: any) => a.status === 'hired').length;

  const toggleCandidateSelection = (appId: number) => {
    setSelectedCandidates(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats - Compact Inline */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Açık Pozisyon:</span>
              <span className="text-sm font-bold text-blue-600">{stats?.openPositions || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Yeni Başvuru:</span>
              <span className="text-sm font-bold text-orange-600">{stats?.newApplications || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Planlı Mülakat:</span>
              <span className="text-sm font-bold text-purple-600">{stats?.scheduledInterviews || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Bu Ay:</span>
              <span className="text-sm font-bold text-green-600">{stats?.hiredThisMonth || 0}</span>
            </div>
            <div className="flex items-center gap-1.5" data-testid="card-hired-candidates">
              <span className="text-xs text-muted-foreground">Kabul:</span>
              <span className="text-sm font-bold text-emerald-600">{hiredCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HQ Branch Filter */}
      {isHQRole(user?.role as any) && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Şube Filtresi:</label>
          </div>
          <Select value={branchFilterId} onValueChange={setBranchFilterId}>
            <SelectTrigger className="w-[200px]" data-testid="select-branch-filter">
              <SelectValue placeholder="Tüm Şubeler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Şubeler</SelectItem>
              {branches.map((branch: any) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCandidates.length >= 2 && (
            <Button 
              variant="outline"
              onClick={() => setComparisonOpen(true)}
              data-testid="button-compare-candidates"
            >
              <Users className="mr-2 h-4 w-4" />
              Karşılaştır ({selectedCandidates.length})
            </Button>
          )}
        </div>
      )}

      {/* Tabs for Positions, Applications and Interviews */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="w-full max-w-lg">
          <TabsTrigger value="positions" data-testid="tab-positions">
            Pozisyonlar
            <Badge variant="secondary" className="ml-2">{positions.filter(p => p.status === 'open').length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="applications" data-testid="tab-applications">
            Başvurular
            <Badge variant="secondary" className="ml-2">{applications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="interviews" data-testid="tab-interviews">
            Mülakatlar
            <Badge variant="secondary" className="ml-2">{interviewsData.filter(i => i.status === 'scheduled').length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Açık Pozisyonlar</h3>
            {isHQRole(user?.role as any) && (
              <Button onClick={() => setAddPositionOpen(true)} data-testid="button-add-position">
                <UserPlus className="mr-2 h-4 w-4" />
                Yeni Pozisyon
              </Button>
            )}
          </div>

          {isPositionsLoading ? (
            <ListSkeleton count={3} variant="card" />
          ) : positions.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Açık Pozisyon Yok"
              description="Yeni bir pozisyon ekleyerek başlayın."
              data-testid="empty-state-positions"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {positions.map((position: any) => (
                <Card 
                  key={position.id}
                  className="hover-elevate"
                  data-testid={`card-position-${position.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{position.title}</h3>
                        <Badge 
                          variant={position.status === 'open' ? 'default' : 'secondary'}
                          className={position.status === 'open' ? 'bg-green-600' : ''}
                        >
                          {statusLabels[position.status] || position.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">
                          {position.applicationCount || 0} başvuru
                        </Badge>
                        {position.priority !== 'normal' && (
                          <Badge 
                            variant={position.priority === 'urgent' ? 'destructive' : 'secondary'}
                          >
                            {priorityLabels[position.priority] || position.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {position.branchName ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{position.branchName}</span>
                        </div>
                      ) : (
                        <span>HQ</span>
                      )}
                    </div>
                    {position.deadline && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Son: {format(new Date(position.deadline), "dd.MM.yyyy")}
                      </div>
                    )}
                    {position.status === 'open' && isHQRole(user?.role as any) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPosition(position);
                          setPositionClosingOpen(true);
                        }}
                        data-testid={`button-close-position-${position.id}`}
                        className="w-full"
                      >
                        Pozisyonu Kapat
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Başvurular</h3>
            {(isHQRole(user?.role as any) || user?.role === 'supervisor') && positions.length > 0 && (
              <Button onClick={() => setAddApplicationOpen(true)} data-testid="button-add-application">
                <UserPlus className="mr-2 h-4 w-4" />
                Başvuru Ekle
              </Button>
            )}
          </div>

          {filteredApplications.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Başvuru Yok</p>
              <p className="text-sm text-muted-foreground">Henüz başvuru kaydı bulunmuyor.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Seç</span>
                  </TableHead>
                  <TableHead>Aday</TableHead>
                  <TableHead>Pozisyon</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app: any) => {
                  const position = positions.find((p: any) => p.id === app.positionId);
                  return (
                    <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCandidates.includes(app.id)}
                          onCheckedChange={() => toggleCandidateSelection(app.id)}
                          data-testid={`checkbox-candidate-${app.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {app.firstName} {app.lastName}
                      </TableCell>
                      <TableCell>
                        {position?.title || `Pozisyon #${app.positionId}`}
                      </TableCell>
                      <TableCell>{app.phone}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={
                              app.status === 'hired' ? 'default' :
                              app.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }
                            className={app.status === 'hired' ? 'bg-green-600' : ''}
                          >
                            {statusLabels[app.status] || app.status}
                          </Badge>
                          {app.interviewResult && (
                            <Badge 
                              variant={
                                app.interviewResult === 'positive' ? 'default' :
                                app.interviewResult === 'finalist' ? 'default' :
                                app.interviewResult === 'negative' ? 'destructive' :
                                'secondary'
                              }
                              className={
                                app.interviewResult === 'positive' ? 'bg-green-600' :
                                app.interviewResult === 'finalist' ? 'bg-blue-600' :
                                app.interviewResult === 'negative' ? '' :
                                ''
                              }
                              data-testid={`badge-result-${app.id}`}
                            >
                              {app.interviewResult === 'positive' ? 'Pozitif' :
                               app.interviewResult === 'finalist' ? 'Finalist' :
                               app.interviewResult === 'negative' ? 'Negatif' :
                               'Beklemede'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {app.createdAt ? format(new Date(app.createdAt), "dd.MM.yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {app.status !== 'hired' && app.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApplication(app);
                              setAddInterviewOpen(true);
                            }}
                            data-testid={`button-schedule-interview-${app.id}`}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Mülakat
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg font-medium">Mülakatlar</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-position-filter">
                  <SelectValue placeholder="Tüm Pozisyonlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Pozisyonlar</SelectItem>
                  {positions.map((pos: any) => (
                    <SelectItem key={pos.id} value={pos.id.toString()}>
                      {pos.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={interviewStatusFilter} onValueChange={setInterviewStatusFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-interview-status-filter">
                  <SelectValue placeholder="Tüm Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="scheduled">Planlandı</SelectItem>
                  <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredInterviews.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Mülakat Yok</p>
              <p className="text-sm text-muted-foreground">
                Başvuru listesinden aday seçerek mülakat planlayabilirsiniz.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aday</TableHead>
                  <TableHead>Pozisyon</TableHead>
                  <TableHead>Tarih/Saat</TableHead>
                  <TableHead>Görüşmeci</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInterviews.map((interview: any) => {
                  const app = applications.find((a: any) => a.id === interview.applicationId);
                  const position = positions.find((p: any) => p.id === app?.positionId);
                  return (
                    <TableRow 
                      key={interview.id} 
                      data-testid={`row-interview-${interview.id}`}
                      className="cursor-pointer hover-elevate"
                      onClick={() => {
                        setSelectedInterview({ ...interview, application: app, position });
                        setInterviewDetailOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        {app ? `${app.firstName} ${app.lastName}` : `Başvuru #${interview.applicationId}`}
                      </TableCell>
                      <TableCell>
                        {position?.title || '-'}
                      </TableCell>
                      <TableCell>
                        {interview.scheduledDate ? format(new Date(interview.scheduledDate), "dd.MM.yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell>{interview.notes?.split('|')[0]?.trim() || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            interview.status === 'completed' ? 'default' :
                            interview.status === 'cancelled' ? 'destructive' :
                            interview.status === 'in_progress' ? 'default' :
                            'secondary'
                          }
                          className={interview.status === 'in_progress' ? 'bg-blue-600' : ''}
                        >
                          {interview.status === 'scheduled' ? 'Planlandı' :
                           interview.status === 'in_progress' ? 'Devam Ediyor' :
                           interview.status === 'completed' ? 'Tamamlandı' :
                           interview.status === 'cancelled' ? 'İptal' : interview.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Position Dialog */}
      <AddPositionDialog 
        open={addPositionOpen} 
        onOpenChange={setAddPositionOpen} 
        branches={branches}
      />

      {/* Add Application Dialog */}
      <AddApplicationDialog 
        open={addApplicationOpen} 
        onOpenChange={setAddApplicationOpen} 
        positions={positions}
      />

      {/* Schedule Interview Dialog */}
      {selectedApplication && (
        <ScheduleInterviewDialog
          open={addInterviewOpen}
          onOpenChange={setAddInterviewOpen}
          application={selectedApplication}
        />
      )}

      {/* Interview Detail Modal */}
      {selectedInterview && (
        <InterviewDetailModal
          open={interviewDetailOpen}
          onOpenChange={setInterviewDetailOpen}
          interview={selectedInterview}
        />
      )}

      {/* Position Closing Modal */}
      {selectedPosition && (
        <PositionClosingModal
          open={positionClosingOpen}
          onOpenChange={setPositionClosingOpen}
          position={selectedPosition}
          applications={applications}
        />
      )}

      {/* Candidate Comparison Modal */}
      <CandidateComparisonModal
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        candidates={filteredApplications.filter((app: any) => selectedCandidates.includes(app.id))}
        positions={positions}
        interviews={filteredInterviews}
        onClearSelection={() => setSelectedCandidates([])}
      />
    </div>
  );
}

// Candidate Comparison Modal
function CandidateComparisonModal({
  open,
  onOpenChange,
  candidates,
  positions,
  interviews,
  onClearSelection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: any[];
  positions: any[];
  interviews: any[];
  onClearSelection: () => void;
}) {
  const getPosition = (positionId: number) => positions.find((p: any) => p.id === positionId);
  const getInterview = (applicationId: number) => interviews.find((i: any) => i.applicationId === applicationId);
  
  const statusLabels: Record<string, string> = {
    new: "Yeni",
    screening: "Ön Değerlendirme",
    interview_scheduled: "Mülakat Planlandı",
    interview_completed: "Mülakat Tamamlandı",
    offered: "Teklif Yapıldı",
    hired: "İşe Alındı",
    rejected: "Reddedildi",
    withdrawn: "Çekildi",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Aday Karşılaştırma ({candidates.length} aday)
          </DialogTitle>
          <DialogDescription>
            Seçilen adayları yan yana karşılaştırın
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Karşılaştırılacak aday seçilmedi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px] bg-muted/50">Özellik</TableHead>
                  {candidates.map((candidate: any) => (
                    <TableHead key={candidate.id} className="min-w-[160px] text-center">
                      {candidate.firstName} {candidate.lastName}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Pozisyon</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center">
                      {getPosition(c.positionId)?.title || '-'}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Durum</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center">
                      <Badge 
                        variant={c.status === 'hired' ? 'default' : c.status === 'rejected' ? 'destructive' : 'secondary'}
                        className={c.status === 'hired' ? 'bg-green-600' : ''}
                      >
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Telefon</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center">{c.phone || '-'}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">E-posta</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center text-sm">{c.email || '-'}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Başvuru Tarihi</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center text-sm">
                      {c.createdAt ? format(new Date(c.createdAt), "dd.MM.yyyy") : '-'}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Mülakat Durumu</TableCell>
                  {candidates.map((c: any) => {
                    const interview = getInterview(c.id);
                    return (
                      <TableCell key={c.id} className="text-center">
                        {interview ? (
                          <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                            {interview.status === 'scheduled' ? 'Planlandı' :
                             interview.status === 'completed' ? 'Tamamlandı' :
                             interview.status === 'in_progress' ? 'Devam Ediyor' : '-'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Mülakat yok</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Mülakat Puanı</TableCell>
                  {candidates.map((c: any) => {
                    const interview = getInterview(c.id);
                    return (
                      <TableCell key={c.id} className="text-center">
                        {interview?.overallRating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold">{interview.overallRating}/5</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Güçlü Yönler</TableCell>
                  {candidates.map((c: any) => {
                    const interview = getInterview(c.id);
                    return (
                      <TableCell key={c.id} className="text-center text-sm">
                        {interview?.strengths || '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Zayıf Yönler</TableCell>
                  {candidates.map((c: any) => {
                    const interview = getInterview(c.id);
                    return (
                      <TableCell key={c.id} className="text-center text-sm">
                        {interview?.weaknesses || '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium bg-muted/30">Notlar</TableCell>
                  {candidates.map((c: any) => (
                    <TableCell key={c.id} className="text-center text-sm">
                      {c.notes || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => {
            onClearSelection();
            onOpenChange(false);
          }}>
            Seçimi Temizle
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Position Dialog
function AddPositionDialog({
  open,
  onOpenChange,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: number; name: string }[];
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("barista");
  const [branchId, setBranchId] = useState<string>("hq");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [headcount, setHeadcount] = useState(1);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/job-positions", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Pozisyon oluşturuldu" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
      setTitle("");
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Pozisyon oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Hata", description: "Pozisyon adı gerekli", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title,
      targetRole,
      branchId: branchId === "hq" || branchId === "" ? null : parseInt(branchId),
      description,
      priority,
      headcount,
      status: "open",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Pozisyon Ekle</DialogTitle>
          <DialogDescription>
            Açık pozisyon bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pozisyon Adı *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Barista"
              data-testid="input-position-title"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger data-testid="select-target-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barista">Barista</SelectItem>
                  <SelectItem value="bar_buddy">Bar Buddy</SelectItem>
                  <SelectItem value="stajyer">Stajyer</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="supervisor_buddy">Supervisor Buddy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Öncelik</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Düşük</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="urgent">Acil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Şube</label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger data-testid="select-branch">
                <SelectValue placeholder="HQ (Merkez)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hq">HQ (Merkez)</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Alınacak Kişi Sayısı</label>
            <Input
              type="number"
              min={1}
              value={headcount}
              onChange={(e) => setHeadcount(parseInt(e.target.value) || 1)}
              data-testid="input-headcount"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Açıklama</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pozisyon gereksinimleri..."
              rows={3}
              data-testid="input-description"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto" data-testid="button-submit-position">
              {createMutation.isPending ? "Kaydediliyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Application Dialog
function AddApplicationDialog({
  open,
  onOpenChange,
  positions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positions: any[];
}) {
  const { toast } = useToast();
  const [positionId, setPositionId] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/job-applications", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Başvuru eklendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Başvuru eklenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionId || !firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast({ title: "Hata", description: "Lütfen zorunlu alanları doldurun", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      positionId: parseInt(positionId),
      firstName,
      lastName,
      phone,
      email: email || undefined,
      source: source || undefined,
      status: "new",
    });
  };

  const openPositions = positions.filter(p => p.status === 'open');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Başvuru Ekle</DialogTitle>
          <DialogDescription>
            Aday bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pozisyon *</label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger data-testid="select-position">
                <SelectValue placeholder="Pozisyon seçin" />
              </SelectTrigger>
              <SelectContent>
                {openPositions.map((position: any) => (
                  <SelectItem key={position.id} value={position.id.toString()}>
                    {position.title} {position.branchName ? `(${position.branchName})` : '(HQ)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Ad *</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid="input-first-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Soyad *</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Telefon *</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
              data-testid="input-phone"
            />
          </div>

          <div>
            <label className="text-sm font-medium">E-posta</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-email"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Kaynak</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger data-testid="select-source">
                <SelectValue placeholder="Nereden geldi?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referans">Personel Referansı</SelectItem>
                <SelectItem value="kariyer_net">Kariyer.net</SelectItem>
                <SelectItem value="indeed">Indeed</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="yuruyen">Yürüyen (Direkt Başvuru)</SelectItem>
                <SelectItem value="diger">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto" data-testid="button-submit-application">
              {createMutation.isPending ? "Kaydediliyor..." : "Başvuru Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Schedule Interview Dialog
function ScheduleInterviewDialog({
  open,
  onOpenChange,
  application,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
}) {
  const { toast } = useToast();
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewType, setInterviewType] = useState("in_person");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/interviews", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Mülakat planlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
      setScheduledAt("");
      setInterviewerName("");
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mülakat oluşturulurken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt || !interviewerName.trim()) {
      toast({ title: "Hata", description: "Tarih ve görüşmeci adı gerekli", variant: "destructive" });
      return;
    }
    const dateTime = new Date(`${scheduledAt}T${scheduledTime}`);
    createMutation.mutate({
      applicationId: application.id,
      scheduledDate: dateTime.toISOString(),
      interviewerId: user?.id,
      interviewType,
      notes: interviewerName + (notes ? ` | ${notes}` : ''),
      status: "scheduled",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mülakat Planla</DialogTitle>
          <DialogDescription>
            {application.firstName} {application.lastName} için mülakat planla
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tarih *</label>
              <Input
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                data-testid="input-interview-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Saat *</label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                data-testid="input-interview-time"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Görüşmeci *</label>
            <Input
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="Görüşmeyi yapacak kişi"
              data-testid="input-interviewer"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mülakat Tipi</label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger data-testid="select-interview-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">Yüz Yüze</SelectItem>
                <SelectItem value="phone">Telefon</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Notlar</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mülakat hakkında notlar..."
              rows={2}
              data-testid="input-interview-notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto" data-testid="button-submit-interview">
              {createMutation.isPending ? "Kaydediliyor..." : "Planla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Position Closing Modal - Pozisyon kapatma ve ret maili gönderme
function PositionClosingModal({
  open,
  onOpenChange,
  position,
  applications,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: any;
  applications: any[];
}) {
  const { toast } = useToast();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [closedReason, setClosedReason] = useState<string>("hired");
  const [confirmRejectionEmails, setConfirmRejectionEmails] = useState(false);

  const closeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/job-positions/${position.id}/close`, data);
    },
    onSuccess: (response: any) => {
      toast({ 
        title: "Başarılı", 
        description: response.message || "Pozisyon kapatıldı ve ret mailleri gönderildi"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Pozisyon kapatılırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmRejectionEmails) {
      toast({ 
        title: "Uyarı", 
        description: "Ret mailleri gönderileceğini onaylamalısınız",
        variant: "destructive"
      });
      return;
    }
    closeMutation.mutate({
      selectedApplicationId: selectedApplicationId ? parseInt(selectedApplicationId) : undefined,
      closedReason,
    });
  };

  const positionApplications = applications.filter((app: any) => app.positionId === position.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pozisyonu Kapat</DialogTitle>
          <DialogDescription>
            {position.title} pozisyonunu kapatın ve başvurucuları bilgilendirin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Kapatma Sebebi *</label>
            <Select value={closedReason} onValueChange={setClosedReason}>
              <SelectTrigger data-testid="select-closed-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hired">İşe Alındı</SelectItem>
                <SelectItem value="no_candidates">Uygun Aday Yok</SelectItem>
                <SelectItem value="cancelled">İptal Edildi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {closedReason === "hired" && (
            <div>
              <label className="text-sm font-medium">İşe Alınan Aday</label>
              <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                <SelectTrigger data-testid="select-hired-candidate">
                  <SelectValue placeholder="Aday seçin" />
                </SelectTrigger>
                <SelectContent>
                  {positionApplications.map((app: any) => (
                    <SelectItem key={app.id} value={app.id.toString()}>
                      {app.firstName} {app.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="confirm-emails"
              checked={confirmRejectionEmails}
              onCheckedChange={(checked) => setConfirmRejectionEmails(!!checked)}
              data-testid="checkbox-confirm-rejection-emails"
            />
            <label htmlFor="confirm-emails" className="text-sm cursor-pointer">
              Ret mailleri gönderileceğini onaylıyorum
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={closeMutation.isPending || !confirmRejectionEmails}
              data-testid="button-submit-close-position"
            >
              {closeMutation.isPending ? "Kapatılıyor..." : "Pozisyonu Kapat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Interview Detail Modal - Mülakat detay görüntüleme ve değerlendirme
function InterviewDetailModal({
  open,
  onOpenChange,
  interview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: any;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rating, setRating] = useState(interview.rating || 0);
  const [strengths, setStrengths] = useState(interview.strengths || "");
  const [weaknesses, setWeaknesses] = useState(interview.weaknesses || "");
  const [feedback, setFeedback] = useState(interview.feedback || "");
  const [interviewResult, setInterviewResult] = useState(interview.result || "pending");
  const [questionRatings, setQuestionRatings] = useState<Record<number, { rating: number; notes: string }>>({});
  const [savingResponse, setSavingResponse] = useState<number | null>(null);

  // Fetch interview questions
  const { data: interviewQuestions = [] } = useQuery<any[]>({
    queryKey: ["/api/interview-questions"],
    enabled: open,
  });

  // Fetch existing responses for this interview
  const { data: existingResponses = [] } = useQuery<any[]>({
    queryKey: ["/api/interviews", interview.id, "responses"],
    enabled: open && !!interview.id,
  });

  // Load existing responses into questionRatings state
  useEffect(() => {
    if (existingResponses.length > 0) {
      const loaded: Record<number, { rating: number; notes: string }> = {};
      existingResponses.forEach((resp: any) => {
        loaded[resp.questionId] = {
          rating: resp.score || 0,
          notes: resp.answer || '',
        };
      });
      setQuestionRatings(loaded);
    }
  }, [existingResponses]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/interviews/${interview.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Mülakat güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Mülakat güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const resultMutation = useMutation({
    mutationFn: async (result: string) => {
      return apiRequest("PATCH", `/api/interviews/${interview.id}/result`, { result });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Mülakat sonucu güncellendi" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Sonuç güncellenirken hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleStartInterview = async () => {
    try {
      await apiRequest("POST", `/api/interviews/${interview.id}/start`, {});
      toast({ title: "Başarılı", description: "Mülakat başlatıldı" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleCompleteInterview = async () => {
    try {
      // Save all question responses first
      await saveAllResponses();
      // Then complete the interview
      await apiRequest("POST", `/api/interviews/${interview.id}/complete`, {
        result: interviewResult,
        overallNotes: feedback,
        overallScore: rating,
      });
      toast({ title: "Başarılı", description: "Mülakat tamamlandı" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleHire = async () => {
    try {
      // Save all responses before hiring
      await saveAllResponses();
      // Call the hire endpoint - handles rejection emails for other candidates automatically
      const response = await apiRequest("POST", `/api/interviews/${interview.id}/hire`, {});
      const data = await response.json();
      toast({ title: "Başarılı", description: data?.message || "Aday işe alındı" });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    try {
      await saveAllResponses();
      // First update interview with negative result
      const rejectMutation = await apiRequest("PATCH", `/api/interviews/${interview.id}/result`, { result: 'negative' });
      // Update interview details
      updateMutation.mutate({
        status: 'completed',
        rating,
        strengths,
        weaknesses,
        feedback,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/recruitment-stats"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  // Save a single question response to backend
  const saveQuestionResponse = async (questionId: number, answer: string, score: number) => {
    setSavingResponse(questionId);
    try {
      await apiRequest("POST", `/api/interviews/${interview.id}/respond`, {
        questionId,
        answer,
        score,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", interview.id, "responses"] });
    } catch (error: any) {
      toast({ title: "Hata", description: "Cevap kaydedilemedi", variant: "destructive" });
    } finally {
      setSavingResponse(null);
    }
  };

  // Save all question responses
  const saveAllResponses = async () => {
    const promises = Object.entries(questionRatings).map(([qId, data]) =>
      apiRequest("POST", `/api/interviews/${interview.id}/respond`, {
        questionId: parseInt(qId),
        answer: data.notes,
        score: data.rating,
      })
    );
    await Promise.all(promises);
  };

  const handleSave = async () => {
    try {
      await saveAllResponses();
      updateMutation.mutate({
        rating,
        strengths,
        weaknesses,
        feedback,
      });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const renderStars = (currentRating: number, onChange: (value: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
            data-testid={`star-${star}`}
          >
            <Star
              className={`h-5 w-5 ${star <= currentRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  const interviewStatusLabels: Record<string, string> = {
    scheduled: "Planlandı",
    in_progress: "Devam Ediyor",
    completed: "Tamamlandı",
    cancelled: "İptal Edildi",
  };

  const resultLabels: Record<string, string> = {
    pending: "Beklemede",
    hired: "İşe Alındı",
    rejected: "Reddedildi",
    on_hold: "Bekletiliyor",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mülakat Detayı
          </DialogTitle>
          <DialogDescription>
            {interview.application?.firstName} {interview.application?.lastName} - {interview.position?.title || 'Pozisyon'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interview Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Tarih/Saat</p>
              <p className="font-medium">
                {interview.scheduledDate ? format(new Date(interview.scheduledDate), "dd.MM.yyyy HH:mm") : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Durum</p>
              <Badge 
                variant={interview.status === 'completed' ? 'default' : interview.status === 'in_progress' ? 'default' : 'secondary'}
                className={interview.status === 'in_progress' ? 'bg-blue-600' : ''}
              >
                {interviewStatusLabels[interview.status] || interview.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tip</p>
              <p className="font-medium">
                {interview.interviewType === 'in_person' ? 'Yüz Yüze' : 
                 interview.interviewType === 'phone' ? 'Telefon' : 
                 interview.interviewType === 'video' ? 'Video' : interview.interviewType}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sonuç</p>
              <Select value={interviewResult} onValueChange={(value) => {
                setInterviewResult(value);
                resultMutation.mutate(value);
              }}>
                <SelectTrigger data-testid="select-interview-result">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="positive">Pozitif</SelectItem>
                  <SelectItem value="finalist">Finalist</SelectItem>
                  <SelectItem value="negative">Negatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interview Questions */}
          {interviewQuestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Mülakat Soruları
              </h3>
              <div className="space-y-3">
                {interviewQuestions.map((question: any, index: number) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            {question.category}
                          </Badge>
                          <p className="font-medium">{index + 1}. {question.question}</p>
                        </div>
                        {renderStars(
                          questionRatings[question.id]?.rating || 0,
                          (value) => setQuestionRatings(prev => ({
                            ...prev,
                            [question.id]: { ...prev[question.id], rating: value }
                          }))
                        )}
                      </div>
                      <Textarea
                        placeholder="Aday cevabı ve notlar..."
                        value={questionRatings[question.id]?.notes || ''}
                        onChange={(e) => setQuestionRatings(prev => ({
                          ...prev,
                          [question.id]: { ...prev[question.id], notes: e.target.value }
                        }))}
                        rows={2}
                        className="text-sm"
                        data-testid={`textarea-question-${question.id}`}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Overall Rating */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Genel Değerlendirme</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Genel Puan:</span>
              {renderStars(rating, setRating)}
              <span className="text-sm text-muted-foreground">({rating}/5)</span>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-green-600">Güçlü Yönler</label>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Adayın güçlü yönleri..."
                rows={3}
                data-testid="textarea-strengths"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-orange-600">Gelişim Alanları</label>
              <Textarea
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                placeholder="Geliştirilmesi gereken alanlar..."
                rows={3}
                data-testid="textarea-weaknesses"
              />
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="text-sm font-medium">Genel Değerlendirme Notları</label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Mülakat hakkında genel geri bildirim..."
              rows={3}
              data-testid="textarea-feedback"
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:gap-0">
          {interview.status === 'scheduled' && (
            <Button 
              onClick={handleStartInterview} 
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-start-interview"
            >
              Mülakatı Başlat
            </Button>
          )}
          
          {(interview.status === 'in_progress' || interview.status === 'scheduled') && (
            <>
              <Button 
                variant="outline" 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save-interview"
              >
                Kaydet
              </Button>
              <Button 
                onClick={handleCompleteInterview}
                disabled={updateMutation.isPending}
                data-testid="button-complete-interview"
              >
                Tamamla
              </Button>
            </>
          )}

          {interview.status === 'completed' && !interview.result && (
            <>
              <Button 
                variant="destructive"
                onClick={handleReject}
                disabled={updateMutation.isPending}
                data-testid="button-reject"
              >
                Reddet
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleHire}
                disabled={updateMutation.isPending}
                data-testid="button-hire"
              >
                İşe Al
              </Button>
            </>
          )}

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

