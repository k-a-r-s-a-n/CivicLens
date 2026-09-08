import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "ta";

const translations = {
  en: {
    liveMap: "Live map",
    wardView: "Ward view",
    about: "About",
    privacy: "Privacy",
    fileIssue: "File an issue",
    theMapRemembers: "The map remembers.",
    everyPinIsAResident: "Every pin is a resident saying: this deserves attention.",
    searchPlace: "Search a place or issue...",
    unresolved: "Unresolved",
    inProgress: "In Progress",
    resolved: "Resolved",
  },
  ta: {
    liveMap: "நேரடி வரைபடம்",
    wardView: "வார்டு பார்வை",
    about: "பற்றி",
    privacy: "தனியுரிமை",
    fileIssue: "புகார் அளிக்கவும்",
    theMapRemembers: "வரைபடம் நினைவில் கொள்கிறது.",
    everyPinIsAResident: "ஒவ்வொரு ஊசியும் ஒரு குடியிருப்பாளர் சொல்கிறார்: இது கவனம் செலுத்த வேண்டியது.",
    searchPlace: "இடம் அல்லது சிக்கலைத் தேடுங்கள்...",
    unresolved: "தீர்க்கப்படாதது",
    inProgress: "செயல்பாட்டில் உள்ளது",
    resolved: "தீர்க்கப்பட்டது",
  },
};

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  const t = (key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key];
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useTranslation must be used within a LanguageProvider");
  return context;
}
