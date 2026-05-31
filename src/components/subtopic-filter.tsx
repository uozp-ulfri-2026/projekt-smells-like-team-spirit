import { Layers3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSubtopicStyle } from "@/lib/subtopics";

export interface SubtopicOption {
  count: number;
  subtopic: string;
}

interface SubtopicFilterProps {
  onSelectedSubtopicsChange: (subtopics: string[]) => void;
  options: SubtopicOption[];
  selectedSubtopics: string[];
}

export function SubtopicFilter({
  onSelectedSubtopicsChange,
  options,
  selectedSubtopics,
}: SubtopicFilterProps) {
  const selected = new Set(selectedSubtopics);

  const handleToggle = (subtopic: string) => {
    const nextSelected = new Set(selected);
    if (nextSelected.has(subtopic)) {
      nextSelected.delete(subtopic);
    } else {
      nextSelected.add(subtopic);
    }
    onSelectedSubtopicsChange(Array.from(nextSelected));
  };

  return (
    <details className="group border bg-background" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-xs [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-1.5">
          <Layers3 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">Podteme</span>
        </span>
        <span className="truncate text-muted-foreground">
          {selected.size === 0 ? "Vse" : `Izbrane: ${selected.size}`}
        </span>
      </summary>

      <div className="space-y-2 border-t p-2">
        <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
          {options.map(({ subtopic }) => {
            const style = getSubtopicStyle(subtopic);
            const isSelected = selected.has(subtopic);

            return (
              <button
                aria-pressed={isSelected}
                className="inline-flex items-center gap-1 border px-1.5 py-1 text-[11px] transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10"
                key={subtopic}
                onClick={() => handleToggle(subtopic)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: style.color }}
                />
                <span>{style.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground">
            Barve pik prikazujejo podteme.
          </span>
          {selected.size > 0 && (
            <Button
              className="h-auto shrink-0 gap-1 p-0 text-[11px]"
              onClick={() => onSelectedSubtopicsChange([])}
              size="sm"
              type="button"
              variant="link"
            >
              <RotateCcw className="size-3" />
              Počisti
            </Button>
          )}
        </div>
      </div>
    </details>
  );
}
