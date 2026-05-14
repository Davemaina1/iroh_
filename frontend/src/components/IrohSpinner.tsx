"use client";

import { Loader2, Check, AlertCircle } from "lucide-react";

export function IrohSpinner({
    spin = false,
    done = false,
    error = false,
    mike = false,
    size = 24,
    style,
}: {
    spin?: boolean;
    done?: boolean;
    error?: boolean;
    mike?: boolean;
    size?: number;
    style?: React.CSSProperties;
}) {
    void mike;

    if (error) {
        return (
            <span
                className="shrink-0 inline-block"
                style={style}
                role="status"
                aria-live="polite"
                aria-label="Error"
            >
                <AlertCircle
                    width={size}
                    height={size}
                    color="#DC2626"
                    style={{ display: "block" }}
                />
            </span>
        );
    }

    if (done) {
        return (
            <span
                className="shrink-0 inline-block"
                style={style}
                role="status"
                aria-live="polite"
                aria-label="Done"
            >
                <Check
                    width={size}
                    height={size}
                    color="#10B981"
                    style={{ display: "block" }}
                />
            </span>
        );
    }

    if (spin) {
        return (
            <span
                className="shrink-0 inline-block"
                style={style}
                role="status"
                aria-live="polite"
                aria-label="Loading"
            >
                <Loader2
                    width={size}
                    height={size}
                    color="#C4A882"
                    className="animate-spin"
                    style={{ display: "block" }}
                />
            </span>
        );
    }

    return (
        <span
            className="shrink-0 inline-block"
            style={style}
            aria-label="Iroh"
        >
            <img
                src="/logo/flame-black.svg"
                alt="Iroh"
                width={size}
                height={size}
                style={{ display: "block" }}
            />
        </span>
    );
}
