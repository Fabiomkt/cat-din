import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface ThemePreferences {
  theme_mode: string;
  primary_color: string;
  accent_color: string;
}

interface ThemeContextType {
  preferences: ThemePreferences;
  updatePreferences: (prefs: Partial<ThemePreferences>) => Promise<void>;
  loading: boolean;
}

const defaultPrefs: ThemePreferences = {
  theme_mode: "light",
  primary_color: "#3B82F6",
  accent_color: "#8B5CF6",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToHsl(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return "217 71% 53%";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(prefs: ThemePreferences) {
  const root = document.documentElement;
  if (prefs.theme_mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.setProperty("--primary", hexToHsl(prefs.primary_color));
  root.style.setProperty("--accent", hexToHsl(prefs.accent_color));
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ThemePreferences>(defaultPrefs);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPreferences(defaultPrefs);
      applyTheme(defaultPrefs);
      setLoading(false);
      return;
    }

    const fetchPrefs = async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("theme_mode, primary_color, accent_color")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const prefs = {
          theme_mode: data.theme_mode,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
        };
        setPreferences(prefs);
        applyTheme(prefs);
      }
      setLoading(false);
    };

    fetchPrefs();
  }, [user]);

  const updatePreferences = async (prefs: Partial<ThemePreferences>) => {
    if (!user) return;
    const newPrefs = { ...preferences, ...prefs };
    setPreferences(newPrefs);
    applyTheme(newPrefs);

    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        ...newPrefs,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      setPreferences(preferences);
      applyTheme(preferences);
    }
  };

  return (
    <ThemeContext.Provider value={{ preferences, updatePreferences, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
