import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** light = dark sidebar (white plate); dark = light surfaces (login). */
  variant?: "light" | "dark";
  className?: string;
  /** When false, render the mark without a link (e.g. login page). */
  linked?: boolean;
};

const LOGO_SRC = "/branding/dba-logo.jpg";
/** Intrinsic asset size — keep aspect ratio (~3:1). */
const LOGO_WIDTH = 2442;
const LOGO_HEIGHT = 808;

/**
 * Official DBA logo.
 * Sidebar (light): white plate so the JPG reads on dark green.
 * Login/surfaces (dark): logo on the existing light background.
 */
export function Logo({
  variant = "light",
  className = "",
  linked = true,
}: LogoProps) {
  const isSidebar = variant === "light";

  const image = (
    <Image
      src={LOGO_SRC}
      alt="DBA advies"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority
      className="h-auto w-full object-contain"
    />
  );

  const plate = isSidebar ? (
    <span className="block w-full rounded-lg bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      {image}
    </span>
  ) : (
    <span className="block w-full max-w-[220px]">{image}</span>
  );

  if (!linked) {
    return <span className={`inline-block ${className}`}>{plate}</span>;
  }

  return (
    <Link
      href="/in-behandeling"
      className={`inline-block w-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        isSidebar
          ? "focus-visible:ring-dba-lime/80 focus-visible:ring-offset-dba-dark-green"
          : "focus-visible:ring-dba-dark-green focus-visible:ring-offset-white"
      } ${className}`}
      aria-label="DBA advies"
    >
      {plate}
    </Link>
  );
}
