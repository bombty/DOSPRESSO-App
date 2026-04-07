import { useState } from "react";
import type { CanvasBackground, BackgroundType, GradientDirection, RadialPosition } from "./hooks/useCanvas";
import { GRADIENT_PRESETS, GRADIENT_CATEGORIES, SOLID_COLORS, PATTERN_PRESETS } from "./GradientPresets";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BackgroundPanelProps {
  background: CanvasBackground;
  onChange: (bg: CanvasBackground) => void;
}

const BG_TYPES: { key: BackgroundType; label: string }[] = [
  { key: "solid", label: "Düz Renk" },
  { key: "linear", label: "Gradient" },
  { key: "radial", label: "Radyal" },
  { key: "pattern", label: "Desenli" },
];

const DIRECTIONS: { key: GradientDirection; icon: string }[] = [
  { key: "to-r", icon: "→" },
  { key: "to-l", icon: "←" },
  { key: "to-b", icon: "↓" },
  { key: "to-t", icon: "↑" },
  { key: "to-br", icon: "↘" },
  { key: "to-bl", icon: "↙" },
];

const RADIAL_POSITIONS: { key: RadialPosition; label: string }[] = [
  { key: "center", label: "Merkez" },
  { key: "top-left", label: "Sol Üst" },
  { key: "top-right", label: "Sağ Üst" },
  { key: "bottom-left", label: "Sol Alt" },
  { key: "bottom-right", label: "Sağ Alt" },
];

export function BackgroundPanel({ background, onChange }: BackgroundPanelProps) {
  const [gradientCategory, setGradientCategory] = useState<string>("signature");

  const update = (patch: Partial<CanvasBackground>) => {
    onChange({ ...background, ...patch });
  };

  const filteredGradients = GRADIENT_PRESETS.filter((g) => g.category === gradientCategory);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Type Selector */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Arka Plan Tipi</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {BG_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => update({ type: t.key })}
                className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  background.type === t.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Solid Color */}
        {background.type === "solid" && (
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Renk Seçin</Label>
            <div className="grid grid-cols-6 gap-2">
              {SOLID_COLORS.map((c) => (
                <button
                  key={c.color}
                  onClick={() => update({ solidColor: c.color })}
                  className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                    background.solidColor === c.color ? "border-primary scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={background.solidColor}
                onChange={(e) => update({ solidColor: e.target.value })}
                className="w-10 h-8 p-0 border-0 cursor-pointer"
              />
              <Input
                type="text"
                value={background.solidColor}
                onChange={(e) => update({ solidColor: e.target.value })}
                className="h-8 text-xs font-mono"
                placeholder="#000000"
              />
            </div>
          </div>
        )}

        {/* Gradient Presets */}
        {(background.type === "linear" || background.type === "radial" || background.type === "pattern") && (
          <div className="space-y-3">
            {/* Category tabs */}
            <div className="flex gap-1">
              {GRADIENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setGradientCategory(cat.key)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    gradientCategory === cat.key
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Gradient swatches */}
            <div className="grid grid-cols-2 gap-2">
              {filteredGradients.map((g) => (
                <button
                  key={g.id}
                  onClick={() => update({ gradientFrom: g.from, gradientTo: g.to })}
                  className={`relative h-12 rounded-lg overflow-hidden transition-all hover:scale-105 ${
                    background.gradientFrom === g.from && background.gradientTo === g.to
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : "ring-1 ring-white/10"
                  }`}
                  style={{
                    background: `linear-gradient(to right, ${g.from}, ${g.to})`,
                  }}
                >
                  <span className="absolute bottom-0.5 left-1.5 text-[9px] font-medium text-white drop-shadow-md">
                    {g.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom color pickers */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">Başlangıç</Label>
                <div className="flex gap-1">
                  <Input
                    type="color"
                    value={background.gradientFrom}
                    onChange={(e) => update({ gradientFrom: e.target.value })}
                    className="w-8 h-7 p-0 border-0 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={background.gradientFrom}
                    onChange={(e) => update({ gradientFrom: e.target.value })}
                    className="h-7 text-[10px] font-mono"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">Bitiş</Label>
                <div className="flex gap-1">
                  <Input
                    type="color"
                    value={background.gradientTo}
                    onChange={(e) => update({ gradientTo: e.target.value })}
                    className="w-8 h-7 p-0 border-0 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={background.gradientTo}
                    onChange={(e) => update({ gradientTo: e.target.value })}
                    className="h-7 text-[10px] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Direction (linear & pattern) */}
            {(background.type === "linear" || background.type === "pattern") && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Yön</Label>
                <div className="flex gap-1.5">
                  {DIRECTIONS.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => update({ gradientDirection: d.key })}
                      className={`w-8 h-8 rounded-md text-sm font-bold flex items-center justify-center transition-colors ${
                        background.gradientDirection === d.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {d.icon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Radial position */}
            {background.type === "radial" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Merkez Noktası</Label>
                <div className="grid grid-cols-3 gap-1">
                  {RADIAL_POSITIONS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => update({ radialPosition: p.key })}
                      className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${
                        background.radialPosition === p.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pattern overlay */}
            {background.type === "pattern" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Desen</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PATTERN_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => update({ patternId: p.id })}
                      className={`px-2 py-1.5 rounded text-[10px] font-medium transition-colors ${
                        background.patternId === p.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
