import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function SiteShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <SiteHeader />
      <main
        className={`relative z-10 mx-auto w-full flex-1 px-5 py-10 ${
          wide ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
