import { supabase } from "@/lib/supabaseClient";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Resizes and compresses an image in the browser before uploading.
 * Max dimension: 1600px, WebP format, 82% quality.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const maxDim = 1600;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // Fallback to raw file if canvas fails
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        0.82,
      );
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a complaint photo to Supabase Storage bucket ('complaint-photos').
 * Returns the public URL string.
 */
export async function uploadComplaintPhoto(file: File): Promise<string> {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported format ${file.type}. Please use JPEG, PNG, or WebP.`);
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Photo must be 5 MB or smaller.");
  }

  // Compress image before upload
  const compressedBlob = await compressImage(file);

  if (compressedBlob.size > MAX_BYTES) {
    throw new Error("Compressed photo is still over 5 MB. Try a smaller image.");
  }

  // Force public client uploads to the 'before' directory
  const path = `before/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("complaint-photos")
    .upload(path, compressedBlob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/webp",
    });

  if (uploadError) {
    console.error("[Storage] Upload failed:", uploadError.message);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from("complaint-photos").getPublicUrl(path);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded photo.");
  }

  return urlData.publicUrl;
}
