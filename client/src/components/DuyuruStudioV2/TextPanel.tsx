import { useEffect } from "react";
import type { TextElement } from "./hooks/useCanvas";
import { FONT_OPTIONS, loadGoogleFont } from "./GradientPresets";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
} from "lucide-react";

interface TextPanelProps {
  selectedText: TextElement | null;
  onAddText: () => void;
  onUpdateText: (id: string, updates: Partial<TextElement>) => void;
  onDelete: () => void;
  hasSelection: boolean;
}

const TEXT_COLORS = [
  "#ffffff", "#000000", "#d4a574", "#ffd700",
  "#cc1f1f", "#87ceeb", "#98d4bb", "#ffccd5",
  "#f5e6d3", "#1a0f0a", "#192838", "#999999",
];

export function TextPanel({ selectedText, onAddText, onUpdateText, onDelete, hasSelection }: TextPanelProps) {
  // Load fonts on mount
  useEffect(() => {
    FONT_OPTIONS.forEach((f) => loadGoogleFont(f.googleFontName));
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Add Text Button */}
        <Button
          onClick={onAddText}
          variant="outline"
          size="sm"
          className="w-full gap-2"
          data-testid="btn-add-text"
        >
          <Plus className="h-4 w-4" />
          Metin Ekle
        </Button>

        {/* No selection info */}
        {!selectedText && (
          <div className="text-center py-6 text-muted-foreground">
            <Type className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">
              {hasSelection
                ? "Seçili öğe metin değil"
                : "Canvas'ta bir metin seçin veya yeni ekleyin"}
            </p>
          </div>
        )}

        {/* Text Editor */}
        {selectedText && (
          <div className="space-y-3">
            {/* Text content */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Metin İçeriği</Label>
              <Textarea
                value={selectedText.text}
                onChange={(e) => onUpdateText(selectedText.id, { text: e.target.value })}
                className="min-h-[60px] text-sm resize-none"
                placeholder="Metin girin..."
                data-testid="input-text-content"
              />
            </div>

            {/* Font Family */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Yazı Tipi</Label>
              <Select
                value={selectedText.fontFamily}
                onValueChange={(v) => onUpdateText(selectedText.id, { fontFamily: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <span style={{ fontFamily: f.value }}>{f.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Boyut</Label>
                <span className="text-[10px] text-muted-foreground font-mono">{selectedText.fontSize}px</span>
              </div>
              <Slider
                value={[selectedText.fontSize]}
                onValueChange={([v]) => onUpdateText(selectedText.id, { fontSize: v })}
                min={10}
                max={72}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Bold / Italic / Alignment */}
            <div className="flex gap-1.5">
              <button
                onClick={() =>
                  onUpdateText(selectedText.id, {
                    fontWeight: selectedText.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  selectedText.fontWeight === "bold"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                }`}
                title="Kalın"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() =>
                  onUpdateText(selectedText.id, {
                    fontStyle: selectedText.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  selectedText.fontStyle === "italic"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                }`}
                title="İtalik"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <div className="w-px bg-border mx-0.5" />
              {(["left", "center", "right"] as const).map((align) => {
                const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                return (
                  <button
                    key={align}
                    onClick={() => onUpdateText(selectedText.id, { textAlign: align })}
                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                      selectedText.textAlign === align
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground"
                    }`}
                    title={align === "left" ? "Sola" : align === "center" ? "Ortala" : "Sağa"}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Text Color */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Renk</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onUpdateText(selectedText.id, { color: c })}
                    className={`w-7 h-7 rounded-md border transition-transform hover:scale-110 ${
                      selectedText.color === c ? "ring-2 ring-primary scale-110" : ""
                    }`}
                    style={{
                      backgroundColor: c,
                      borderColor: c === "#ffffff" ? "#e0e0e0" : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={selectedText.color}
                  onChange={(e) => onUpdateText(selectedText.id, { color: e.target.value })}
                  className="w-8 h-7 p-0 border-0 cursor-pointer"
                />
                <Input
                  type="text"
                  value={selectedText.color}
                  onChange={(e) => onUpdateText(selectedText.id, { color: e.target.value })}
                  className="h-7 text-[10px] font-mono"
                />
              </div>
            </div>

            {/* Max Width */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Genişlik</Label>
                <span className="text-[10px] text-muted-foreground font-mono">{selectedText.maxWidth}px</span>
              </div>
              <Slider
                value={[selectedText.maxWidth]}
                onValueChange={([v]) => onUpdateText(selectedText.id, { maxWidth: v })}
                min={100}
                max={800}
                step={10}
              />
            </div>

            {/* Text Shadow */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Metin Gölgesi</Label>
              <Switch
                checked={selectedText.textShadow}
                onCheckedChange={(v) => onUpdateText(selectedText.id, { textShadow: v })}
              />
            </div>

            {/* Delete */}
            <Button
              onClick={onDelete}
              variant="destructive"
              size="sm"
              className="w-full gap-2 mt-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Metni Sil
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
