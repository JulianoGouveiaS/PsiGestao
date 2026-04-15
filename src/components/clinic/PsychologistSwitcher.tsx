import {useState} from "react";
import {useClinicContext} from "@/contexts/ClinicContext";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Check, ChevronDown, Users2, X} from "lucide-react";
import {cn} from "@/lib/utils";

// Mantém a mesma paleta do ClinicAgenda
const PSYCH_COLORS = [
  "hsl(199,89%,38%)",
  "hsl(142,60%,35%)",
  "hsl(270,60%,50%)",
  "hsl(25,90%,48%)",
  "hsl(340,75%,48%)",
  "hsl(180,65%,35%)",
  "hsl(300,60%,45%)",
  "hsl(60,70%,38%)",
];

export function PsychologistSwitcher() {
  const { members, selectedMember, setSelectedMember } = useClinicContext();
  const [open, setOpen] = useState(false);

  // Não renderiza se não houver psicólogas cadastradas
  if (members.length === 0) return null;

  const colorMap = Object.fromEntries(
    members.map((m, i) => [m.psychologist_user_id, PSYCH_COLORS[i % PSYCH_COLORS.length]])
  );

  const selectedName = selectedMember?.profiles?.full_name ?? null;
  const selectedColor = selectedMember
    ? colorMap[selectedMember.psychologist_user_id]
    : null;

  const isFiltered = !!selectedMember;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "flex h-8 items-center gap-2 px-3 text-xs font-medium transition-all",
              isFiltered && "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
            )}
          >
            {isFiltered ? (
              <>
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: selectedColor ?? undefined }}
                />
                <span className="max-w-[120px] truncate">{selectedName}</span>
              </>
            ) : (
              <>
                <Users2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>Todas</span>
                <Badge
                  variant="secondary"
                  className="h-4 min-w-4 px-1.5 text-[0.6rem] leading-none"
                >
                  {members.length}
                </Badge>
              </>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-60 p-1.5"
          align="start"
          sideOffset={6}
        >
          {/* Header do popover */}
          <p className="px-2 pb-1.5 pt-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Visualizando
          </p>

          {/* Opção "Todas" */}
          <button
            onClick={() => { setSelectedMember(null); setOpen(false); }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
              !selectedMember
                ? "bg-primary/10 font-medium text-primary"
                : "text-foreground hover:bg-muted"
            )}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
              <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="flex-1 text-left">Todas as psicólogas</span>
            <Badge variant="secondary" className="text-xs">
              {members.length}
            </Badge>
            {!selectedMember && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </button>

          <Separator className="my-1.5" />

          {/* Lista de psicólogas */}
          <div className="space-y-0.5">
            {members.map((m, i) => {
              const name = m.profiles?.full_name ?? "Psicóloga";
              const initials = name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const color = PSYCH_COLORS[i % PSYCH_COLORS.length];
              const isSelected = selectedMember?.id === m.id;

              return (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMember(m); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isSelected
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback
                      className="text-[0.6rem] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-left">{name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Botão de limpar filtro rápido – aparece quando uma psicóloga está selecionada */}
      {isFiltered && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Limpar filtro"
          onClick={() => setSelectedMember(null)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

