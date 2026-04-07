import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation, Redirect } from "wouter";
import { isHQRole, type Branch } from "@shared/schema";
import { useCanvas, type AspectRatio } from "./hooks/useCanvas";
import { CanvasPreview } from "./CanvasPreview";
import { BackgroundPanel } from "./BackgroundPanel";
import { TextPanel } from "./TextPanel";
import { ImagePanel } from "./ImagePanel";
import { TemplatePanel } from "./TemplatePanel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Download,
  Send,
  Cookie,
  Palette,
  Type,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Trash2,
  Maximize2,
} from "lucide-react";

// ─── Role Lists ──────────────────────────────────────────────────

const ALLOWED_ROLES = [
  "admin", "ceo", "cgo", "coach", "trainer",
  "supervisor", "marketing", "destek",
];

const TARGET_ROLES = [
  { key: "barista", label: "Barista" },
  { key: "bar_buddy", label: "Bar Buddy" },
  { key: "stajyer", label: "Stajyer" },
  { key: "supervisor", label: "Supervisor" },
  { key: "supervisor_buddy", label: "Supervisor Buddy" },
  { key: "mudur", label: "Müdür" },
  { key: "yatirimci_branch", label: "Yatırımcı (Şube)" },
  { key: "fabrika_mudur", label: "Fabrika Müdür" },
  { key: "fabrika_operator", label: "Fabrika Operatör" },
  { key: "fabrika_sorumlu", label: "Fabrika Sorumlu" },
];

// ─── Aspect Ratio Options ────────────────────────────────────────

const ASPECT_OPTIONS: { key: AspectRatio; label: string; icon: string }[] = [
  { key: "3:1", label: "Banner (3:1)", icon: "▬" },
  { key: "16:9", label: "Geniş (16:9)", icon: "▭" },
  { key: "1:1", label: "Kare (1:1)", icon: "□" },
];

// ─── Mobile Tool Tabs ────────────────────────────────────────────

const TOOL_TABS = [
  { key: "background", label: "Arka Plan", Icon: Palette },
  { key: "text", label: "Metin", Icon: Type },
  { key: "image", label: "Görsel", Icon: ImageIcon },
  { key: "template", label: "Şablon", Icon: LayoutTemplate },
] as const;

type ToolTab = typeof TOOL_TABS[number]["key"];

// ─── Component ───────────────────────────────────────────────────

export default function DuyuruStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const canvas = useCanvas();

  // Active tool tab
  const [activeTab, setActiveTab] = useState<ToolTab>("background");

  // Publish dialog state
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishMessage, setPublishMessage] = useState("");
  const [publishCategory, setPublishCategory] = useState("general");
  const [publishPriority, setPublishPriority] = useState("normal");
  const [showOnDashboard, setShowOnDashboard] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [validFrom, setValidFrom] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // Save draft dialog state
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  // Queries
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    staleTime: 300000,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const saveDraftMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; title: string }) => {
      return apiRequest("POST", "/api/admin/banners", {
        title: data.title,
        imageUrl: data.imageUrl,
        isActive: false,
      });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Taslak kaydedildi!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      setDraftOpen(false);
      setDraftTitle("");
      setLocation("/duyurular");
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message || "Taslak kaydedilemedi", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (data: {
      imageData: string;
      title: string;
      message: string;
      category: string;
      priority: string;
      showOnDashboard: boolean;
      targetRoles: string[];
      targetBranches: number[];
      validFrom?: string;
      expiresAt?: string;
    }) => {
      return apiRequest("POST", "/api/announcements/from-banner", data);
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Duyuru yayınlandı!" });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setPublishOpen(false);
      setLocation("/duyurular");
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message || "Yayınlanamadı", variant: "destructive" });
    },
  });

  // ── Export & Save ─────────────────────────────────────────────
  const captureCanvas = async (): Promise<string | null> => {
    if (!canvas.canvasRef.current) return null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const c = await html2canvas(canvas.canvasRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      return c.toDataURL("image/png");
    } catch (err) {
      console.error("Canvas capture error:", err);
      toast({ title: "Hata", description: "Canvas yakalanamadı", variant: "destructive" });
      return null;
    }
  };

  const handleExportPNG = async () => {
    const data = await captureCanvas();
    if (!data) return;
    const link = document.createElement("a");
    link.download = `DOSPRESSO_Banner_${Date.now()}.png`;
    link.href = data;
    link.click();
    toast({ title: "İndirildi!", description: "PNG başarıyla oluşturuldu." });
  };

  const handleSaveDraft = async () => {
    if (!draftTitle.trim()) {
      toast({ title: "Hata", description: "Başlık gerekli", variant: "destructive" });
      return;
    }
    const data = await captureCanvas();
    if (!data) return;
    saveDraftMutation.mutate({ imageUrl: data, title: draftTitle });
  };

  const handlePublish = async () => {
    if (!publishTitle.trim()) {
      toast({ title: "Hata", description: "Başlık gerekli", variant: "destructive" });
      return;
    }
    const data = await captureCanvas();
    if (!data) return;
    publishMutation.mutate({
      imageData: data,
      title: publishTitle,
      message: publishMessage || publishTitle,
      category: publishCategory,
      priority: publishPriority,
      showOnDashboard,
      targetRoles: selectedRoles,
      targetBranches: selectedBranches,
      validFrom: validFrom || undefined,
      expiresAt: expiresAt || undefined,
    });
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((p) => (p.includes(role) ? p.filter((r) => r !== role) : [...p, role]));
  };

  const toggleBranch = (branchId: number) => {
    setSelectedBranches((p) => (p.includes(branchId) ? p.filter((b) => b !== branchId) : [...p, branchId]));
  };

  // ── Background style (memoized) ──────────────────────────────
  const bgStyle = useMemo(() => canvas.getBackgroundStyle(), [canvas.getBackgroundStyle]);

  // ── Auth check (after all hooks) ──────────────────────────────
  const isAllowed = user?.role && ALLOWED_ROLES.includes(user.role);
  if (!user) return null;
  if (!isAllowed) return <Redirect to="/" />;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-56px)]" data-testid="duyuru-studio-v2">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-card px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Left: back + title */}
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/duyurular">
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" data-testid="btn-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-sm sm:text-base font-semibold truncate">Duyuru Stüdyosu</h1>
          </div>

          {/* Center: aspect ratio (hidden on small screens) */}
          <div className="hidden sm:flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {ASPECT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => canvas.setAspectRatio(opt.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  canvas.aspectRatio === opt.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={opt.label}
              >
                <span className="mr-1">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canvas.selectedElement && (
              <Button
                onClick={canvas.deleteSelected}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                title="Seçili öğeyi sil"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={handleExportPNG}
              variant="outline"
              size="sm"
              className="gap-1 h-8 text-xs hidden sm:flex"
              data-testid="btn-export"
            >
              <Download className="h-3.5 w-3.5" />
              PNG
            </Button>
            <Button
              onClick={() => setDraftOpen(true)}
              variant="secondary"
              size="sm"
              className="gap-1 h-8 text-xs"
              data-testid="btn-draft"
            >
              <Cookie className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Taslak</span>
            </Button>
            <Button
              onClick={() => setPublishOpen(true)}
              size="sm"
              className="gap-1 h-8 text-xs"
              data-testid="btn-publish"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yayınla</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Canvas Area */}
        <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4 flex items-start justify-center">
          <CanvasPreview
            canvasRef={canvas.canvasRef}
            aspectRatio={canvas.aspectRatioCSS[canvas.aspectRatio]}
            backgroundStyle={bgStyle}
            textElements={canvas.textElements}
            imageElements={canvas.imageElements}
            iconElements={canvas.iconElements}
            selectedElement={canvas.selectedElement}
            onMouseDown={canvas.handleMouseDown}
            onMouseMove={canvas.handleMouseMove}
            onMouseUp={canvas.handleMouseUp}
            onDeselect={() => canvas.setSelectedElement(null)}
          />
        </div>

        {/* ── Tool Panel (Desktop: sidebar, Mobile: bottom panel) ── */}
        <div className="lg:w-[320px] lg:border-l border-t lg:border-t-0 bg-card shrink-0 flex flex-col">
          {/* Mobile aspect ratio */}
          <div className="sm:hidden flex items-center gap-1 p-2 border-b">
            {ASPECT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => canvas.setAspectRatio(opt.key)}
                className={`flex-1 py-1.5 rounded text-[10px] font-medium ${
                  canvas.aspectRatio === opt.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Tool Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ToolTab)}
            className="flex-1 min-h-0 flex flex-col"
          >
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2 h-10 shrink-0">
              {TOOL_TABS.map(({ key, label, Icon }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="gap-1.5 text-xs data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 min-h-0 p-3">
              <TabsContent value="background" className="mt-0 h-full">
                <BackgroundPanel
                  background={canvas.background}
                  onChange={(bg) => canvas.setBackground(bg)}
                />
              </TabsContent>
              <TabsContent value="text" className="mt-0 h-full">
                <TextPanel
                  selectedText={canvas.selectedText}
                  onAddText={() => canvas.addText()}
                  onUpdateText={canvas.updateText}
                  onDelete={canvas.deleteSelected}
                  hasSelection={!!canvas.selectedElement}
                />
              </TabsContent>
              <TabsContent value="image" className="mt-0 h-full">
                <ImagePanel
                  selectedImage={canvas.selectedImage}
                  onAddImage={canvas.addImage}
                  onUpdateImage={canvas.updateImage}
                  onDelete={canvas.deleteSelected}
                  hasSelection={!!canvas.selectedElement}
                />
              </TabsContent>
              <TabsContent value="template" className="mt-0 h-full">
                <TemplatePanel onApplyTemplate={canvas.applyTemplate} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* ── Save Draft Dialog ───────────────────────────────────── */}
      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Taslak Kaydet</DialogTitle>
            <DialogDescription>Banner'ı taslak olarak kaydedin, sonra yayınlayın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Başlık</Label>
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Taslak başlığı..."
                data-testid="input-draft-title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftOpen(false)}>İptal</Button>
            <Button
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.isPending}
              className="gap-2"
            >
              {saveDraftMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Publish Dialog ──────────────────────────────────────── */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Duyuru Olarak Yayınla</DialogTitle>
            <DialogDescription>Banner'ı duyuru olarak tüm hedef kitleye gönderin.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-2 pr-3">
              {/* Title */}
              <div className="space-y-1.5">
                <Label>Başlık *</Label>
                <Input
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="Duyuru başlığı..."
                  data-testid="input-publish-title"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label>Mesaj</Label>
                <Textarea
                  value={publishMessage}
                  onChange={(e) => setPublishMessage(e.target.value)}
                  placeholder="Ek açıklama..."
                  className="min-h-[60px]"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Kategori</Label>
                  <Select value={publishCategory} onValueChange={setPublishCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Genel</SelectItem>
                      <SelectItem value="new_product">Yeni Ürün</SelectItem>
                      <SelectItem value="policy">Politika</SelectItem>
                      <SelectItem value="campaign">Kampanya</SelectItem>
                      <SelectItem value="training">Eğitim</SelectItem>
                      <SelectItem value="event">Etkinlik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Öncelik</Label>
                  <Select value={publishPriority} onValueChange={setPublishPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Acil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dashboard toggle */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showDash"
                  checked={showOnDashboard}
                  onCheckedChange={(v) => setShowOnDashboard(!!v)}
                />
                <Label htmlFor="showDash" className="text-sm cursor-pointer">Dashboard'da göster</Label>
              </div>

              {/* Target Roles */}
              <div className="space-y-1.5">
                <Label className="text-sm">Hedef Roller</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TARGET_ROLES.map((r) => (
                    <label key={r.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedRoles.includes(r.key)}
                        onCheckedChange={() => toggleRole(r.key)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Boş bırakılırsa tüm roller hedeflenir.</p>
              </div>

              {/* Target Branches */}
              {branches && branches.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Hedef Şubeler</Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedBranches.includes(b.id)}
                          onCheckedChange={() => toggleBranch(b.id)}
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Boş bırakılırsa tüm şubeler hedeflenir.</p>
                </div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Başlangıç</Label>
                  <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Bitiş</Label>
                  <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>İptal</Button>
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
              className="gap-2"
            >
              {publishMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Yayınla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
