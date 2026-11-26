export type Role = "student" | "worker" | "general";
export type Settings = {
  target: string; // BCP 47 code of the language being learned
  native: string; // first language, "" until the first-visit questions are answered
  voice: "browser";
  voiceName: string; // "" = automatic (best available voice on the device)
  role: Role;
  onboarded: boolean;
};

export const DEFAULTS: Settings = { target: "en-US", native: "", voice: "browser", voiceName: "", role: "general", onboarded: false };

export const TARGETS = [
  { code: "en-US", label: "English (American)" },
  { code: "en-GB", label: "English (British)" },
  { code: "fr-FR", label: "French" },
  { code: "es-ES", label: "Spanish" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
] as const;

export const NATIVES = [
  "French", "Spanish", "German", "Italian", "Portuguese", "Arabic",
  "Chinese (Mandarin)", "Japanese", "Hindi", "Russian", "Vietnamese", "Other",
] as const;

export const ROLES: { value: Role; label: string }[] = [
  { value: "student", label: "A student" },
  { value: "worker", label: "A working professional" },
  { value: "general", label: "Just for myself" },
];

const KEY = "sayit-settings";

export function targetLabel(code: string): string {
  return TARGETS.find((t) => t.code === code)?.label ?? code;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      target: TARGETS.some((t) => t.code === p.target) ? (p.target as string) : DEFAULTS.target,
      native: typeof p.native === "string" ? p.native.slice(0, 40) : "",
      voice: "browser",
      voiceName: typeof p.voiceName === "string" ? p.voiceName.slice(0, 120) : "",
      role: ROLES.some((r) => r.value === p.role) ? (p.role as Role) : "general",
      onboarded: p.onboarded === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage can be blocked; settings then last for the visit only */
  }
}

export function summary(s: Settings): string {
  const role = ROLES.find((r) => r.value === s.role)?.label ?? "";
  return [targetLabel(s.target), s.native ? `from ${s.native}` : "", role].filter(Boolean).join(" · ");
}
