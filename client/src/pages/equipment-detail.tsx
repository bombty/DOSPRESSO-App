import { useParams, Link, useLocation } from "wouter";
import { useBreadcrumb } from "@/components/breadcrumb-navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { EQUIPMENT_METADATA, insertEquipmentCommentSchema, insertEquipmentServiceRequestSchema, insertEquipmentFaultSchema, insertEquipmentSchema, type InsertEquipment, type EquipmentMaintenanceLog, type EquipmentFault, type EquipmentComment, type EquipmentServiceRequest, type Branch, EQUIPMENT_TYPES, FAULT_STAGES, type FaultStageType, SERVICE_REQUEST_STATUS, SERVICE_DECISION, type EquipmentTroubleshootingStep, isHQRole, isBranchRole } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/list-skeleton";
import { EmptyState } from "@/components/empty-state";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Settings, Calendar, Wrench, AlertTriangle, MessageSquare, DollarSign, User, QrCode, ClipboardList, Edit, FileText, Sparkles, Send, ChevronDown, Clock, Shield, ExternalLink } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface EquipmentDetailResponse {
  id: number;
  branchId: number;
  equipmentType: string;
  serialNumber: string | null;
  purchaseDate: string | null;
  warrantyEndDate: string | null;
  maintenanceResponsible: string;
  faultProtocol: string;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  maintenanceIntervalDays: number | null;
  qrCodeUrl: string | null;
  notes: string | null;
  brand?: string | null;
  model?: string | null;
  modelNo?: string | null;
  imageUrl?: string | null;
  catalogId?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  maintenanceLogs: EquipmentMaintenanceLog[];
  faults: EquipmentFault[];
  comments: EquipmentComment[];
  serviceRequests?: EquipmentServiceRequest[];
}

interface MaintenanceSchedule {
  id: number;
  equipmentId: number;
  maintenanceType: string;
  intervalDays: number;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProactiveMaintenanceLog {
  id: number;
  equipmentId: number;
  scheduleId: number | null;
  maintenanceType: string;
  performedDate: string;
  performedById: string;
  notes: string | null;
  createdAt: string;
}

interface TimelineEvent {
  type: string;
  id: number;
  date: string;
  title: string;
  description?: string;
  status?: string;
  data: any;
}

const TIMELINE_TYPE_LABELS: Record<string, string> = {
  fault: "Arıza",
  maintenance: "Bakım",
  service_request: "Servis Talebi",
  calibration: "Kalibrasyon",
  service_tracking: "Servis Takip",
};

const TIMELINE_TYPE_COLORS: Record<string, string> = {
  fault: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  maintenance: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  service_request: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  calibration: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  service_tracking: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

function EquipmentTimeline({ equipmentId }: { equipmentId: number }) {
  const [, navigate] = useLocation();
  const { data: timeline, isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ['/api/equipment', equipmentId, 'timeline'],
    queryFn: async () => {
      const res = await fetch(`/api/equipment/${equipmentId}/timeline`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!equipmentId && equipmentId > 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground" data-testid="text-timeline-empty">
            Bu cihaz için henüz bir geçmiş kaydı bulunmuyor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Cihaz Zaman Çizelgesi ({timeline.length} kayıt)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
          {timeline.map((event, idx) => {
            const getEventLink = () => {
              if (event.type === 'fault') return `/ariza-detay/${event.id}`;
              return null;
            };
            const link = getEventLink();
            return (
              <div
                key={`${event.type}-${event.id}`}
                className={`relative pl-8 pb-4 ${link ? 'cursor-pointer hover-elevate rounded-md' : ''}`}
                data-testid={`timeline-event-${idx}`}
                onClick={() => {
                  if (link) navigate(link);
                }}
              >
                <div className={`absolute left-1 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  idx === 0 ? "bg-primary border-primary" : "bg-background border-border"
                }`}>
                  <div className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-primary-foreground" : "bg-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={TIMELINE_TYPE_COLORS[event.type] || "bg-secondary"}>
                      {TIMELINE_TYPE_LABELS[event.type] || event.type}
                    </Badge>
                    {event.status && (
                      <span className="text-xs text-muted-foreground">{event.status}</span>
                    )}
                  </div>
                  <p className={`text-sm font-medium mt-1 ${link ? 'text-primary hover:underline' : ''}`} data-testid={`timeline-title-${idx}`}>{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.date ? format(new Date(event.date), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const commentFormSchema = insertEquipmentCommentSchema.pick({ comment: true });
type CommentFormData = z.infer<typeof commentFormSchema>;

const serviceRequestFormSchema = insertEquipmentServiceRequestSchema
  .pick({
    serviceProvider: true,
    contactInfo: true,
    serviceDecision: true,
    estimatedCost: true,
    notes: true,
  })
  .extend({
    estimatedCost: z.string().optional().refine(
      (val) => !val || !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      { message: "Tahmini maliyet 0 veya daha büyük olmalıdır" }
    ),
  });
type ServiceRequestFormData = z.infer<typeof serviceRequestFormSchema>;

const statusUpdateFormSchema = z.object({
  status: z.string(),
  actualCost: z.string().optional().refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: "Gerçek maliyet 0 veya daha büyük olmalıdır" }
  ),
  notes: z.string().optional(),
});
type StatusUpdateFormData = z.infer<typeof statusUpdateFormSchema>;

// State machine for allowed status transitions
const getAllowedTransitions = (currentStatus: string): string[] => {
  switch (currentStatus) {
    case SERVICE_REQUEST_STATUS.CREATED:
      return [SERVICE_REQUEST_STATUS.SERVICE_CALLED, SERVICE_REQUEST_STATUS.IN_PROGRESS];
    case SERVICE_REQUEST_STATUS.SERVICE_CALLED:
      return [SERVICE_REQUEST_STATUS.IN_PROGRESS, SERVICE_REQUEST_STATUS.CREATED];
    case SERVICE_REQUEST_STATUS.IN_PROGRESS:
      return [
        SERVICE_REQUEST_STATUS.FIXED,
        SERVICE_REQUEST_STATUS.NOT_FIXED,
        SERVICE_REQUEST_STATUS.WARRANTY_CLAIMED,
        SERVICE_REQUEST_STATUS.DEVICE_SHIPPED,
      ];
    case SERVICE_REQUEST_STATUS.FIXED:
    case SERVICE_REQUEST_STATUS.NOT_FIXED:
    case SERVICE_REQUEST_STATUS.WARRANTY_CLAIMED:
    case SERVICE_REQUEST_STATUS.DEVICE_SHIPPED:
      return [SERVICE_REQUEST_STATUS.CLOSED, SERVICE_REQUEST_STATUS.IN_PROGRESS]; // Rollback for rework
    case SERVICE_REQUEST_STATUS.CLOSED:
      return [SERVICE_REQUEST_STATUS.IN_PROGRESS]; // Reopen if needed
    default:
      return [];
  }
};

const statusLabels: Record<string, string> = {
  [SERVICE_REQUEST_STATUS.CREATED]: "Oluşturuldu",
  [SERVICE_REQUEST_STATUS.SERVICE_CALLED]: "Servis Çağrıldı",
  [SERVICE_REQUEST_STATUS.IN_PROGRESS]: "İşlemde",
  [SERVICE_REQUEST_STATUS.FIXED]: "Tamir Edildi",
  [SERVICE_REQUEST_STATUS.NOT_FIXED]: "Tamir Edilemedi",
  [SERVICE_REQUEST_STATUS.WARRANTY_CLAIMED]: "Garanti Kullanıldı",
  [SERVICE_REQUEST_STATUS.DEVICE_SHIPPED]: "Cihaz Kargoya Verildi",
  [SERVICE_REQUEST_STATUS.CLOSED]: "Kapatıldı",
};

export default function EquipmentDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const equipmentId = parseInt(id!);

  const { data: equipment, isLoading } = useQuery<EquipmentDetailResponse>({
    queryKey: ['/api/equipment', equipmentId],
    enabled: !!equipmentId,
  });

  const { data: serviceRequests = [] } = useQuery<EquipmentServiceRequest[]>({
    queryKey: ['/api/equipment', equipmentId, 'service-requests'],
    enabled: !!equipmentId,
  });

  useBreadcrumb(equipment ? `${equipment.brand || ''} ${equipment.model || equipment.equipmentType}`.trim() : '');

  const { data: maintenanceSchedules = [] } = useQuery<MaintenanceSchedule[]>({
    queryKey: ['/api/maintenance-schedules'],
    enabled: !!equipmentId,
  });

  const { data: proactiveMaintenanceLogs = [] } = useQuery<ProactiveMaintenanceLog[]>({
    queryKey: ['/api/maintenance-logs'],
    enabled: !!equipmentId,
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  // Dialog state
  const [serviceRequestDialogOpen, setServiceRequestDialogOpen] = useState(false);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<EquipmentServiceRequest | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<EquipmentServiceRequest | null>(null);
  const [isFaultDialogOpen, setIsFaultDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTroubleshootingEditOpen, setIsTroubleshootingEditOpen] = useState(false);
  const [selectedTroubleshootingStep, setSelectedTroubleshootingStep] = useState<EquipmentTroubleshootingStep | null>(null);
  
  // Troubleshooting state
  const [completedStepIds, setCompletedStepIds] = useState<Set<number>>(new Set());
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({});
  
  // AI Technical Assistant state
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<{ answer: string; sources: any[] } | null>(null);

  // Troubleshooting steps query
  const { data: troubleshootingSteps, isLoading: isLoadingSteps } = useQuery<EquipmentTroubleshootingStep[]>({
    queryKey: ["/api/equipment-troubleshooting-steps", equipment?.equipmentType],
    queryFn: async () => {
      if (!equipment?.equipmentType) return [];
      const response = await fetch(`/api/equipment-troubleshooting-steps?equipmentType=${equipment.equipmentType}`);
      if (!response.ok) throw new Error('Failed to fetch troubleshooting steps');
      return response.json();
    },
    enabled: !!equipment?.equipmentType,
  });

  // Knowledge base articles for this equipment type
  // AI Equipment Knowledge query
  const { data: equipmentKnowledge = [], isLoading: isLoadingKnowledge } = useQuery<any[]>({
    queryKey: ["/api/equipment-knowledge/by-equipment", equipment?.equipmentType, equipment?.brand, equipment?.model],
    queryFn: async () => {
      if (!equipment?.equipmentType) return [];
      const params = new URLSearchParams();
      params.append("type", equipment.equipmentType);
      if (equipment.brand) params.append("brand", equipment.brand);
      if (equipment.model) params.append("model", equipment.model);
      const response = await fetch(`/api/equipment-knowledge/by-equipment?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!equipment?.equipmentType,
  });

  const { data: relatedArticles = [], isLoading: isLoadingArticles } = useQuery<any[]>({
    queryKey: ["/api/knowledge-base", "equipment", equipment?.equipmentType],
    queryFn: async () => {
      if (!equipment?.equipmentType) return [];
      const response = await fetch(`/api/knowledge-base?equipmentTypeId=${equipment.equipmentType}&isPublished=true`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!equipment?.equipmentType,
  });

  // Calculate if troubleshooting is complete
  const requiredSteps = troubleshootingSteps?.filter(step => step.isRequired) || [];
  const missingRequiredSteps = requiredSteps.filter(step => !completedStepIds.has(step.id));
  const isTroubleshootingComplete = requiredSteps.length === 0 || missingRequiredSteps.length === 0;
  const hasSteps = troubleshootingSteps && troubleshootingSteps.length > 0;

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      comment: "",
    },
  });

  const serviceRequestForm = useForm<ServiceRequestFormData>({
    resolver: zodResolver(serviceRequestFormSchema),
    defaultValues: {
      serviceProvider: "",
      contactInfo: "",
      serviceDecision: equipment?.maintenanceResponsible || SERVICE_DECISION.BRANCH,
      estimatedCost: "",
      notes: "",
    },
  });

  const statusUpdateForm = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateFormSchema),
    defaultValues: {
      status: "",
      actualCost: "",
      notes: "",
    },
  });

  const faultFormSchema = insertEquipmentFaultSchema.extend({
    equipmentId: z.number(),
  });
  type FaultFormData = z.infer<typeof faultFormSchema>;

  const faultForm = useForm<FaultFormData>({
    resolver: zodResolver(faultFormSchema),
    defaultValues: {
      equipmentId: equipmentId,
      equipmentName: equipment?.equipmentType || "",
      description: "",
      status: "acik",
      priority: "orta",
      branchId: equipment?.branchId || 0,
      reportedById: user?.id || "",
    },
  });

  useEffect(() => {
    if (equipment && user) {
      faultForm.reset({
        equipmentId: parseInt(id!),
        equipmentName: equipment.equipmentType || "",
        description: "",
        status: "acik",
        priority: "orta",
        branchId: equipment.branchId || 0,
        reportedById: user.id || "",
      });
    }
  }, [equipment, user, id, faultForm]);

  const editForm = useForm<InsertEquipment>({
    resolver: zodResolver(insertEquipmentSchema),
    defaultValues: {
      equipmentType: equipment?.equipmentType || "espresso",
      serialNumber: equipment?.serialNumber || "",
      purchaseDate: equipment?.purchaseDate || undefined,
      warrantyEndDate: equipment?.warrantyEndDate || undefined,
      lastMaintenanceDate: equipment?.lastMaintenanceDate || undefined,
      branchId: equipment?.branchId || undefined,
      notes: equipment?.notes || "",
      isActive: equipment?.isActive ?? true,
    },
  });

  const createServiceRequestMutation = useMutation({
    mutationFn: async (data: ServiceRequestFormData) => {
      const payload = {
        ...data,
        equipmentId,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
      };
      await apiRequest("POST", `/api/equipment/${equipmentId}/service-requests`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment', equipmentId, 'service-requests'] });
      toast({ title: "Başarılı", description: "Servis talebi oluşturuldu" });
      serviceRequestForm.reset();
      setServiceRequestDialogOpen(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Servis talebi oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: StatusUpdateFormData & { requestId: number }) => {
      const payload = {
        status: data.status,
        actualCost: data.actualCost ? parseFloat(data.actualCost) : undefined,
        notes: data.notes,
      };
      await apiRequest("PATCH", `/api/equipment/service-requests/${data.requestId}/status`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment', equipmentId, 'service-requests'] });
      toast({ title: "Başarılı", description: "Durum güncellendi" });
      statusUpdateForm.reset();
      setStatusUpdateDialogOpen(false);
      setSelectedServiceRequest(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Durum güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: CommentFormData) => {
      await apiRequest("POST", `/api/equipment/${equipmentId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment', equipmentId] });
      toast({ title: "Başarılı", description: "Yorum eklendi" });
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Yorum eklenemedi",
        variant: "destructive",
      });
    },
  });

  const createFaultMutation = useMutation({
    mutationFn: async (data: FaultFormData) => {
      // Defensive guard: Re-check troubleshooting completion before submission
      if (hasSteps && !isTroubleshootingComplete) {
        throw new Error("Lütfen tüm zorunlu sorun giderme adımlarını tamamlayın");
      }
      
      // Build completed troubleshooting steps array
      const completedTroubleshootingSteps = Array.from(completedStepIds).map(stepId => ({
        stepId,
        notes: stepNotes[stepId] || null,
      }));
      
      const payload = {
        ...data,
        completedTroubleshootingSteps: completedTroubleshootingSteps.length > 0 ? completedTroubleshootingSteps : undefined,
      };
      
      await apiRequest("POST", "/api/faults", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faults"] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment", equipmentId] });
      toast({ title: "Başarılı", description: "Arıza raporu oluşturuldu" });
      setIsFaultDialogOpen(false);
      faultForm.reset();
      // Reset troubleshooting state
      setCompletedStepIds(new Set());
      setStepNotes({});
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Arıza raporu oluşturulamadı",
        variant: "destructive",
      });
    },
  });
  
  const updateTroubleshootingMutation = useMutation({
    mutationFn: async (data: { id: number; description: string; isRequired: boolean; requiresPhoto: boolean }) => {
      await apiRequest("PATCH", `/api/equipment-troubleshooting-steps/${data.id}`, {
        description: data.description,
        isRequired: data.isRequired,
        requiresPhoto: data.requiresPhoto,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment-troubleshooting-steps"] });
      toast({ title: "Başarılı", description: "Adım güncellendi" });
      setIsTroubleshootingEditOpen(false);
      setSelectedTroubleshootingStep(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Adım güncellenemedi",
        variant: "destructive",
      });
    },
  });
  
  // AI Technical Assistant mutation (Enhanced with fallback LLM)
  const askAiMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest(
        "POST",
        "/api/knowledge-base/ask",
        { 
          question,
          equipmentId: equipment?.id 
        }
      );
      return await response.json() as { 
        answer: string; 
        sources: any[]; 
        usedKnowledgeBase: boolean;
        systemMessage?: string;
      };
    },
    onSuccess: (data) => {
      setAiAnswer(data);
      setAiQuestion("");
      
      // Show system message if available
      if (data.systemMessage) {
        toast({
          title: data.usedKnowledgeBase ? "Bilgi Bankası" : "AI Asistan",
          description: data.systemMessage,
        });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: error.message || "AI asistan yanıt veremedi",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertEquipment) => {
      await apiRequest("PUT", `/api/equipment/${equipmentId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment", equipmentId] });
      toast({ title: "Başarılı", description: "Ekipman güncellendi" });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Yetkisiz",
          description: "Oturumunuz sonlandı. Tekrar giriş yapılıyor...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hata",
        description: "Ekipman güncellenemedi",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = () => {
    if (!equipment) return;
    editForm.reset({
      equipmentType: equipment.equipmentType,
      serialNumber: equipment.serialNumber || "",
      modelNo: (equipment as any).modelNo || "",
      purchaseDate: equipment.purchaseDate || undefined,
      warrantyEndDate: equipment.warrantyEndDate || undefined,
      lastMaintenanceDate: equipment.lastMaintenanceDate || undefined,
      branchId: equipment.branchId,
      notes: equipment.notes || "",
      isActive: equipment.isActive,
      maintenanceResponsible: equipment.maintenanceResponsible || SERVICE_DECISION.BRANCH,
      faultProtocol: equipment.faultProtocol || "branch",
      serviceContactName: (equipment as any).serviceContactName || "",
      serviceContactPhone: (equipment as any).serviceContactPhone || "",
      serviceContactEmail: (equipment as any).serviceContactEmail || "",
      serviceContactAddress: (equipment as any).serviceContactAddress || "",
      serviceHandledBy: (equipment as any).serviceHandledBy || "hq",
    });
    setIsEditDialogOpen(true);
  };

  const stageLabels: Record<FaultStageType, string> = {
    [FAULT_STAGES.BEKLIYOR]: "Bekliyor",
    [FAULT_STAGES.ISLEME_ALINDI]: "İşleme Alındı",
    [FAULT_STAGES.SERVIS_CAGRILDI]: "Servis Çağrıldı",
    [FAULT_STAGES.KARGOYA_VERILDI]: "Kargoya Verildi",
    [FAULT_STAGES.TESLIM_ALINDI]: "Teslim Alındı",
    [FAULT_STAGES.TAKIP_EDILIYOR]: "Takip Ediliyor",
    [FAULT_STAGES.KAPATILDI]: "Kapatıldı",
  };

  const maintenanceTypeLabels: Record<string, string> = {
    routine: "Rutin Bakım",
    repair: "Onarım",
    calibration: "Kalibrasyon",
    cleaning: "Temizlik",
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
        <ListSkeleton count={4} variant="card" showHeader />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
        <Link href="/ekipman" asChild>
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <EmptyState
          icon={Settings}
          title="Ekipman bulunamadı"
          description="İstediğiniz ekipman bilgisi bulunamadı."
          data-testid="empty-state-equipment"
        />
      </div>
    );
  }

  // Authorization: Branch users can only access their own branch equipment
  if (user?.role && isBranchRole(user.role as any) && user.branchId && equipment.branchId !== user.branchId) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
        <Link href="/ekipman" asChild>
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">Bu ekipmana erişim izniniz yok</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metadata = EQUIPMENT_METADATA[equipment.equipmentType as keyof typeof EQUIPMENT_METADATA];
  const canEdit = user?.role && (isHQRole(user.role as any) || user.role === 'supervisor');

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-4">
      {/* Header with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/ekipman" asChild>
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {metadata?.nameTr || equipment.equipmentType}
            </h1>
            <p className="text-xs text-muted-foreground">
              Seri No: {equipment.serialNumber || "Belirtilmemiş"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button
              onClick={() => openEditDialog()}
              variant="outline"
              data-testid={`button-edit-equipment-${equipment.id}`}
              size="sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
          )}
          <Button
            onClick={() => {
              setCompletedStepIds(new Set());
              setStepNotes({});
              setAiQuestion("");
              setAiAnswer(null);
              setIsFaultDialogOpen(true);
            }}
            variant="destructive"
            data-testid="button-fault-create"
            size="sm"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Arıza Kaydı
          </Button>
          <Button
            onClick={() => {
              serviceRequestForm.reset({
                serviceProvider: "",
                contactInfo: "",
                serviceDecision: equipment.maintenanceResponsible,
                estimatedCost: "",
                notes: "",
              });
              setServiceRequestDialogOpen(true);
            }}
            data-testid="button-start-maintenance"
            size="sm"
          >
            <Wrench className="mr-2 h-4 w-4" />
            Bakım
          </Button>
          <Badge variant="outline" data-testid="badge-equipment-type">
            {equipment.equipmentType}
          </Badge>
        </div>
      </div>

      {equipment.faults && equipment.faults.filter(f => f.currentStage !== 'kapatildi' && f.currentStage !== 'cozuldu').length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5" data-testid="alert-open-faults">
          <CardContent className="flex items-start gap-3 pt-4 pb-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">
                {equipment.faults.filter(f => f.currentStage !== 'kapatildi' && f.currentStage !== 'cozuldu').length} adet açık arıza kaydı var
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Bu cihaz için çözülmemiş arıza kayıtları bulunmaktadır.
              </p>
              <div className="flex gap-2 flex-wrap mt-2">
                {equipment.faults.filter(f => f.currentStage !== 'kapatildi' && f.currentStage !== 'cozuldu').slice(0, 3).map(f => (
                  <Link key={f.id} href={`/ariza-detay/${f.id}`} asChild>
                    <Button size="sm" variant="outline" data-testid={`button-alert-fault-${f.id}`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Arıza #{f.id} - {f.priority === 'yuksek' ? 'Yüksek' : f.priority === 'dusuk' ? 'Düşük' : 'Orta'}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {serviceRequests.filter(sr => sr.status !== SERVICE_REQUEST_STATUS.CLOSED && sr.status !== SERVICE_REQUEST_STATUS.FIXED && sr.status !== SERVICE_REQUEST_STATUS.NOT_FIXED).length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20" data-testid="alert-open-service-requests">
          <CardContent className="flex items-start gap-3 pt-4 pb-3">
            <Wrench className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {serviceRequests.filter(sr => sr.status !== SERVICE_REQUEST_STATUS.CLOSED && sr.status !== SERVICE_REQUEST_STATUS.FIXED && sr.status !== SERVICE_REQUEST_STATUS.NOT_FIXED).length} adet açık servis talebi
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Bu cihaz için devam eden servis talepleri bulunmaktadır.
              </p>
              <div className="flex gap-2 flex-wrap mt-2">
                {serviceRequests.filter(sr => sr.status !== SERVICE_REQUEST_STATUS.CLOSED && sr.status !== SERVICE_REQUEST_STATUS.FIXED && sr.status !== SERVICE_REQUEST_STATUS.NOT_FIXED).slice(0, 3).map(sr => (
                  <Badge key={sr.id} variant="secondary" data-testid={`badge-service-request-${sr.id}`}>
                    #{sr.id} - {sr.serviceProvider || 'Servis'} ({statusLabels[sr.status] || sr.status})
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Info Summary - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-lg border bg-card">
          <span className="text-muted-foreground">Durum</span>
          <div className="mt-1">
            <Badge variant={equipment.isActive ? "default" : "secondary"} className="text-xs" data-testid="badge-status">
              {equipment.isActive ? "Aktif" : "Pasif"}
            </Badge>
          </div>
        </div>
        <div className="p-2 rounded-lg border bg-card">
          <span className="text-muted-foreground">Bakım Sorumlusu</span>
          <p className="font-medium mt-1" data-testid="text-responsible">{equipment.maintenanceResponsible === 'branch' ? 'Şube' : 'Merkez'}</p>
        </div>
        <div className="p-2 rounded-lg border bg-card">
          <span className="text-muted-foreground">Sonraki Bakım</span>
          <p className="font-medium mt-1" data-testid="text-next-maint">{equipment.nextMaintenanceDate ? new Date(equipment.nextMaintenanceDate).toLocaleDateString('tr-TR') : '-'}</p>
        </div>
        <div className="p-2 rounded-lg border bg-card">
          <span className="text-muted-foreground">Garanti</span>
          <p className="font-medium mt-1" data-testid="text-warranty">{equipment.warrantyEndDate ? new Date(equipment.warrantyEndDate).toLocaleDateString('tr-TR') : '-'}</p>
        </div>
        {equipment.purchaseDate && (
          <div className="p-2 rounded-lg border bg-card">
            <span className="text-muted-foreground">Satın Alma</span>
            <p className="font-medium mt-1" data-testid="text-purchase">{new Date(equipment.purchaseDate).toLocaleDateString('tr-TR')}</p>
          </div>
        )}
        {equipment.notes && (
          <div className="p-2 rounded-lg border bg-card col-span-2 sm:col-span-1">
            <span className="text-muted-foreground">Notlar</span>
            <p className="font-medium mt-1 truncate" title={equipment.notes} data-testid="text-notes">{equipment.notes}</p>
          </div>
        )}
      </div>

      {/* Tabs - directly under compact info */}
      <Tabs className="w-full" defaultValue="maintenance">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1" data-testid="tabs-equipment-detail">
          <TabsTrigger value="maintenance" data-testid="tab-maintenance" className="text-xs px-2 py-1.5">
            Bakım Geçmişi
          </TabsTrigger>
          <TabsTrigger value="maintenance-schedule" data-testid="tab-maintenance-schedule" className="text-xs px-2 py-1.5">
            <Calendar className="h-3 w-3 mr-1" />
            Bakım Planı
          </TabsTrigger>
          <TabsTrigger value="faults" data-testid="tab-faults" className="text-xs px-2 py-1.5">
            Arızalar
          </TabsTrigger>
          <TabsTrigger value="service-requests" data-testid="tab-service-requests" className="text-xs px-2 py-1.5">
            <ClipboardList className="h-3 w-3 mr-1" />
            Servis
          </TabsTrigger>
          <TabsTrigger value="comments" data-testid="tab-comments" className="text-xs px-2 py-1.5">
            Yorumlar
          </TabsTrigger>
          <TabsTrigger value="qr" data-testid="tab-qr" className="text-xs px-2 py-1.5">
            <QrCode className="h-3 w-3 mr-1" />
            QR Kod
          </TabsTrigger>
          <TabsTrigger value="guide" data-testid="tab-guide" className="text-xs px-2 py-1.5">
            <FileText className="h-3 w-3 mr-1" />
            Kılavuz & Bakım
          </TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline" className="text-xs px-2 py-1.5">
            <Clock className="h-3 w-3 mr-1" />
            Zaman Çizelgesi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bakım Geçmişi</CardTitle>
              <CardDescription>
                Bu ekipmana yapılan tüm bakım kayıtları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {equipment.maintenanceLogs.length > 0 ? (
                <div className="w-full space-y-2 sm:space-y-3">
                  {equipment.maintenanceLogs.map((log) => (
                    <div key={log.id} className="flex gap-2 sm:gap-3 pb-4 border-b last:border-0" data-testid={`maintenance-log-${log.id}`}>
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wrench className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium" data-testid={`text-maintenance-type-${log.id}`}>
                              {maintenanceTypeLabels[log.maintenanceType] || log.maintenanceType}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-maintenance-date-${log.id}`}>
                              {new Date(log.performedAt).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {log.cost && (
                            <Badge variant="outline" data-testid={`badge-cost-${log.id}`}>
                              <DollarSign className="h-3 w-3 mr-1" />
                              ₺{parseFloat(log.cost).toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-maintenance-description-${log.id}`}>
                          {log.description}
                        </p>
                        {log.nextScheduledDate && (
                          <p className="text-xs text-muted-foreground">
                            Sonraki bakım: {new Date(log.nextScheduledDate).toLocaleDateString('tr-TR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Henüz bakım kaydı yok
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faults" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Arıza Kayıtları</CardTitle>
              <CardDescription>
                Bu ekipmana bildirilen arızalar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {equipment.faults.length > 0 ? (
                <div className="w-full space-y-2 sm:space-y-3">
                  {equipment.faults.map((fault) => (
                    <div key={fault.id} className="flex gap-2 sm:gap-3 pb-4 border-b last:border-0" data-testid={`fault-${fault.id}`}>
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-4 w-4 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium" data-testid={`text-fault-equipment-${fault.id}`}>
                              {fault.equipmentName}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-fault-date-${fault.id}`}>
                              {new Date(fault.createdAt!).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              fault.currentStage === FAULT_STAGES.KAPATILDI
                                ? "default"
                                : fault.currentStage === FAULT_STAGES.BEKLIYOR
                                ? "secondary"
                                : "outline"
                            }
                            data-testid={`badge-fault-stage-${fault.id}`}
                          >
                            {stageLabels[fault.currentStage as FaultStageType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-fault-description-${fault.id}`}>
                          {fault.description}
                        </p>
                        {fault.photoUrl && (
                          <img 
                            src={fault.photoUrl} 
                            alt="Arıza fotoğrafı" 
                            className="rounded-md max-h-48 object-cover mt-2"
                            data-testid={`img-fault-photo-${fault.id}`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Henüz arıza bildirimi yok
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service-requests" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Servis Talepleri</CardTitle>
              <CardDescription>
                Bu ekipman için oluşturulan servis talepleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {serviceRequests && serviceRequests.length > 0 ? (
                <div className="w-full space-y-2 sm:space-y-3">
                  {serviceRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border p-3 grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid={`service-request-${request.id}`}>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={
                            request.status === SERVICE_REQUEST_STATUS.CLOSED ? 'default' :
                            request.status === SERVICE_REQUEST_STATUS.FIXED ? 'default' :
                            request.status === SERVICE_REQUEST_STATUS.CREATED ? 'secondary' :
                            'outline'
                          } data-testid={`badge-status-${request.id}`}>
                            {statusLabels[request.status] || request.status}
                          </Badge>
                          <Badge variant="outline">
                            {request.serviceDecision === SERVICE_DECISION.HQ ? 'Merkez Servisi' : 'Şube Servisi'}
                          </Badge>
                        </div>
                        {request.serviceProvider && (
                          <div>
                            <p className="text-sm font-medium">Servis Sağlayıcı</p>
                            <p className="text-sm text-muted-foreground">{request.serviceProvider}</p>
                          </div>
                        )}
                        {request.contactInfo && (
                          <div>
                            <p className="text-sm font-medium">İletişim Bilgisi</p>
                            <p className="text-sm text-muted-foreground">{request.contactInfo}</p>
                          </div>
                        )}
                        {request.notes && (
                          <div>
                            <p className="text-sm font-medium">Notlar</p>
                            <p className="text-sm text-muted-foreground">{request.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-between gap-2">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.createdAt!).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          {(request.estimatedCost || request.actualCost) && (
                            <div className="space-y-1">
                              {request.estimatedCost && (
                                <div className="flex items-center gap-1 text-sm">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <p>Tahm.: ₺{parseFloat(request.estimatedCost).toFixed(2)}</p>
                                </div>
                              )}
                              {request.actualCost && (
                                <div className="flex items-center gap-1 text-sm font-medium">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <p>Gerçek: ₺{parseFloat(request.actualCost).toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedServiceRequest(request);
                            statusUpdateForm.reset({
                              status: "",
                              actualCost: "",
                              notes: "",
                            });
                            setStatusUpdateDialogOpen(true);
                          }}
                          data-testid={`button-update-status-${request.id}`}
                          className="w-full"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Durumu Güncelle
                        </Button>
                      </div>
                      {request.timeline && request.timeline.length > 0 && (
                        <div className="col-span-1 sm:col-span-2 pt-3 border-t space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Geçmiş (Son 3)</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTimeline(request);
                                setTimelineDialogOpen(true);
                              }}
                              data-testid={`button-view-timeline-${request.id}`}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Tümünü Gör
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {request.timeline.slice(-3).reverse().map((entry) => (
                              <div key={entry.id} className="text-xs text-muted-foreground flex items-start gap-2 p-2 rounded border">
                                <Avatar className="h-4 w-4 flex-shrink-0">
                                  <AvatarFallback className="text-xs">
                                    {entry.actorId?.substring(0, 2).toUpperCase() || '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-xs font-mono">{format(new Date(entry.timestamp), 'dd MMM HH:mm', { locale: tr })}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {statusLabels[entry.status] || entry.status}
                                    </Badge>
                                  </div>
                                  {entry.notes && <p className="mt-1 text-xs">{entry.notes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Henüz servis talebi yok
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Yorumlar</CardTitle>
              <CardDescription>
                Bu ekipman hakkında yorumlar
              </CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-2 sm:space-y-3">
              {equipment.comments.length > 0 && (
                <div className="w-full space-y-2 sm:space-y-3">
                  {equipment.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 sm:gap-3 pb-4 border-b" data-testid={`comment-${comment.id}`}>
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-muted-foreground" data-testid={`text-comment-date-${comment.id}`}>
                          {new Date(comment.createdAt!).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-sm" data-testid={`text-comment-content-${comment.id}`}>
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createCommentMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yeni Yorum Ekle</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Yorumunuzu buraya yazın..."
                              data-testid="input-comment"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={createCommentMutation.isPending}
                        data-testid="button-submit-comment"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {createCommentMutation.isPending ? "Ekleniyor..." : "Yorum Ekle"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Kod
              </CardTitle>
              <CardDescription>
                Bu ekipmana hızlı erişim için QR kodu tarayın
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 sm:gap-3">
              {equipment.qrCodeUrl ? (
                <>
                  <div className="bg-white p-6 rounded-lg border" data-testid="qr-code-container">
                    <img 
                      src={equipment.qrCodeUrl} 
                      alt="Ekipman QR Kodu" 
                      className="w-64 h-64"
                      data-testid="img-qr-code"
                    />
                  </div>
                  <div className="text-center grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <p className="text-sm text-muted-foreground">
                      QR kodu mobil cihazınızla tarayarak bu ekipmanı hızlıca tanımlayabilirsiniz
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      DOSPRESSO-EQ-{equipment.id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!equipment.qrCodeUrl) return;
                      const link = document.createElement('a');
                      link.href = equipment.qrCodeUrl;
                      link.download = `ekipman-${equipment.id}-qr.png`;
                      link.click();
                    }}
                    data-testid="button-download-qr"
                  >
                    QR Kodu İndir
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    QR kod henüz oluşturulmadı
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance-schedule" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bakım Planı</CardTitle>
              <CardDescription>Periyodik bakım programı ve hatırlatıcılar</CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceSchedules.filter(s => s.equipmentId === Number(equipmentId)).length > 0 ? (
                <div className="flex flex-col gap-3 sm:gap-4" data-testid="list-maintenance-schedules">
                  {maintenanceSchedules.filter(s => s.equipmentId === Number(equipmentId)).map((schedule) => (
                    <Card key={schedule.id} data-testid={`card-maintenance-schedule-${schedule.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{schedule.maintenanceType}</CardTitle>
                          <Badge variant={schedule.isActive ? "default" : "secondary"} data-testid={`badge-schedule-status-${schedule.id}`}>
                            {schedule.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Periyod:</span>
                          <span data-testid={`text-interval-${schedule.id}`}>{schedule.intervalDays} gün</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Son Bakım:</span>
                          <span data-testid={`text-last-maintenance-${schedule.id}`}>
                            {schedule.lastMaintenanceDate ? format(new Date(schedule.lastMaintenanceDate), "d MMM yyyy", { locale: tr }) : "Henüz yapılmadı"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sonraki Bakım:</span>
                          <span className="font-medium" data-testid={`text-next-maintenance-${schedule.id}`}>
                            {format(new Date(schedule.nextMaintenanceDate), "d MMM yyyy", { locale: tr })}
                          </span>
                        </div>
                        {schedule.notes && (
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground text-xs" data-testid={`text-schedule-notes-${schedule.id}`}>{schedule.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="empty-state-maintenance-schedules">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Henüz bakım planı oluşturulmamış</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bakım Geçmişi</CardTitle>
              <CardDescription>Yapılan bakım kayıtları</CardDescription>
            </CardHeader>
            <CardContent>
              {proactiveMaintenanceLogs.filter(l => l.equipmentId === Number(equipmentId)).length > 0 ? (
                <div className="flex flex-col gap-3 sm:gap-4" data-testid="list-maintenance-logs">
                  {proactiveMaintenanceLogs.filter(l => l.equipmentId === Number(equipmentId)).map((log) => (
                    <Card key={log.id} data-testid={`card-maintenance-log-${log.id}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{log.maintenanceType}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Yapılma Tarihi:</span>
                          <span data-testid={`text-performed-date-${log.id}`}>
                            {format(new Date(log.performedDate), "d MMM yyyy", { locale: tr })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Yapan:</span>
                          <span data-testid={`text-performed-by-${log.id}`}>{log.performedById}</span>
                        </div>
                        {log.notes && (
                          <div className="pt-2 border-t">
                            <p className="text-muted-foreground text-xs" data-testid={`text-log-notes-${log.id}`}>{log.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="empty-state-maintenance-logs">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Henüz bakım kaydı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-troubleshooting-steps">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sorun Giderme Adımları</CardTitle>
                  <CardDescription>Bu ekipman tipi için tanımlı adımlar</CardDescription>
                </div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTroubleshootingEditOpen(!isTroubleshootingEditOpen)}
                  data-testid="button-toggle-troubleshooting-edit"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {isTroubleshootingEditOpen ? "Kapat" : "Düzenle"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {troubleshootingSteps && troubleshootingSteps.length > 0 ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {troubleshootingSteps.map((step) => (
                    <div 
                      key={step.id} 
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`troubleshooting-step-${step.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">Adım {step.order}</span>
                          {step.requiresPhoto && (
                            <Badge variant="secondary" className="text-xs">Fotoğraf</Badge>
                          )}
                          {step.isRequired && (
                            <Badge variant="destructive" className="text-xs">Zorunlu</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      {isTroubleshootingEditOpen && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedTroubleshootingStep(step);
                            setIsTroubleshootingEditOpen(true);
                          }}
                          data-testid={`button-edit-step-${step.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Bu ekipman tipi için adım tanımlanmamış</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide" className="space-y-4">
          {/* AI Equipment Knowledge Section */}
          <Card data-testid="card-ai-knowledge">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Teknik Bilgi Bankası
              </CardTitle>
              <CardDescription>
                {equipment?.brand} {equipment?.model} için AI tarafından oluşturulmuş teknik bilgiler
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingKnowledge ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : equipmentKnowledge.length > 0 ? (
                equipmentKnowledge.map((knowledge: any) => (
                  <Collapsible key={knowledge.id} data-testid={`knowledge-item-${knowledge.id}`}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 border rounded-lg hover-elevate" data-testid={`knowledge-trigger-${knowledge.id}`}>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          knowledge.category === 'maintenance' ? 'default' :
                          knowledge.category === 'troubleshooting' ? 'destructive' :
                          knowledge.category === 'safety' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {knowledge.category === 'maintenance' ? 'Bakım' :
                           knowledge.category === 'troubleshooting' ? 'Arıza Giderme' :
                           knowledge.category === 'usage' ? 'Kullanım' :
                           knowledge.category === 'safety' ? 'Güvenlik' : knowledge.category}
                        </Badge>
                        <span className="font-medium text-sm">{knowledge.title}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-3 border-x border-b rounded-b-lg bg-muted/30">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                        {knowledge.content}
                      </div>
                      {knowledge.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
                          {knowledge.keywords.map((kw: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Bu ekipman için henüz AI bilgisi oluşturulmamış</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Kılavuz & Bakım Dokümanları
              </CardTitle>
              <CardDescription>
                Bu ekipman tipi için hazırlanmış kılavuzlar, bakım prosedürleri ve sorun giderme dokümanları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingArticles ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : relatedArticles.length > 0 ? (
                <div className="w-full space-y-2 sm:space-y-3">
                  {relatedArticles.map((article: any) => (
                    <div
                      key={article.id}
                      className="p-3 border rounded-lg hover-elevate cursor-pointer"
                      data-testid={`article-card-${article.id}`}
                      onClick={() => window.open(`/bilgi-bankasi/${article.id}`, '_blank')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm" data-testid={`text-article-title-${article.id}`}>
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {article.category === 'maintenance' ? 'Bakım' :
                               article.category === 'sop' ? 'Prosedür' :
                               article.category === 'training' ? 'Eğitim' :
                               article.category === 'recipe' ? 'Tarif' : article.category}
                            </Badge>
                            {article.tags?.slice(0, 3).map((tag: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {article.viewCount || 0} görüntüleme
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Bu ekipman için henüz doküman eklenmemiş</p>
                  <p className="text-sm text-muted-foreground">
                    HQ personeli Bilgi Bankası'ndan "{equipment?.equipmentType}" tipine özel içerik ekleyebilir
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Troubleshooting Quick Reference */}
          {hasSteps && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Hızlı Sorun Giderme
                </CardTitle>
                <CardDescription>
                  Bu ekipman için tanımlı sorun giderme adımları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {troubleshootingSteps?.slice(0, 5).map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-2 p-2 rounded border" data-testid={`guide-step-${step.id}`}>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {idx + 1}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm">{step.description}</p>
                        {step.isRequired && (
                          <Badge variant="destructive" className="text-xs mt-1">Zorunlu</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {troubleshootingSteps && troubleshootingSteps.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{troubleshootingSteps.length - 5} adım daha var. Arıza bildirimi yaparken tüm adımlar gösterilir.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <EquipmentTimeline equipmentId={parseInt(id || "0")} />
        </TabsContent>
      </Tabs>

      {/* Troubleshooting Step Edit Dialog */}
      <Dialog open={isTroubleshootingEditOpen && !!selectedTroubleshootingStep} onOpenChange={(open) => {
        setIsTroubleshootingEditOpen(open);
        if (!open) setSelectedTroubleshootingStep(null);
      }}>
        <DialogContent data-testid="dialog-troubleshooting-edit">
          <DialogHeader>
            <DialogTitle>Sorun Giderme Adımı Düzenle</DialogTitle>
          </DialogHeader>
          {selectedTroubleshootingStep && (
            <div className="w-full space-y-2 sm:space-y-3">
              <div>
                <label className="text-sm font-medium">Adım Açıklaması</label>
                <Textarea 
                  value={selectedTroubleshootingStep.description}
                  onChange={(e) => {
                    setSelectedTroubleshootingStep({
                      ...selectedTroubleshootingStep,
                      description: e.target.value
                    });
                  }}
                  className="mt-1"
                  rows={4}
                  data-testid="input-troubleshooting-description"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTroubleshootingStep.isRequired}
                  onCheckedChange={(checked) => {
                    setSelectedTroubleshootingStep({
                      ...selectedTroubleshootingStep,
                      isRequired: checked as boolean
                    });
                  }}
                  data-testid="checkbox-troubleshooting-required"
                />
                <label className="text-sm font-medium cursor-pointer">Zorunlu adım</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedTroubleshootingStep.requiresPhoto}
                  onCheckedChange={(checked) => {
                    setSelectedTroubleshootingStep({
                      ...selectedTroubleshootingStep,
                      requiresPhoto: checked as boolean
                    });
                  }}
                  data-testid="checkbox-troubleshooting-photo"
                />
                <label className="text-sm font-medium cursor-pointer">Fotoğraf gerekli</label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setIsTroubleshootingEditOpen(false);
                  setSelectedTroubleshootingStep(null);
                }} data-testid="button-cancel-troubleshooting">
                  İptal
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedTroubleshootingStep) {
                      updateTroubleshootingMutation.mutate({
                        id: selectedTroubleshootingStep.id,
                        description: selectedTroubleshootingStep.description,
                        isRequired: selectedTroubleshootingStep.isRequired,
                        requiresPhoto: selectedTroubleshootingStep.requiresPhoto,
                      });
                    }
                  }}
                  disabled={updateTroubleshootingMutation.isPending}
                  data-testid="button-save-troubleshooting"
                >
                  {updateTroubleshootingMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Service Request Dialog */}
      <Dialog open={serviceRequestDialogOpen} onOpenChange={setServiceRequestDialogOpen}>
        <DialogContent data-testid="dialog-service-request">
          <DialogHeader>
            <DialogTitle>Yeni Servis Talebi Oluştur</DialogTitle>
            <DialogDescription>
              Ekipman için servis talebi oluşturun. Tüm alanlar isteğe bağlıdır.
            </DialogDescription>
          </DialogHeader>
          <Form {...serviceRequestForm}>
            <form onSubmit={serviceRequestForm.handleSubmit((data) => createServiceRequestMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={serviceRequestForm.control}
                name="serviceDecision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servis Kararı</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service-decision">
                          <SelectValue placeholder="Servis kararı seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SERVICE_DECISION.HQ}>Merkez Servisi</SelectItem>
                        <SelectItem value={SERVICE_DECISION.BRANCH}>Şube Servisi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceRequestForm.control}
                name="serviceProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servis Sağlayıcı</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Servis sağlayıcı adı" data-testid="input-service-provider" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceRequestForm.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İletişim Bilgisi</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Telefon veya e-posta" data-testid="input-contact-info" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceRequestForm.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tahmini Maliyet (₺)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-estimated-cost" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={serviceRequestForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Ek notlar..." rows={3} data-testid="input-service-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setServiceRequestDialogOpen(false)}
                  data-testid="button-cancel-service-request"
                >
                  İptal
                </Button>
                <Button type="submit" disabled={createServiceRequestMutation.isPending} data-testid="button-submit-service-request">
                  {createServiceRequestMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusUpdateDialogOpen} onOpenChange={setStatusUpdateDialogOpen}>
        <DialogContent data-testid="dialog-status-update">
          <DialogHeader>
            <DialogTitle>Durum Güncelle</DialogTitle>
            <DialogDescription>
              Servis talebi durumunu güncelleyin
            </DialogDescription>
          </DialogHeader>
          {selectedServiceRequest && (
            <Form {...statusUpdateForm}>
              <form onSubmit={statusUpdateForm.handleSubmit((data) => updateStatusMutation.mutate({ ...data, requestId: selectedServiceRequest.id }))} className="w-full space-y-2 sm:space-y-3">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <p className="text-sm font-medium">Mevcut Durum</p>
                  <Badge variant="outline" data-testid="badge-current-status">
                    {statusLabels[selectedServiceRequest.status] || selectedServiceRequest.status}
                  </Badge>
                </div>
                <FormField
                  control={statusUpdateForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yeni Durum</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-new-status">
                            <SelectValue placeholder="Yeni durum seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getAllowedTransitions(selectedServiceRequest.status).map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusLabels[status] || status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(statusUpdateForm.watch("status") === SERVICE_REQUEST_STATUS.FIXED || 
                  statusUpdateForm.watch("status") === SERVICE_REQUEST_STATUS.NOT_FIXED) && (
                  <FormField
                    control={statusUpdateForm.control}
                    name="actualCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gerçek Maliyet (₺)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" data-testid="input-actual-cost" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={statusUpdateForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Güncelleme notları..." rows={3} data-testid="input-status-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStatusUpdateDialogOpen(false)}
                    data-testid="button-cancel-status-update"
                  >
                    İptal
                  </Button>
                  <Button type="submit" disabled={updateStatusMutation.isPending} data-testid="button-submit-status-update">
                    {updateStatusMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Timeline Dialog */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-timeline">
          <DialogHeader>
            <DialogTitle>Tam Geçmiş</DialogTitle>
            <DialogDescription>
              Servis talebinin tüm geçmişi
            </DialogDescription>
          </DialogHeader>
          {selectedTimeline && selectedTimeline.timeline && selectedTimeline.timeline.length > 0 ? (
            <div className="w-full space-y-2 sm:space-y-3">
              {[...selectedTimeline.timeline].reverse().map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 sm:gap-3 pb-4 border-b last:border-0" data-testid={`timeline-entry-${entry.id}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {entry.actorId?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {entry.actorId}
                      </p>
                      <Badge variant="outline">
                        {statusLabels[entry.status] || entry.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.timestamp), 'PPp', { locale: tr })}
                    </p>
                    {entry.notes && (
                      <p className="text-sm">{entry.notes}</p>
                    )}
                    {entry.meta && Object.keys(entry.meta).length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {Object.entries(entry.meta).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Henüz geçmiş kaydı yok
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Equipment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-equipment" className="max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Ekipman Düzenle</DialogTitle>
            <DialogDescription>
              Ekipman bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={editForm.control}
                name="equipmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ekipman Tipi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-equipment-type">
                          <SelectValue placeholder="Ekipman tipi seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(EQUIPMENT_TYPES).map((type) => (
                          <SelectItem key={type} value={type}>
                            {EQUIPMENT_METADATA[type].nameTr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seri Numarası</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Ekipman seri numarası" data-testid="input-edit-serial-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="modelNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Numarası</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Ekipman model numarası" data-testid="input-edit-model-no" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Satın Alma Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-edit-purchase-date" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="warrantyEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Garanti Bitiş Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-edit-warranty-date" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="lastMaintenanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Son Bakım Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        data-testid="input-edit-maintenance-date" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-branch">
                          <SelectValue placeholder="Şube seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durum</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "true")}
                      value={field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-status">
                          <SelectValue placeholder="Durum seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Aktif</SelectItem>
                        <SelectItem value="false">Pasif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="maintenanceResponsible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bakım Sorumlusu</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || SERVICE_DECISION.BRANCH}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-maintenance-responsible">
                          <SelectValue placeholder="Sorumlu seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SERVICE_DECISION.BRANCH}>Şube</SelectItem>
                        <SelectItem value={SERVICE_DECISION.HQ}>Merkez (HQ)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="faultProtocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arıza Protokolü</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "branch"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-fault-protocol">
                          <SelectValue placeholder="Protokol seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="branch">Şube Yöneticisi</SelectItem>
                        <SelectItem value="hq_teknik">HQ Teknik Ekip</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar (Opsiyonel)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Ek bilgiler" data-testid="input-edit-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* HQ-Only: Service Contact Fields */}
              {user?.role && isHQRole(user.role as any) && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <h4 className="font-medium text-sm">Servis Firma Bilgileri (Sadece HQ)</h4>
                  <FormField
                    control={editForm.control}
                    name="serviceContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servis Firma Adı</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Servis firması adı" data-testid="input-edit-service-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="serviceContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servis Telefon</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Servis telefon numarası" data-testid="input-edit-service-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="serviceContactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servis E-posta</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Servis e-posta adresi" data-testid="input-edit-service-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="serviceContactAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servis Adresi</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="Servis firma adresi" data-testid="input-edit-service-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="serviceHandledBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servis Yönetimi</FormLabel>
                        <Select onValueChange={field.onChange} value={String(field.value || "hq")}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-service-handled-by">
                              <SelectValue placeholder="Yönetici seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hq">HQ Yönetir</SelectItem>
                            <SelectItem value="branch">Şube Yönetir</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    editForm.reset();
                  }}
                  data-testid="button-edit-cancel"
                >
                  İptal
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-edit-submit">
                  {updateMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fault Creation Dialog */}
      <Dialog open={isFaultDialogOpen} onOpenChange={setIsFaultDialogOpen}>
        <DialogContent data-testid="dialog-fault-create" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Arıza Kaydı</DialogTitle>
            <DialogDescription>
              Ekipman arızası bildirimini oluşturun
            </DialogDescription>
          </DialogHeader>
          <Form {...faultForm}>
            <form onSubmit={faultForm.handleSubmit((data) => createFaultMutation.mutate(data))} className="w-full space-y-2 sm:space-y-3">
              <FormField
                control={faultForm.control}
                name="equipmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ekipman Adı</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly data-testid="input-fault-equipment-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Troubleshooting Steps Section */}
              {troubleshootingSteps && troubleshootingSteps.length > 0 && (
                <div className="border rounded-lg p-3 grid grid-cols-1 gap-2 sm:gap-3 bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Sorun Giderme Adımları</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Arıza raporu oluşturmadan önce aşağıdaki adımları tamamlayın:
                  </p>
                  {isLoadingSteps ? (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {troubleshootingSteps.map((step) => {
                        const isMissing = step.isRequired && !completedStepIds.has(step.id);
                        return (
                          <div 
                            key={step.id} 
                            className={`flex items-start gap-2 sm:gap-3 p-3 bg-background rounded border ${
                              isMissing ? 'border-destructive border-2' : ''
                            }`}
                          >
                            <Checkbox
                              checked={completedStepIds.has(step.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(completedStepIds);
                                if (checked) {
                                  newSet.add(step.id);
                                } else {
                                  newSet.delete(step.id);
                                }
                                setCompletedStepIds(newSet);
                              }}
                              data-testid={`checkbox-troubleshooting-step-${step.id}`}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${isMissing ? 'text-destructive' : ''}`}>
                                  Adım {step.order}
                                  {step.isRequired && <span className="text-destructive">*</span>}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                              {isMissing && (
                                <p className="text-sm text-destructive font-medium">
                                  Bu adım zorunludur
                                </p>
                              )}
                              {completedStepIds.has(step.id) && (
                                <Input
                                  placeholder="Not (opsiyonel)"
                                  value={stepNotes[step.id] || ""}
                                  onChange={(e) => {
                                    setStepNotes({ ...stepNotes, [step.id]: e.target.value });
                                  }}
                                  className="text-sm"
                                  data-testid={`input-step-note-${step.id}`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {troubleshootingSteps.some(s => s.isRequired) && (
                    <p className="text-sm text-muted-foreground">
                      <span className="text-destructive">*</span> Zorunlu adımları tamamlamadan arıza raporu oluşturamazsınız.
                    </p>
                  )}
                </div>
              )}
              
              {/* AI Technical Assistant Section */}
              <div className="border rounded-lg p-3 grid grid-cols-1 gap-2 sm:gap-3 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">AI Teknik Asistan</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cihaz ayarları, kalibrasyonlar ve teknik detaylar hakkında soru sorun
                </p>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Örn: Bu cihazın basınç ayarı nasıl yapılır?"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aiQuestion.trim() && !askAiMutation.isPending) {
                        askAiMutation.mutate(aiQuestion.trim());
                      }
                    }}
                    disabled={askAiMutation.isPending}
                    data-testid="input-ai-question"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (aiQuestion.trim()) {
                        askAiMutation.mutate(aiQuestion.trim());
                      }
                    }}
                    disabled={!aiQuestion.trim() || askAiMutation.isPending}
                    size="icon"
                    data-testid="button-ask-ai"
                  >
                    {askAiMutation.isPending ? (
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {aiAnswer && (
                  <div className="bg-background rounded-lg p-3 grid grid-cols-1 gap-2 border" data-testid="ai-response-container">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap" data-testid="text-ai-answer">{aiAnswer.answer}</p>
                        {aiAnswer.sources && aiAnswer.sources.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Kaynaklar:</p>
                            <div className="flex flex-wrap gap-1">
                              {aiAnswer.sources.map((source, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-ai-source-${idx}`}>
                                  {source.title || `Kaynak ${idx + 1}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <FormField
                control={faultForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arıza Açıklaması *</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Arızayı detaylı açıklayın" rows={4} data-testid="input-fault-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={faultForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Öncelik</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "orta"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fault-priority">
                          <SelectValue placeholder="Öncelik seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dusuk">Düşük</SelectItem>
                        <SelectItem value="orta">Orta</SelectItem>
                        <SelectItem value="yuksek">Yüksek</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Warning about missing required steps */}
              {hasSteps && !isTroubleshootingComplete && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
                  <p className="text-sm text-destructive font-medium">
                    {missingRequiredSteps.length} zorunlu adım eksik
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Lütfen yukarıdaki işaretli adımları tamamlayın
                  </p>
                </div>
              )}
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFaultDialogOpen(false)}
                  data-testid="button-cancel-fault"
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createFaultMutation.isPending || (hasSteps && !isTroubleshootingComplete)} 
                  data-testid="button-submit-fault"
                >
                  {createFaultMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
