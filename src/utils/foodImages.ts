import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, FOOD_IMAGES_FOLDER } from "../firebase/firebase";

export type UploadedImage = { imageUrl: string; imagePath: string };

const MAX_BYTES = 5 * 1024 * 1024;

/* Checked before upload so a bad file fails instantly
   instead of after a slow round trip. */
export function validateImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "That file isn't an image.";
  if (file.size > MAX_BYTES) return "Image must be under 5 MB.";
  return null;
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return (file.type.split("/")[1] || "jpg").toLowerCase();
}

/* Random name, not the dish name — two dishes can share a name,
   and renaming a dish shouldn't strand its file. */
function uniqueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function uploadFoodImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const imagePath = `${FOOD_IMAGES_FOLDER}/${uniqueId()}.${extensionFor(file)}`;
    const objectRef = ref(storage, imagePath);

    const task = uploadBytesResumable(objectRef, file, {
      contentType: file.type,
    });

    task.on(
      "state_changed",
      (snapshot) =>
        onProgress?.(
          Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        ),
      reject,
      async () => {
        try {
          resolve({ imageUrl: await getDownloadURL(objectRef), imagePath });
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

/* Never throws. A missing file is already the desired end state,
   and a failed cleanup shouldn't fail the save the user asked for. */
export async function deleteFoodImage(path?: string | null): Promise<void> {
  if (!path) return;

  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.warn("Couldn't delete image:", path, error);
  }
}