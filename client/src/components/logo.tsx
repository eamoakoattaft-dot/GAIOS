import cstemLogoMark from "@/assets/cstem-logo-mark.png";

export function Logo({
  size = 34,
  className = "",
  framed = true,
}: {
  size?: number;
  className?: string;
  framed?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        framed ? "rounded-full bg-[#F7F7F2] ring-1 ring-white/20 shadow-sm" : "",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      <img
        src={cstemLogoMark}
        alt="CSTEM Global logo"
        className="h-[86%] w-[86%] object-contain"
        data-testid="img-cstem-logo"
      />
    </span>
  );
}

export function LogoWordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Logo size={34} />
      {!collapsed && (
        <div className="flex min-w-[142px] flex-col leading-[1.12]">
          <span className="text-[12px] font-bold tracking-[0.03em] text-sidebar-foreground">CSTEM Global</span>
          <span className="mt-0.5 text-[9.5px] font-semibold text-sidebar-foreground/68 tracking-[0.075em] uppercase">
            Grant & IT Operating System
          </span>
        </div>
      )}
    </div>
  );
}
