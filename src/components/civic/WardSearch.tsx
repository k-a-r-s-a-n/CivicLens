import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import wardsJson from "@/data/gcc-wards.json";
import { Search } from "lucide-react";

type Ward = {
  properties: {
    ward: number;
    name?: string;
    zone_name?: string;
    bbox?: {
      south: number;
      north: number;
      west: number;
      east: number;
    };
  };
};

interface WardSearchProps {
  onSelectWard: (wardId: number) => void;
}

export default function WardSearch({ onSelectWard }: WardSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const wards: Ward[] = useMemo(() => (wardsJson as any).features ?? [], []);

  const filtered = useMemo(() => {
    if (!query) return [];
    const lower = query.toLowerCase();
    return wards.filter((w) => {
      const wardNum = w.properties?.ward?.toString() ?? "";
      const name = w.properties?.name?.toLowerCase() ?? "";
      const zone = w.properties?.zone_name?.toLowerCase() ?? "";
      return (
        wardNum.includes(lower) ||
        name.includes(lower) ||
        zone.includes(lower) ||
        `${wardNum}`.includes(lower)
      );
    }).slice(0, 10);
  }, [query, wards]);

  const handleSelect = useCallback(
    (wardId: number) => {
      onSelectWard(wardId);
      setQuery("");
      setOpen(false);
    },
    [onSelectWard]
  );

  return (
    <div className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search ward or zone..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(!!e.target.value);
          }}
          className="pl-9"
          aria-label="Search wards"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {filtered.map((w) => (
            <li
              key={w.properties.ward}
              className="px-3 py-2 cursor-pointer hover:bg-muted"
              onClick={() => handleSelect(w.properties.ward)}
            >
              {w.properties.name ?? `Ward ${w.properties.ward}`} ({w.properties.zone_name})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
