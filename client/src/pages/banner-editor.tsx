import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Download, 
  Plus, 
  Trash2, 
  Type,
  Image as ImageIcon,
  Palette,
  Cookie,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Send,
  Loader2
} from "lucide-react";

const PRESET_COLORS = [
  { name: "Espresso", color: "#4a2c2a" },
  { name: "Caramel", color: "#d4a574" },
  { name: "Cream", color: "#f5e6d3" },
  { name: "Mint", color: "#98d4bb" },
  { name: "Berry", color: "#c43a5c" },
  { name: "Mocha", color: "#6f4e37" },
  { name: "Vanilla", color: "#f3e5ab" },
  { name: "Chocolate", color: "#3c1414" },
  { name: "Rose", color: "#ffccd5" },
  { name: "Sky", color: "#87ceeb" },
  { name: "Sunset", color: "#ff6b35" },
  { name: "Forest", color: "#228b22" },
];

const GRADIENT_PRESETS = [
  { name: "Kahve", from: "#4a2c2a", to: "#d4a574" },
  { name: "Sunset", from: "#ff6b35", to: "#f7c59f" },
  { name: "Berry", from: "#c43a5c", to: "#ffccd5" },
  { name: "Ocean", from: "#1e3a8a", to: "#87ceeb" },
  { name: "Forest", from: "#228b22", to: "#98d4bb" },
  { name: "Gold", from: "#b8860b", to: "#f5e6d3" },
];

const ICON_CATEGORIES = {
  food: {
    name: "Yiyecek & İçecek",
    icons: [
      { id: "donut-classic", emoji: "🍩", name: "Donut" },
      { id: "coffee", emoji: "☕", name: "Kahve" },
      { id: "cake", emoji: "🎂", name: "Pasta" },
      { id: "croissant", emoji: "🥐", name: "Kruvasan" },
      { id: "cookie", emoji: "🍪", name: "Kurabiye" },
      { id: "chocolate", emoji: "🍫", name: "Çikolata" },
      { id: "cupcake", emoji: "🧁", name: "Cupcake" },
      { id: "ice-cream", emoji: "🍨", name: "Dondurma" },
      { id: "milk", emoji: "🥛", name: "Süt" },
      { id: "tea", emoji: "🍵", name: "Çay" },
      { id: "juice", emoji: "🧃", name: "Meyve Suyu" },
      { id: "pizza", emoji: "🍕", name: "Pizza" },
      { id: "burger", emoji: "🍔", name: "Burger" },
      { id: "sandwich", emoji: "🥪", name: "Sandviç" },
      { id: "bread", emoji: "🍞", name: "Ekmek" },
    ]
  },
  smileys: {
    name: "Yüz İfadeleri",
    icons: [
      { id: "smile", emoji: "😊", name: "Gülümseyen" },
      { id: "laugh", emoji: "😄", name: "Gülen" },
      { id: "wink", emoji: "😉", name: "Göz Kırpan" },
      { id: "heart-eyes", emoji: "😍", name: "Aşık" },
      { id: "cool", emoji: "😎", name: "Havalı" },
      { id: "party", emoji: "🥳", name: "Parti" },
      { id: "star-eyes", emoji: "🤩", name: "Yıldız Gözlü" },
      { id: "think", emoji: "🤔", name: "Düşünen" },
      { id: "chef", emoji: "👨‍🍳", name: "Şef" },
      { id: "thumbs-up", emoji: "👍", name: "Beğen" },
      { id: "clap", emoji: "👏", name: "Alkış" },
      { id: "wave", emoji: "👋", name: "El Salla" },
    ]
  },
  symbols: {
    name: "Semboller",
    icons: [
      { id: "star", emoji: "⭐", name: "Yıldız" },
      { id: "heart", emoji: "❤️", name: "Kalp" },
      { id: "sparkle", emoji: "✨", name: "Işıltı" },
      { id: "fire", emoji: "🔥", name: "Ateş" },
      { id: "crown", emoji: "👑", name: "Taç" },
      { id: "gift", emoji: "🎁", name: "Hediye" },
      { id: "trophy", emoji: "🏆", name: "Kupa" },
      { id: "medal", emoji: "🏅", name: "Madalya" },
      { id: "ribbon", emoji: "🎀", name: "Kurdele" },
      { id: "balloon", emoji: "🎈", name: "Balon" },
      { id: "confetti", emoji: "🎉", name: "Konfeti" },
      { id: "check", emoji: "✅", name: "Onay" },
      { id: "new", emoji: "🆕", name: "Yeni" },
      { id: "percent", emoji: "💯", name: "Yüzde" },
      { id: "money", emoji: "💰", name: "Para" },
      { id: "tag", emoji: "🏷️", name: "Etiket" },
    ]
  },
  nature: {
    name: "Doğa & Mevsimler",
    icons: [
      { id: "sun", emoji: "☀️", name: "Güneş" },
      { id: "rainbow", emoji: "🌈", name: "Gökkuşağı" },
      { id: "flower", emoji: "🌸", name: "Çiçek" },
      { id: "leaf", emoji: "🍃", name: "Yaprak" },
      { id: "snowflake", emoji: "❄️", name: "Kar" },
      { id: "moon", emoji: "🌙", name: "Ay" },
      { id: "cloud", emoji: "☁️", name: "Bulut" },
      { id: "tree", emoji: "🌳", name: "Ağaç" },
    ]
  },
  arrows: {
    name: "Oklar & İşaretler",
    icons: [
      { id: "arrow-right", emoji: "➡️", name: "Sağ Ok" },
      { id: "arrow-left", emoji: "⬅️", name: "Sol Ok" },
      { id: "arrow-up", emoji: "⬆️", name: "Yukarı Ok" },
      { id: "arrow-down", emoji: "⬇️", name: "Aşağı Ok" },
      { id: "point-right", emoji: "👉", name: "İşaret" },
      { id: "exclaim", emoji: "❗", name: "Ünlem" },
      { id: "question", emoji: "❓", name: "Soru" },
      { id: "star-burst", emoji: "💥", name: "Patlama" },
    ]
  }
};

// Flattened icons for backward compatibility
const DONUT_ICONS = Object.values(ICON_CATEGORIES).flatMap(cat => cat.icons);

type TextElement = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
};

type IconElement = {
  id: string;
  iconId: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
};

type ImageElement = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

// Role options for announcements
const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "branch_manager", label: "Şube Müdürü" },
  { value: "branch_assistant", label: "Şube Müdür Yardımcısı" },
  { value: "staff", label: "Personel" },
  { value: "barista", label: "Barista" },
  { value: "cashier", label: "Kasiyer" },
];

const CATEGORY_OPTIONS = [
  { value: "general", label: "Genel" },
  { value: "new_product", label: "Yeni Ürün" },
  { value: "campaign", label: "Kampanya" },
  { value: "policy", label: "Politika" },
  { value: "training", label: "Eğitim" },
  { value: "event", label: "Etkinlik" },
  { value: "urgent", label: "Acil" },
];

export default function BannerEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [backgroundColor, setBackgroundColor] = useState("#4a2c2a");
  const [useGradient, setUseGradient] = useState(false);
  const [gradientFrom, setGradientFrom] = useState("#4a2c2a");
  const [gradientTo, setGradientTo] = useState("#d4a574");
  const [gradientDirection, setGradientDirection] = useState("to-r");

  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [iconElements, setIconElements] = useState<IconElement[]>([]);
  const [imageElements, setImageElements] = useState<ImageElement[]>([]);

  const [selectedElement, setSelectedElement] = useState<{ type: "text" | "icon" | "image"; id: string } | null>(null);
  const [dragging, setDragging] = useState<{ type: string; id: string; offsetX: number; offsetY: number } | null>(null);

  // Publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishMessage, setPublishMessage] = useState("");
  const [publishCategory, setPublishCategory] = useState("general");
  const [publishPriority, setPublishPriority] = useState("normal");
  const [showOnDashboard, setShowOnDashboard] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);

  // Fetch branches for targeting
  const { data: branches } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/branches"],
  });

  // Publish mutation
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
    }) => {
      return apiRequest("/api/announcements/from-banner", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Duyuru yayınlandı!" });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setPublishDialogOpen(false);
      setLocation("/duyurular");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Hata", 
        description: error.message || "Duyuru yayınlanamadı", 
        variant: "destructive" 
      });
    }
  });

  if (!user || !["admin", "supervisor"].includes(user.role || "")) {
    return <Redirect to="/" />;
  }

  const addTextElement = () => {
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      text: "Yeni Metin",
      x: 50,
      y: 50,
      fontSize: 24,
      color: "#ffffff",
      fontFamily: "Inter",
      bold: false,
      italic: false,
      align: "center",
    };
    setTextElements([...textElements, newText]);
    setSelectedElement({ type: "text", id: newText.id });
  };

  const addIconElement = (iconId: string, emoji: string) => {
    const newIcon: IconElement = {
      id: `icon-${Date.now()}`,
      iconId,
      emoji,
      x: 150,
      y: 50,
      size: 48,
      rotation: 0,
    };
    setIconElements([...iconElements, newIcon]);
    setSelectedElement({ type: "icon", id: newIcon.id });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const newImage: ImageElement = {
        id: `image-${Date.now()}`,
        src,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        rotation: 0,
      };
      setImageElements([...imageElements, newImage]);
      setSelectedElement({ type: "image", id: newImage.id });
    };
    reader.readAsDataURL(file);
  };

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(textElements.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const updateIconElement = (id: string, updates: Partial<IconElement>) => {
    setIconElements(iconElements.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const updateImageElement = (id: string, updates: Partial<ImageElement>) => {
    setImageElements(imageElements.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    if (selectedElement.type === "text") {
      setTextElements(textElements.filter((t) => t.id !== selectedElement.id));
    } else if (selectedElement.type === "icon") {
      setIconElements(iconElements.filter((i) => i.id !== selectedElement.id));
    } else if (selectedElement.type === "image") {
      setImageElements(imageElements.filter((i) => i.id !== selectedElement.id));
    }
    setSelectedElement(null);
  };

  const handleMouseDown = (e: React.MouseEvent, type: "text" | "icon" | "image", id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSelectedElement({ type, id });

    let element: any;
    if (type === "text") element = textElements.find((t) => t.id === id);
    else if (type === "icon") element = iconElements.find((i) => i.id === id);
    else if (type === "image") element = imageElements.find((i) => i.id === id);

    if (element) {
      setDragging({
        type,
        id,
        offsetX: e.clientX - rect.left - element.x,
        offsetY: e.clientY - rect.top - element.y,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(rect.width - 50, e.clientX - rect.left - dragging.offsetX));
      const newY = Math.max(0, Math.min(rect.height - 30, e.clientY - rect.top - dragging.offsetY));

      if (dragging.type === "text") {
        updateTextElement(dragging.id, { x: newX, y: newY });
      } else if (dragging.type === "icon") {
        updateIconElement(dragging.id, { x: newX, y: newY });
      } else if (dragging.type === "image") {
        updateImageElement(dragging.id, { x: newX, y: newY });
      }
    },
    [dragging, textElements, iconElements, imageElements]
  );

  const handleMouseUp = () => {
    setDragging(null);
  };

  const getBackgroundStyle = () => {
    if (useGradient) {
      const directions: Record<string, string> = {
        "to-r": "to right",
        "to-l": "to left",
        "to-t": "to top",
        "to-b": "to bottom",
        "to-br": "to bottom right",
        "to-bl": "to bottom left",
      };
      return {
        background: `linear-gradient(${directions[gradientDirection]}, ${gradientFrom}, ${gradientTo})`,
      };
    }
    return { backgroundColor };
  };

  const exportAsPNG = async () => {
    if (!canvasRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement("a");
      link.download = `DOSPRESSO_Banner_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({ title: "Banner indirildi!", description: "PNG dosyasi basariyla olusturuldu." });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Hata", description: "Banner indirilemedi", variant: "destructive" });
    }
  };

  const handlePublish = async () => {
    if (!canvasRef.current) return;
    if (!publishTitle.trim()) {
      toast({ title: "Hata", description: "Başlık gerekli", variant: "destructive" });
      return;
    }

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imageData = canvas.toDataURL("image/png");
      
      publishMutation.mutate({
        imageData,
        title: publishTitle,
        message: publishMessage || publishTitle,
        category: publishCategory,
        priority: publishPriority,
        showOnDashboard,
        targetRoles: selectedRoles,
        targetBranches: selectedBranches,
      });
    } catch (error) {
      console.error("Publish error:", error);
      toast({ title: "Hata", description: "Banner yayınlanamadı", variant: "destructive" });
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleBranch = (branchId: number) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) ? prev.filter(b => b !== branchId) : [...prev, branchId]
    );
  };

  const selectedText = selectedElement?.type === "text" ? textElements.find((t) => t.id === selectedElement.id) : null;
  const selectedIcon = selectedElement?.type === "icon" ? iconElements.find((i) => i.id === selectedElement.id) : null;
  const selectedImage = selectedElement?.type === "image" ? imageElements.find((i) => i.id === selectedElement.id) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/bannerlar">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Banner Editoru</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportAsPNG} variant="outline" className="gap-2" data-testid="button-export-png">
            <Download className="h-4 w-4" />
            PNG İndir
          </Button>
          <Button onClick={() => setPublishDialogOpen(true)} className="gap-2" data-testid="button-publish-banner">
            <Send className="h-4 w-4" />
            Duyuru Olarak Yayınla
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-4 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Önizleme (Responsive - 2:1 Oran)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasRef}
              className="relative w-full rounded-lg overflow-hidden cursor-crosshair mx-auto"
              style={{
                ...getBackgroundStyle(),
                aspectRatio: "2/1",
                maxWidth: "min(800px, 100%)",
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedElement(null);
                }
              }}
              data-testid="banner-canvas"
            >
              {imageElements.map((img) => (
                <div
                  key={img.id}
                  className={`absolute cursor-move ${selectedElement?.id === img.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                  style={{
                    left: img.x,
                    top: img.y,
                    width: img.width,
                    height: img.height,
                    transform: `rotate(${img.rotation}deg)`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "image", img.id)}
                  data-testid={`image-element-${img.id}`}
                >
                  <img src={img.src} alt="" className="w-full h-full object-cover rounded" />
                </div>
              ))}

              {iconElements.map((icon) => (
                <div
                  key={icon.id}
                  className={`absolute cursor-move select-none ${selectedElement?.id === icon.id ? "ring-2 ring-primary ring-offset-2 rounded" : ""}`}
                  style={{
                    left: icon.x,
                    top: icon.y,
                    fontSize: icon.size,
                    transform: `rotate(${icon.rotation}deg)`,
                    lineHeight: 1,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "icon", icon.id)}
                  data-testid={`icon-element-${icon.id}`}
                >
                  {icon.emoji}
                </div>
              ))}

              {textElements.map((text) => (
                <div
                  key={text.id}
                  className={`absolute cursor-move select-none whitespace-nowrap ${selectedElement?.id === text.id ? "ring-2 ring-primary ring-offset-2 rounded px-1" : ""}`}
                  style={{
                    left: text.x,
                    top: text.y,
                    fontSize: text.fontSize,
                    color: text.color,
                    fontFamily: text.fontFamily,
                    fontWeight: text.bold ? "bold" : "normal",
                    fontStyle: text.italic ? "italic" : "normal",
                    textAlign: text.align,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "text", text.id)}
                  data-testid={`text-element-${text.id}`}
                >
                  {text.text}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Tabs defaultValue="background" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="background" data-testid="tab-background">
                <Palette className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="text" data-testid="tab-text">
                <Type className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="icons" data-testid="tab-icons">
                <Cookie className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="images" data-testid="tab-images">
                <ImageIcon className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="background" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Arka Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useGradient"
                      checked={useGradient}
                      onChange={(e) => setUseGradient(e.target.checked)}
                      className="rounded"
                      data-testid="checkbox-gradient"
                    />
                    <Label htmlFor="useGradient">Degrade Kullan</Label>
                  </div>

                  {!useGradient ? (
                    <div className="space-y-2">
                      <Label>Tek Renk</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-12 h-10 rounded cursor-pointer"
                          data-testid="input-bgcolor"
                        />
                        <Input
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="flex-1"
                          data-testid="input-bgcolor-text"
                        />
                      </div>
                      <div className="grid grid-cols-6 gap-1 mt-2">
                        {PRESET_COLORS.map((preset) => (
                          <button
                            key={preset.name}
                            className="w-8 h-8 rounded border-2 border-transparent hover:border-primary transition-colors"
                            style={{ backgroundColor: preset.color }}
                            onClick={() => setBackgroundColor(preset.color)}
                            title={preset.name}
                            data-testid={`preset-color-${preset.name}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Baslangic</Label>
                          <input
                            type="color"
                            value={gradientFrom}
                            onChange={(e) => setGradientFrom(e.target.value)}
                            className="w-full h-10 rounded cursor-pointer"
                            data-testid="input-gradient-from"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Bitis</Label>
                          <input
                            type="color"
                            value={gradientTo}
                            onChange={(e) => setGradientTo(e.target.value)}
                            className="w-full h-10 rounded cursor-pointer"
                            data-testid="input-gradient-to"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {GRADIENT_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            className="h-8 rounded text-xs text-white font-medium border-2 border-transparent hover:border-primary"
                            style={{ background: `linear-gradient(to right, ${preset.from}, ${preset.to})` }}
                            onClick={() => {
                              setGradientFrom(preset.from);
                              setGradientTo(preset.to);
                            }}
                            data-testid={`preset-gradient-${preset.name}`}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Metin
                    <Button size="sm" onClick={addTextElement} data-testid="button-add-text">
                      <Plus className="h-4 w-4 mr-1" />
                      Ekle
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedText && (
                    <>
                      <div>
                        <Label className="text-xs">Metin</Label>
                        <Textarea
                          value={selectedText.text}
                          onChange={(e) => updateTextElement(selectedText.id, { text: e.target.value })}
                          className="mt-1"
                          data-testid="input-text-content"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Font Boyutu</Label>
                          <Slider
                            value={[selectedText.fontSize]}
                            onValueChange={([v]) => updateTextElement(selectedText.id, { fontSize: v })}
                            min={12}
                            max={72}
                            step={1}
                            className="mt-2"
                            data-testid="slider-font-size"
                          />
                          <span className="text-xs text-muted-foreground">{selectedText.fontSize}px</span>
                        </div>
                        <div>
                          <Label className="text-xs">Renk</Label>
                          <input
                            type="color"
                            value={selectedText.color}
                            onChange={(e) => updateTextElement(selectedText.id, { color: e.target.value })}
                            className="w-full h-8 rounded cursor-pointer mt-1"
                            data-testid="input-text-color"
                          />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={selectedText.bold ? "default" : "outline"}
                          onClick={() => updateTextElement(selectedText.id, { bold: !selectedText.bold })}
                          data-testid="button-text-bold"
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedText.italic ? "default" : "outline"}
                          onClick={() => updateTextElement(selectedText.id, { italic: !selectedText.italic })}
                          data-testid="button-text-italic"
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={deleteSelectedElement}
                          data-testid="button-delete-text"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                  {!selectedText && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Bir metin secin veya yeni metin ekleyin
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="icons" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">İkon Galerisi ({DONUT_ICONS.length} ikon)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {Object.entries(ICON_CATEGORIES).map(([catKey, category]) => (
                        <div key={catKey}>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">{category.name}</h4>
                          <div className="grid grid-cols-5 gap-1">
                            {category.icons.map((icon) => (
                              <button
                                key={icon.id}
                                className="p-2 rounded-lg border border-muted hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center gap-0.5"
                                onClick={() => addIconElement(icon.id, icon.emoji)}
                                title={icon.name}
                                data-testid={`icon-${icon.id}`}
                              >
                                <span className="text-xl">{icon.emoji}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectedIcon && (
                    <div className="mt-4 space-y-3 pt-4 border-t">
                      <div>
                        <Label className="text-xs">Boyut: {selectedIcon.size}px</Label>
                        <Slider
                          value={[selectedIcon.size]}
                          onValueChange={([v]) => updateIconElement(selectedIcon.id, { size: v })}
                          min={16}
                          max={128}
                          step={4}
                          className="mt-2"
                          data-testid="slider-icon-size"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Dondurme: {selectedIcon.rotation}°</Label>
                        <Slider
                          value={[selectedIcon.rotation]}
                          onValueChange={([v]) => updateIconElement(selectedIcon.id, { rotation: v })}
                          min={0}
                          max={360}
                          step={15}
                          className="mt-2"
                          data-testid="slider-icon-rotation"
                        />
                      </div>
                      <Button size="sm" variant="destructive" onClick={deleteSelectedElement} className="w-full" data-testid="button-delete-icon">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Ikonu Sil
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="images" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fotograf Ekle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="input-image-upload"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-image"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Fotograf Yukle
                  </Button>

                  {selectedImage && (
                    <div className="space-y-3 pt-4 border-t">
                      <div>
                        <Label className="text-xs">Genislik: {selectedImage.width}px</Label>
                        <Slider
                          value={[selectedImage.width]}
                          onValueChange={([v]) => updateImageElement(selectedImage.id, { width: v })}
                          min={50}
                          max={400}
                          step={10}
                          className="mt-2"
                          data-testid="slider-image-width"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Yukseklik: {selectedImage.height}px</Label>
                        <Slider
                          value={[selectedImage.height]}
                          onValueChange={([v]) => updateImageElement(selectedImage.id, { height: v })}
                          min={50}
                          max={400}
                          step={10}
                          className="mt-2"
                          data-testid="slider-image-height"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Dondurme: {selectedImage.rotation}°</Label>
                        <Slider
                          value={[selectedImage.rotation]}
                          onValueChange={([v]) => updateImageElement(selectedImage.id, { rotation: v })}
                          min={0}
                          max={360}
                          step={15}
                          className="mt-2"
                          data-testid="slider-image-rotation"
                        />
                      </div>
                      <Button size="sm" variant="destructive" onClick={deleteSelectedElement} className="w-full" data-testid="button-delete-image">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Fotografi Sil
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Banner'ı Duyuru Olarak Yayınla</DialogTitle>
            <DialogDescription>
              Bu banner otomatik olarak duyurular paneline eklenecektir.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Duyuru Başlığı *</Label>
              <Input 
                placeholder="Duyuru başlığı girin..."
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                data-testid="input-publish-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea 
                placeholder="Duyuru açıklaması (opsiyonel)..."
                value={publishMessage}
                onChange={(e) => setPublishMessage(e.target.value)}
                rows={3}
                data-testid="input-publish-message"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={publishCategory} onValueChange={setPublishCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Öncelik</Label>
                <Select value={publishPriority} onValueChange={setPublishPriority}>
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

            <div className="flex items-center justify-between">
              <Label>Dashboard'da Göster</Label>
              <Switch 
                checked={showOnDashboard} 
                onCheckedChange={setShowOnDashboard}
                data-testid="switch-dashboard"
              />
            </div>

            <div className="space-y-2">
              <Label>Hedef Roller (boş = herkes)</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(role => (
                  <label key={role.value} className="flex items-center gap-2 text-sm">
                    <Checkbox 
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    {role.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hedef Şubeler (boş = tüm şubeler)</Label>
              <ScrollArea className="h-32 border rounded-md p-2">
                {branches?.map(branch => (
                  <label key={branch.id} className="flex items-center gap-2 text-sm py-1">
                    <Checkbox 
                      checked={selectedBranches.includes(branch.id)}
                      onCheckedChange={() => toggleBranch(branch.id)}
                    />
                    {branch.name}
                  </label>
                ))}
                {!branches?.length && (
                  <p className="text-sm text-muted-foreground">Şube bulunamadı</p>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handlePublish} 
              disabled={publishMutation.isPending || !publishTitle.trim()}
              data-testid="button-confirm-publish"
            >
              {publishMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yayınlanıyor...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Yayınla
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
