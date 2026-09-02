/**
 * Handles local photo processing and state management for CivicLens complaints.
 */

/**
 * Converts an uploaded image File into a Data URL (Base64) string for zero-cost client-side persistence.
 * @param file The image File object uploaded by a citizen or officer.
 * @param type Whether this is the initial complaint photo ("before") or resolution proof ("after").
 * @returns Promise resolving to the Data URL string.
 */
export async function uploadComplaintPhoto(
    file: File,
    type: "before" | "after" = "before"
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("Failed to process image file into readable URL."));
            }
        };

        reader.onerror = (error) => reject(error);
    });
}

/**
 * Simulates marking a complaint as resolved locally with a fix photo proof.
 * @param id Complaint ID string.
 * @param fixUrl The Data URL or image string of the resolution proof photo.
 * @returns Promise resolving to boolean success status.
 */
export async function markComplaintFixed(
    id: string,
    fixUrl: string
): Promise<boolean> {
    try {
        console.log(`[CivicLens Audit] Complaint #${id} marked as resolved with fix photo:`, fixUrl);
        return true;
    } catch (err) {
        console.error(`Failed to resolve complaint #${id}:`, err);
        return false;
    }
}