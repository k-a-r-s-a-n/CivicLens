import { useState, useRef, useEffect } from "react";
import { Crosshair, ImagePlus, Lock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import ExifReader from "exifreader";
import { uploadComplaintPhoto } from "@/lib/storage"; // 👈 Adjust import path to your storage utility if needed
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  picked: { lat: number; lng: number } | null;
  onRequestPick: () => void;
  onSubmit: (c: Omit<Complaint, "id" | "upvotes" | "date" | "status"> & { imageUrl?: string }) => void;
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MAX_ALLOWED_DISTANCE_METERS = 1000; // 1 km tolerance

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function ComplaintDialog({ open, onOpenChange, picked, onRequestPick, onSubmit }: Props) {
  const [category, setCategory] = useState<string>(CATEGORIES[0] || "Pothole / Roads");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subType, setSubType] = useState("");
  const [landmark, setLandmark] = useState("");
  const [reporter, setReporter] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 👈 Added submit loading state
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // 👈 Added selected file state
  const [detectedLabel, setDetectedLabel] = useState<string>("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [photoGps, setPhotoGps] = useState<{ lat: number; lng: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isVerified = photoAttached && !verificationError && !isAnalyzing;
  const canSubmit = title.trim().length > 2 && description.trim().length > 4 && !!picked && isVerified && !isSubmitting;

  useEffect(() => {
    if (photoGps && picked) {
      const distance = calculateDistanceMeters(picked.lat, picked.lng, photoGps.lat, photoGps.lng);
      if (distance > MAX_ALLOWED_DISTANCE_METERS) {
        setVerificationError(
          `Location Mismatch: Pin is ${distance}m away from photo location (max allowed: ${MAX_ALLOWED_DISTANCE_METERS}m).`
        );
      } else {
        setVerificationError(null);
      }
    }
  }, [picked, photoGps]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerificationError(null);
    setPhotoGps(null);
    setPhotoAttached(false);
    setSelectedFile(file); // 👈 Save selected file to state
    setIsAnalyzing(true);

    try {
      // 1. EXIF Verification
      const tags = await ExifReader.load(file, { expanded: true });

      const dateTaken =
        tags.exif?.DateTimeOriginal?.description ||
        tags.exif?.DateTime?.description;

      if (!dateTaken) {
        throw new Error("Missing Timestamp: Photo lacks original camera date/time metadata.");
      }

      const imgLat = tags.gps?.Latitude;
      const imgLng = tags.gps?.Longitude;

      if (imgLat === undefined || imgLng === undefined) {
        throw new Error("Missing Geotag: Photo has no embedded GPS coordinates.");
      }

      setPhotoGps({ lat: imgLat, lng: imgLng });

      if (!picked) {
        throw new Error("Please select a location on the map first before attaching a photo.");
      }

      const distanceMeters = calculateDistanceMeters(picked.lat, picked.lng, imgLat, imgLng);

      if (distanceMeters > MAX_ALLOWED_DISTANCE_METERS) {
        throw new Error(`Location Mismatch: Photo was taken ${distanceMeters}m away from selected map pin.`);
      }

      // 2. Gemini Vision Verification & Classification
      if (!GEMINI_API_KEY) {
        console.warn("⚠️ Gemini API key is missing in .env.local");
        setDetectedLabel("Missing API Key");
        setPhotoAttached(true);
        return;
      }

      const base64Data = await fileToBase64(file);
      const allowedCategoriesList = CATEGORIES.join(", ");

      const promptText = `Analyze this image for a civic complaint reporting platform.
      
Determine if the photo clearly depicts a genuine public civic issue or infrastructure defect (e.g., potholes, road damage, overflowing garbage, broken street lights, fallen trees, water leaks, broken footpaths, traffic signal issues).

STRICT REJECTION RULES:
- If the image shows a selfie, human face, group of people, indoor private space, personal object, document, text screenshot, animal, or meme, it is INVALID.
- Mark "isCivicIssue" as false for any image that does not clearly show a public infrastructure issue or defect.

Return JSON ONLY matching this schema:
{
  "isCivicIssue": boolean,
  "invalidReason": "Reason if invalid (e.g., 'Photo shows a person/selfie instead of a public civic defect')",
  "category": "Exact string from allowed categories list if valid, otherwise null",
  "summary": "3 to 4 word title of the issue if valid, otherwise null"
}

Allowed categories: [${allowedCategoriesList}]`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  { inline_data: { mime_type: file.type || "image/jpeg", data: base64Data } },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
            },
          }),
        }
      );

      if (response.status === 429) {
        throw new Error("API Limit Reached: Rate limit exceeded. Please wait 1 minute before trying again.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`API Error: ${data.error?.message || response.statusText}`);
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(rawText);

      if (!parsed.isCivicIssue) {
        throw new Error(parsed.invalidReason || "Invalid Photo: No civic issue or defect detected.");
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
        setDetectedLabel(`Verified EXIF (${distanceMeters}m match) • Taken: ${dateTaken}`);
        if (!title) {
          setTitle(parsed.summary || `Reported ${matchedCategory} issue`);
        }
      } else {
        setDetectedLabel("Unmapped AI Category");
      }
    } catch (err: any) {
      console.error("❌ Verification Error:", err);
      setVerificationError(err.message || "Failed photo verification.");
      setPhotoAttached(false);
      setSelectedFile(null); // Clear file on error
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 👈 Updated submit function to call uploadComplaintPhoto and pass imageUrl
  async function submit() {
    if (!picked || !canSubmit) return;

    setIsSubmitting(true);
    let imageUrl: string | undefined = undefined;

    try {
      if (selectedFile) {
        imageUrl = await uploadComplaintPhoto(selectedFile, "before");
      }

      onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        subType: subType || undefined,
        landmark: landmark.trim() || undefined,
        area: "Chennai",
        lat: picked.lat,
        lng: picked.lng,
        reporter: reporter.trim() || "Anonymous",
        imageUrl, // 👈 Pass uploaded photo URL here
      });

      // Reset Form State
      setTitle("");
      setDescription("");
      setSubType("");
      setLandmark("");
      setReporter("");
      setPhotoAttached(false);
      setSelectedFile(null);
      setVerificationError(null);
      setCategory(CATEGORIES[0] || "Pothole / Roads");
      setDetectedLabel("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("❌ Submit Error:", err);
      setVerificationError(err.message || "Failed to upload photo. Please try again.");
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
            Every report is public and permanent. Requires original photo with embedded GPS & timestamp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                {picked
                  ? `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
                  : "No location selected"}
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
              onValueChange={(value) => {
                setCategory(value);
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

          {CATEGORY_TREE[category as keyof typeof CATEGORY_TREE] ? (
            <div className="space-y-1.5">
              <Label htmlFor="sub-type">Sub-Type (optional)</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger id="sub-type" className="w-full">
                  <SelectValue placeholder="Select a more specific issue" />
                </SelectTrigger>
                <SelectContent className="z-[10005]">
                  {CATEGORY_TREE[category as keyof typeof CATEGORY_TREE].map((item) => (
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
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={4}
              placeholder="What's wrong, how long has it been like this, who does it affect?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="landmark">Landmark / Specific location (optional)</Label>
            <Input
              id="landmark"
              placeholder="e.g. Near HDFC ATM, opposite temple"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Photo Evidence (Mandatory with EXIF Metadata)</Label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
            />
            <button
              type="button"
              className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${verificationError
                ? "border-destructive/60 bg-destructive/10"
                : isVerified
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : "border-border bg-muted/40"
                }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {verificationError ? (
                <AlertTriangle className="size-6 text-destructive" />
              ) : isVerified ? (
                <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ImagePlus className="size-6 text-muted-foreground" />
              )}

              <span className="text-xs font-medium text-foreground">
                {isAnalyzing
                  ? "🔍 Verifying EXIF & Analyzing Defect with Gemini AI..."
                  : verificationError
                    ? "Photo Rejected - Click to try another photo"
                    : photoAttached
                      ? "Photo Attached & Verified (Click to change)"
                      : "Add original photo"}
              </span>

              <span className={`text-[11px] ${verificationError ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {isAnalyzing
                  ? "Checking geotag, timestamp, and defect validity..."
                  : verificationError
                    ? verificationError
                    : photoAttached
                      ? detectedLabel
                      : "Must be an unedited camera capture with location enabled"}
              </span>
            </button>

            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
              <Lock className="mt-0.5 size-3 shrink-0" />
              <span>
                🔒 Verification Active: Uploads are verified against photo GPS metadata and must match your selected map pin within 1 km.
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