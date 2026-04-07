import { STUDIO_TEMPLATES, type StudioTemplate } from "./GradientPresets";
import type { CanvasBackground, TextElement } from "./hooks/useCanvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface TemplatePanelProps {
  onApplyTemplate: (template: {
    background: Partial<CanvasBackground>;
    texts?: Partial<TextElement>[];
    icons?: string[];
  }) => void;
}

export function TemplatePanel({ onApplyTemplate }: TemplatePanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-1">
        <Label className="text-xs text-muted-foreground block">
          Hazır şablon seçin — canvas içeriği değişir
        </Label>

        <div className="grid grid-cols-1 gap-2">
          {STUDIO_TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} onApply={onApplyTemplate} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function TemplateCard({
  template,
  onApply,
}: {
  template: StudioTemplate;
  onApply: TemplatePanelProps["onApplyTemplate"];
}) {
  const bg = template.background;
  const gradientStyle = bg.gradientFrom && bg.gradientTo
    ? `linear-gradient(to right, ${bg.gradientFrom}, ${bg.gradientTo})`
    : bg.gradientFrom || "#1a0f0a";

  return (
    <button
      onClick={() =>
        onApply({
          background: template.background,
          texts: template.texts,
          icons: template.icons,
        })
      }
      className="group relative rounded-lg overflow-hidden text-left transition-all hover:scale-[1.02] hover:ring-2 hover:ring-primary/50 ring-1 ring-white/10"
      data-testid={`template-${template.id}`}
    >
      {/* Gradient preview */}
      <div
        className="h-16 w-full relative"
        style={{ background: gradientStyle }}
      >
        {/* Template icon overlay */}
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-2xl mr-3 drop-shadow-lg">{template.icon}</span>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold drop-shadow-md truncate">
              {template.name}
            </p>
            <p className="text-white/60 text-[9px] truncate">
              {template.description}
            </p>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors flex items-center justify-center">
          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 px-3 py-1 rounded-full">
            Uygula
          </span>
        </div>
      </div>
    </button>
  );
}
