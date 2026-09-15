import Link from "next/link";

type LogoProps = {
  variant?: "light" | "dark";
  showWordmark?: boolean;
  className?: string;
};

/**
 * Temporary text logo placeholder.
 * Swap the inner markup for an <Image> when the real DBA asset is available.
 */
export function Logo({
  variant = "light",
  showWordmark = true,
  className = "",
}: LogoProps) {
  const isLight = variant === "light";

  return (
    <Link
      href="/in-behandeling"
      className={`inline-flex items-center gap-2.5 rounded-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        isLight
          ? "focus-visible:ring-dba-lime/80 focus-visible:ring-offset-dba-dark-green"
          : "focus-visible:ring-dba-dark-green focus-visible:ring-offset-white"
      } ${className}`}
      aria-label="DBA advies"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold tracking-wide ${
          isLight
            ? "bg-white/15 text-white ring-1 ring-white/20"
            : "bg-dba-dark-green text-white"
        }`}
      >
        DBA
      </span>
      {showWordmark ? (
        <span className="flex flex-col leading-tight">
          <span
            className={`text-[15px] font-semibold tracking-wide ${
              isLight ? "text-white" : "text-dba-dark-green"
            }`}
          >
            DBA advies
          </span>
          {isLight ? (
            <span className="text-[11px] font-normal text-white/70">
              Hypotheekdashboard
            </span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
