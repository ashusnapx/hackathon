import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Phone, Shield } from "lucide-react";
import { PORTAL_INFO } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto text-center">
        {/* Final CTA */}
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Ready to file?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Don&apos;t let a broken portal stop you. We&apos;ll make sure your
            complaint gets filed properly.
          </p>
          <a href="/report">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl group transition-all shadow-lg shadow-primary/20"
            >
              Start Report
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>

        {/* Emergency numbers */}
        <div className="mb-12">
          <Separator className="mb-10" />
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-destructive">
              <Phone className="w-4 h-4" />
              <span className="font-mono font-bold">1930</span>
              <span className="text-muted-foreground">— Cyber Crime</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="font-mono font-bold">181</span>
              <span className="text-muted-foreground">— Women Helpline</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="font-mono font-bold">112</span>
              <span className="text-muted-foreground">— Police</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-8 border-t border-border">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
              <Shield className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm font-medium">CyberComplaint</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Built for the{" "}
            <span className="text-foreground">
              Build What Moves India hackathon
            </span>
            . Not affiliated with any government body. Uses mock data for
            demonstration. Official portal:{" "}
            <a
              href={PORTAL_INFO.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              cybercrime.gov.in
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
