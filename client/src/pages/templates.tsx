import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard } from "@/components/ui-bits";
import { TEMPLATES } from "@/lib/data";
import { FileText, Search, Download } from "lucide-react";

const CATEGORIES = ["All", "Lifecycle", "Donor", "Governance", "Finance", "Personnel", "Partnerships", "IT", "Training"];

export default function Templates() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(
    () =>
      TEMPLATES.filter((t) => {
        const mq = !q || t.name.toLowerCase().includes(q.toLowerCase());
        const mc = cat === "All" || t.category === cat;
        return mq && mc;
      }),
    [q, cat],
  );

  return (
    <>
      <PageHeader
        title="Forms & Templates"
        subtitle="Institutional template library. Filter by category or search by name."
        actions={
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-template-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search templates…"
                className="h-8 w-64 pl-7 pr-2 rounded-md bg-secondary border border-border text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5 mb-5" data-testid="template-category-tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            data-testid={`tab-category-${c.toLowerCase()}`}
            onClick={() => setCat(c)}
            className={
              "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors " +
              (cat === c
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground/80 hover:bg-accent")
            }
          >
            {c}
          </button>
        ))}
      </div>

      <SectionCard testid="templates-list" title={`${filtered.length} templates`} subtitle={cat === "All" ? "All categories" : `Category: ${cat}`}>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2" role="list">
          {filtered.map((t) => (
            <li
              key={t.name}
              data-testid={`template-${t.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className="flex items-center gap-3 rounded-md border border-border bg-background p-3 hover:border-primary/40 transition-colors"
            >
              <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-foreground truncate">{t.name}</div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{t.category}</div>
              </div>
              <button
                data-testid={`template-download-${t.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                aria-label={`Download ${t.name}`}
                className="size-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center justify-center"
              >
                <Download size={13} />
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="col-span-full py-8 text-center text-[12px] text-muted-foreground">
              No templates match your filter.
            </li>
          )}
        </ul>
      </SectionCard>
    </>
  );
}
