import { SiteLogo } from "@/components/shared/site-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
      <div className="absolute inset-0 bg-radial-fade" aria-hidden />
      <div className="relative z-10 mb-8">
        <SiteLogo />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
