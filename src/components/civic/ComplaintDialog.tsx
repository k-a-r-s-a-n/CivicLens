import { useState, useRef, useEffect, useMemo } from "react";
import { Crosshair, Camera, AlertTriangle, CheckCircle2, Loader2, Info } from "lucide-react";
import ExifReader from "exifreader";
import { uploadComplaintPhoto } from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CATEGORY_TREE, type Complaint } from "@/data/civic";
import { wardFor } from "@/lib/gccWards";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  picked: { lat: number; lng: number } | null;
  onRequestPick: () => void;
  onSubmit: (
    c: Omit<Complaint, "id" | "upvotes" | "date" | "status"> & {
      imageUrl?: string | undefined;
    },
  ) => void;
};

const MAX_ALLOWED_DISTANCE_METERS = 1000;

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const rad1 = (lat1 * Math.PI) / 180;
  const rad2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad1) * Math.cos(rad2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function ComplaintDialog({
  open,
  onOpenChange,
  picked,
  onRequestPick,
  onSubmit,
}: Props) {
  const [category, setCategory] = useState<string>(CATEGORIES[0] ?? "Roads & Footpaths");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subType, setSubType] = useState("");
  const [landmark, setLandmark] = useState("");
  const [reporter, setReporter] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedLabel, setDetectedLabel] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [locationTrust, setLocationTrust] = useState<"verified_gps" | "self_reported">(
    "self_reported",
  );
  const [photoGps, setPhotoGps] = useState<{ lat: number; lng: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pickedWard = useMemo(
    () => (picked ? wardFor(picked.lat, picked.lng) : null),
    [picked],
  );

  const subTypes = CATEGORY_TREE[category];

  const canSubmit =
    title.trim().length >= 3 &&
    title.trim().length <= 200 &&
    description.trim().length >= 5 &&
    description.trim().length <= 2000 &&
    landmark.trim().length <= 300 &&
    !!picked &&
    photoAttached &&
    !verificationError &&
    !isAnalyzing &&
    !isSubmitting;

  useEffect(() => {
    if (photoGps && picked) {
      const distance = calculateDistanceMeters(
        picked.lat,
        picked.lng,
        photoGps.lat,
        photoGps.lng,
      );
      if (distance > MAX_ALLOWED_DISTANCE_METERS) {
        setVerificationError(
          `Location Mismatch: Photo GPS is ${distance}m away from map pin (max allowed: ${MAX_ALLOWED_DISTANCE_METERS}m).`,
        );
      } else {
        setVerificationError(null);
      }
    }
  }, [picked, photoGps]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Failed to read file"));
          return;
        }
        const b64 = result.split(",")[1];
        if (!b64) {
          reject(new Error("Invalid data URL"));
          return;
        }
        resolve(b64);
      };
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(file);
    });

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerificationError(null);
    setPhotoGps(null);
    setPhotoAttached(false);
    setSelectedFile(file);
    setIsAnalyzing(true);

    try {
      if (!picked) {
        throw new Error("Please select a location on the map first.");
      }

      let hasGps = false;
      let gpsDistance = 0;

      try {
        const tags = await ExifReader.load(file, { expanded: true });
        const imgLat = tags.gps?.Latitude;
        const imgLng = tags.gps?.Longitude;

        if (imgLat !== undefined && imgLng !== undefined) {
          hasGps = true;
          setPhotoGps({ lat: imgLat, lng: imgLng });
          gpsDistance = calculateDistanceMeters(picked.lat, picked.lng, imgLat, imgLng);

          if (gpsDistance > MAX_ALLOWED_DISTANCE_METERS) {
            throw new Error(
              `Location Mismatch: Photo was taken ${gpsDistance}m away from map pin.`,
            );
          }
          setLocationTrust("verified_gps");
        } else {
          setLocationTrust("self_reported");
        }
      } catch (exifErr: unknown) {
        const msg = exifErr instanceof Error ? exifErr.message : String(exifErr);
        if (msg.includes("Location Mismatch")) throw exifErr;
        setLocationTrust("self_reported");
      }

      const base64Data = await fileToBase64(file);
      const allowedCategoriesList = CATEGORIES.join(", ");
      const promptText = `Analyze this image for a civic complaint reporting platform.

Determine if the photo clearly depicts a public civic issue or defect.
STRICT REJECTION:
- Selfies, faces, group of people, indoor private space, document, text screenshot, meme = INVALID.

Return JSON ONLY:
{
  "isCivicIssue": boolean,
  "invalidReason": "reason if invalid",
  "category": "Exact category string from allowed list or null",
  "summary": "3-4 word title"
}
Allowed categories: [${allowedCategoriesList}]`;

      const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
      const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/classify-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
          "x-fingerprint": "browser-user",
        },
        body: JSON.stringify({
          imageData: base64Data,
          mimeType: file.type || "image/jpeg",
          promptText,
          categories: allowedCategoriesList,
        }),
      });

      if (response.status === 429) {
        throw new Error("Rate limit reached. Please wait 1 minute before retrying.");
      }

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || `AI Service Error (${response.status})`);
      }

      const aiResult = (await response.json()) as { result?: string | object };
      const parsed =
        typeof aiResult.result === "string"
          ? (JSON.parse(aiResult.result) as {
            isCivicIssue?: boolean;
            invalidReason?: string;
            category?: string | null;
            summary?: string | null;
          })
          : (aiResult.result as {
            isCivicIssue?: boolean;
            invalidReason?: string;
            category?: string | null;
            summary?: string | null;
          });

      if (!parsed?.isCivicIssue) {
        throw new Error(parsed?.invalidReason || "No civic issue detected in photo.");
      }

      setPhotoAttached(true);

      const aiCategoryStr = (parsed.category || "").toLowerCase();
      let matchedCategory = CATEGORIES.find((c) => c.toLowerCase() === aiCategoryStr);

      if (!matchedCategory) {
        matchedCategory = CATEGORIES.find((c) => {
          const lowerC = c.toLowerCase();
          return (
            (aiCategoryStr.includes("water") && lowerC.includes("water")) ||
            (aiCategoryStr.includes("garbage") && lowerC.includes("garbage")) ||
            (aiCategoryStr.includes("trash") && lowerC.includes("garbage")) ||
            (aiCategoryStr.includes("street") && lowerC.includes("street")) ||
            (aiCategoryStr.includes("light") && lowerC.includes("street")) ||
            (aiCategoryStr.includes("tree") && lowerC.includes("park")) ||
            (aiCategoryStr.includes("park") && lowerC.includes("park")) ||
            (aiCategoryStr.includes("road") && lowerC.includes("road")) ||
            (aiCategoryStr.includes("pothole") && lowerC.includes("road")) ||
            (aiCategoryStr.includes("footpath") && lowerC.includes("footpath"))
          );
        });
      }

      if (matchedCategory) {
        setCategory(matchedCategory);
        setSubType("");
        if (!title) setTitle(parsed.summary || `Reported ${matchedCategory} issue`);
      }

      if (hasGps) {
        setDetectedLabel(`Location: Verified from photo GPS (${gpsDistance}m match)`);
      } else {
        setDetectedLabel("Location: Self-reported by citizen (No photo GPS found)");
      }
    } catch (err: unknown) {
      console.error("❌ Photo Verification:", err);
      const message = err instanceof Error ? err.message : "Failed photo verification.";
      setVerificationError(message);
      setPhotoAttached(false);
      setSelectedFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  async function submit() {
    if (!picked || !canSubmit) return;

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;
      if (selectedFile) {
        imageUrl = await uploadComplaintPhoto(selectedFile, "before");
      }

      // Build payload without explicit `undefined` optional keys (exactOptionalPropertyTypes)
      const payload: Omit<Complaint, "id" | "upvotes" | "date" | "status"> & {
        imageUrl?: string | undefined;
      } = {
        title: title.trim(),
        description: description.trim(),
        category,
        area: pickedWard?.name ?? "Chennai",
        lat: picked.lat,
        lng: picked.lng,
        reporter: reporter.trim() || "Anonymous",
        locationTrust,
      };

      if (subType.trim()) payload.subType = subType.trim();
      if (landmark.trim()) payload.landmark = landmark.trim();
      if (imageUrl) payload.imageUrl = imageUrl;

      onSubmit(payload);

      setTitle("");
      setDescription("");
      setSubType("");
      setLandmark("");
      setReporter("");
      setPhotoAttached(false);
      setSelectedFile(null);
      setVerificationError(null);
      setCategory(CATEGORIES[0] ?? "Roads & Footpaths");
      setDetectedLabel("");
      setLocationTrust("self_reported");
      setPhotoGps(null);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("❌ Submit Error:", err);
      const message = err instanceof Error ? err.message : "Failed to submit. Please try again.";
      setVerificationError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] gap-4 overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display">File a complaint</DialogTitle>
          <DialogDescription>
            Every report is public. Attach a clear photo of the issue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                {picked ? (
                  <>
                    {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
                    {pickedWard ? (
                      <span className="ml-2 font-sans font-medium text-foreground">
                        · {pickedWard.name} · Zone {pickedWard.zone} {pickedWard.zoneName}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "No location selected"
                )}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 gap-1.5 text-xs"
                onClick={onRequestPick}
              >
                <Crosshair className="size-3.5" />
                Pick on map
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setSubType("");
              }}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[10005]">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subTypes && subTypes.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="sub-type">Sub-Type (optional)</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger id="sub-type" className="w-full">
                  <SelectValue placeholder="Select specific issue" />
                </SelectTrigger>
                <SelectContent className="z-[10005]">
                  {subTypes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Water leak near bus stop"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={4}
              placeholder="What's wrong, how long has it been like this?"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="landmark">Landmark / Specific location (optional)</Label>
            <Input
              id="landmark"
              placeholder="e.g. Near HDFC ATM, opposite temple"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value.slice(0, 300))}
              maxLength={300}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Photo Evidence (Mandatory)</Label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
            />
            <button
              type="button"
              className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${verificationError
                  ? "border-destructive/60 bg-destructive/10"
                  : photoAttached
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-border bg-muted/40"
                }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {verificationError ? (
                <AlertTriangle className="size-6 text-destructive" />
              ) : photoAttached ? (
                <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Camera className="size-6 text-muted-foreground" />
              )}

              <span className="text-xs font-medium text-foreground">
                {isAnalyzing
                  ? "Checking photo & AI plausibility..."
                  : verificationError
                    ? "Photo Rejected - Click to try another photo"
                    : photoAttached
                      ? "Photo Attached & Checked (Click to change)"
                      : "Take photo or upload file"}
              </span>

              <span
                className={`text-[11px] ${verificationError ? "font-medium text-destructive" : "text-muted-foreground"
                  }`}
              >
                {isAnalyzing
                  ? "Analyzing image defect..."
                  : verificationError
                    ? verificationError
                    : photoAttached
                      ? detectedLabel
                      : "Camera photos preserve GPS metadata automatically"}
              </span>
            </button>

            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3 shrink-0" />
              <span>
                Photos are analyzed by AI for plausibility. Photos with embedded GPS are marked as
                Verified; photos without GPS are accepted as Self-Reported.
              </span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Your name (optional)</Label>
            <Input
              id="name"
              placeholder="Leave blank to stay anonymous"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full gap-2" disabled={!canSubmit} onClick={submit}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? "Uploading Photo & Submitting..." : "Submit complaint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}