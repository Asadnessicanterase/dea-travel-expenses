import { supabase } from "./supabase-client";

const bucketName = process.env.SUPABASE_BUCKET_NAME || "files";
const folderPrefix = process.env.SUPABASE_FOLDER_PREFIX || "uploads/";

export async function uploadFile(buffer: Buffer, fileName: string): Promise<string> {
  const path = `${folderPrefix}${Date.now()}-${fileName}`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, buffer, {
      contentType: guessContentType(fileName),
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  console.log("✅ File uploaded to Supabase:", path);

  return path;
}

export async function downloadFile(key: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(key, 3600);
  if (error || !data?.signedUrl) throw new Error(`Failed to get signed URL: ${error?.message}`);
  return data.signedUrl;
}

export async function deleteFile(key: string): Promise<void> {
  const { error } = await supabase.storage.from(bucketName).remove([key]);
  if (error) throw new Error(`Failed to delete file: ${error.message}`);
}

function guessContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.match(/\.(jpg|jpeg)$/)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}
