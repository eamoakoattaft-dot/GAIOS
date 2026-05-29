import { PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/ui-bits";
import {
  ACCESS_CATEGORIES,
  ACCESS_GROUPS,
  ACCESS_MATRIX,
  REPOSITORY_FOLDERS,
  SECURITY_CHECKLIST,
  TRAINING_PLATFORMS,
  Permission,
} from "@/lib/data";
import {
  Folder,
  ShieldCheck,
  Users,
  GraduationCap,
  LayoutDashboard,
  Check,
  Eye,
  Lock,
  PenLine,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PERM_STYLE: Record<Permission, string> = {
  Full: "bg-primary/15 text-primary",
  Edit: "bg-[hsl(var(--status-info)/0.16)] text-[hsl(var(--status-info))]",
  View: "bg-secondary text-foreground/70",
  "Module-Only": "bg-[hsl(var(--status-warning)/0.16)] text-[hsl(var(--status-warning))]",
  None: "bg-muted text-muted-foreground/60",
};

const PERM_ICON: Record<Permission, any> = {
  Full: PenLine,
  Edit: PenLine,
  View: Eye,
  "Module-Only": GraduationCap,
  None: Lock,
};

const LAYERS = [
  { icon: Users, name: "User Access Management", note: "9 categories • role-based scopes" },
  { icon: Folder, name: "Document Repository", note: "12 top-level folders" },
  { icon: LayoutDashboard, name: "Grant Tracker Dashboard", note: "8 tracker views" },
  { icon: GraduationCap, name: "Training Platform", note: "LMS + authoring tools" },
  { icon: ShieldCheck, name: "Security & Compliance", note: "MFA, RBAC, audit logs" },
];

export default function ITPage() {
  return (
    <>
      <PageHeader
        title="IT & Digital Infrastructure"
        subtitle="Five layers that hold the operational system together — access, storage, tracking, learning, security."
      />

      {/* Layer overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="layer-grid">
        {LAYERS.map((l) => {
          const Icon = l.icon;
          return (
            <div
              key={l.name}
              data-testid={`layer-${l.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className="rounded-lg border border-card-border bg-card p-4 flex flex-col gap-2"
            >
              <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Icon size={16} />
              </div>
              <div className="text-[12.5px] font-semibold tracking-tight leading-tight">{l.name}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">{l.note}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-3 mt-6">
        {/* User access categories */}
        <SectionCard
          testid="card-access-categories"
          title="User access categories"
          subtitle="Nine groups with distinct role-based scopes"
        >
          <div className="grid grid-cols-2 gap-2">
            {ACCESS_CATEGORIES.map((c) => (
              <div
                key={c}
                data-testid={`access-cat-${c.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-[12px]"
              >
                <Users size={13} className="text-primary shrink-0" />
                <span className="text-foreground/85">{c}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border text-[11.5px] text-muted-foreground space-y-1.5">
            <p><span className="text-foreground font-medium">Volunteers</span> — training modules only.</p>
            <p><span className="text-foreground font-medium">Project staff</span> — assigned project documents only.</p>
            <p><span className="text-foreground font-medium">PIs</span> — proposal & project folders for their work.</p>
            <p><span className="text-foreground font-medium">Finance</span> — budgets & financial records.</p>
            <p><span className="text-foreground font-medium">Executive Director</span> — full institutional access.</p>
            <p><span className="text-foreground font-medium">IT administrator</span> — configuration only.</p>
          </div>
        </SectionCard>

        {/* Repository structure */}
        <SectionCard
          testid="card-repository"
          title="Document repository map"
          subtitle="12 top-level folders form the institutional record"
        >
          <ul className="grid grid-cols-1 gap-1.5" role="list">
            {REPOSITORY_FOLDERS.map((f) => (
              <li
                key={f.name}
                data-testid={`folder-${f.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className="flex items-start gap-2.5 rounded-md border border-border bg-background px-3 py-2"
              >
                <Folder size={14} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-[12.5px] font-medium tracking-tight">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">{f.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Access matrix */}
      <div className="mt-6">
        <SectionCard
          testid="access-matrix-card"
          title="Access matrix"
          subtitle="Role-based access for each resource. Edit / View / Module-Only / None."
        >
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium sticky left-0 bg-card">Resource</th>
                  {ACCESS_GROUPS.map((g) => (
                    <th key={g} className="py-2 px-2 font-medium text-center">
                      {g}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ACCESS_MATRIX.map((row) => (
                  <tr key={row.resource} data-testid={`access-row-${row.resource.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                    <td className="py-2.5 pr-3 font-medium text-foreground sticky left-0 bg-card whitespace-nowrap">
                      {row.resource}
                    </td>
                    {ACCESS_GROUPS.map((g) => {
                      const perm = (row.rights[g] as Permission) ?? "None";
                      const Icon = PERM_ICON[perm];
                      return (
                        <td key={g} className="py-2 px-1 text-center" data-testid={`perm-${row.resource}-${g}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}>
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium", PERM_STYLE[perm])}>
                            <Icon size={10} />
                            {perm}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 mt-6">
        {/* Training Platform */}
        <SectionCard
          testid="card-training-platforms"
          title="Training platform options"
          subtitle="LMS + authoring stack recommendations"
        >
          <ul className="space-y-1.5" role="list">
            {TRAINING_PLATFORMS.map((p) => (
              <li
                key={p.name}
                data-testid={`platform-${p.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5"
              >
                <Layers size={14} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-[12.5px] font-semibold tracking-tight">{p.name}</div>
                  <div className="text-[11.5px] text-muted-foreground leading-snug">{p.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Security checklist */}
        <SectionCard
          testid="card-security-checklist"
          title="Security & compliance checklist"
          subtitle="Controls applied across GAIOS infrastructure"
        >
          <ul className="space-y-1.5" role="list">
            {SECURITY_CHECKLIST.map((s) => (
              <li
                key={s.item}
                data-testid={`security-${s.item.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`}
                className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
              >
                <Check size={14} className="text-[hsl(var(--status-success))] shrink-0" />
                <span className="flex-1 text-[12.5px]">{s.item}</span>
                <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{s.category}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
