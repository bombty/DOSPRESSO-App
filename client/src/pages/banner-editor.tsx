import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Redirect, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Italic
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

const DONUT_ICONS = [
  { id: "donut-classic", emoji: "🍩", name: "Klasik" },
  { id: "donut-choco", emoji: "🍫", name: "Cikolatali" },
  { id: "donut-pink", emoji: "💗", name: "Cilekli" },
  { id: "coffee", emoji: "☕", name: "Kahve" },
  { id: "star", emoji: "⭐", name: "Yildiz" },
  { id: "heart", emoji: "❤️", name: "Kalp" },
  { id: "sparkle", emoji: "✨", name: "Isiltili" },
  { id: "cake", emoji: "🎂", name: "Pasta" },
];

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

export default function BannerEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
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
        <Button onClick={exportAsPNG} className="gap-2" data-testid="button-export-png">
          <Download className="h-4 w-4" />
          PNG Indir
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr,320px] gap-4 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Onizleme (800x400)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasRef}
              className="relative w-full rounded-lg overflow-hidden cursor-crosshair"
              style={{
                ...getBackgroundStyle(),
                aspectRatio: "2/1",
                maxWidth: "800px",
                margin: "0 auto",
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={() => setSelectedElement(null)}
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
                  <CardTitle className="text-sm">Ikon Galerisi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {DONUT_ICONS.map((icon) => (
                      <button
                        key={icon.id}
                        className="p-3 rounded-lg border-2 border-muted hover:border-primary transition-colors flex flex-col items-center gap-1"
                        onClick={() => addIconElement(icon.id, icon.emoji)}
                        data-testid={`icon-${icon.id}`}
                      >
                        <span className="text-2xl">{icon.emoji}</span>
                        <span className="text-xs text-muted-foreground">{icon.name}</span>
                      </button>
                    ))}
                  </div>
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
    </div>
  );
}
