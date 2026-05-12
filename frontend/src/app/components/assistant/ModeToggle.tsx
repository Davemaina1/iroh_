"use client";

export type ChatMode = "quick" | "deep" | "draft";

const MODES: { id: ChatMode; label: string; title: string }[] = [
    { id: "quick", label: "Quick", title: "Fast answers — Claude Haiku" },
    { id: "deep", label: "Deep", title: "Thorough analysis — Claude Opus" },
    { id: "draft", label: "Draft", title: "Draft a legal document — Claude Opus" },
];

interface Props {
    value: ChatMode;
    onChange: (mode: ChatMode) => void;
}

export function ModeToggle({ value, onChange }: Props) {
    return (
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
            {MODES.map((m) => (
                <button
                    key={m.id}
                    type="button"
                    title={m.title}
                    onClick={() => onChange(m.id)}
                    className={`px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${
                        value === m.id
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    {m.label}
                </button>
            ))}
        </div>
    );
}
