import Link from "next/link";

interface SiteLogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
    animate?: boolean;
    asLink?: boolean;
}

const heightClasses = {
    sm: "h-[20px] w-auto",
    md: "h-[22px] w-auto",
    lg: "h-[32px] w-auto",
    xl: "h-[48px] w-auto",
};

export function SiteLogo({
    size = "md",
    className = "",
    animate = false,
    asLink = false,
}: SiteLogoProps) {
    const landingHref = "/";
    const sizeClasses = {
        sm: "text-xl",
        md: "text-2xl",
        lg: "text-4xl",
        xl: "text-6xl",
    };

    const logo = (
        <h1
            className={`flex items-center gap-1.5 ${sizeClasses[size]} font-light font-serif ${
                animate ? "sidebar-fade-in" : ""
            } ${className}`}
        >
            <img
                src="/logo/flame-black.svg"
                alt="Iroh"
                className={heightClasses[size]}
            />
            <span>Iroh</span>
        </h1>
    );

    if (asLink) {
        return (
            <Link
                href={landingHref}
                className="cursor-pointer hover:opacity-80 transition-opacity"
            >
                {logo}
            </Link>
        );
    }

    return logo;
}
