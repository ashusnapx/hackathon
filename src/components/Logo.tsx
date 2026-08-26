import { Shield } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: "w-4 h-4", container: "w-6 h-6", text: "text-xs" },
    md: { icon: "w-5 h-5", container: "w-8 h-8", text: "text-sm" },
    lg: { icon: "w-6 h-6", container: "w-10 h-10", text: "text-base" },
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizes[size].container} rounded-lg bg-primary/10 flex items-center justify-center`}
      >
        <Shield className={`${sizes[size].icon} text-primary`} />
      </div>
      {showText && (
        <span className={`font-semibold ${sizes[size].text} tracking-tight`}>
          CyberComplaint
        </span>
      )}
    </div>
  );
}
