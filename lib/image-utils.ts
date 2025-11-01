import imageCompression from 'browser-image-compression';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Creates an HTMLImageElement from a URL
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Gets the rotated dimensions for a given rotation angle
 */
export function getRotatedDimensions(width: number, height: number, rotation: number): { width: number; height: number } {
  const rotRad = (rotation * Math.PI) / 180;

  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Applies crop and rotation to an image using canvas
 * @param imageSrc - Source image URL
 * @param pixelCrop - Crop area in pixels
 * @param rotation - Rotation angle in degrees
 * @param flip - Horizontal and vertical flip
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = getRotatedDimensions(
    image.width,
    image.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas context to center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped area
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // Set canvas size to the final cropped size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Clear the canvas and paste the cropped image
  ctx.putImageData(data, 0, 0);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg');
  });
}

/**
 * Converts an image to grayscale using canvas
 */
export async function convertToGrayscale(blob: Blob): Promise<Blob> {
  const imageUrl = URL.createObjectURL(blob);
  const image = await createImage(imageUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    URL.revokeObjectURL(imageUrl);
    throw new Error('Failed to get canvas context');
  }

  canvas.width = image.width;
  canvas.height = image.height;

  // Draw the image
  ctx.drawImage(image, 0, 0);

  // Get image data and convert to grayscale
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Calculate grayscale value using luminosity method
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;     // Red
    data[i + 1] = gray; // Green
    data[i + 2] = gray; // Blue
    // Alpha channel (data[i + 3]) remains unchanged
  }

  ctx.putImageData(imageData, 0, 0);

  URL.revokeObjectURL(imageUrl);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert to grayscale'));
      }
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Main function to compress and process an image
 * - Resizes to max 1200px (portrait)
 * - Compresses to ~400-500KB
 * - Converts to grayscale
 * - Auto-corrects orientation
 */
export async function compressAndProcessImage(file: File): Promise<File> {
  try {
    // Step 1: Compress and resize the image
    const options = {
      maxSizeMB: 0.5,              // Target ~500KB
      maxWidthOrHeight: 1200,      // Max dimension for portrait
      useWebWorker: true,          // Use web worker for better performance
      fileType: 'image/jpeg',      // Convert to JPEG
      initialQuality: 0.85,        // Quality setting
    };

    let compressedFile = await imageCompression(file, options);

    // Step 2: Convert to grayscale
    const grayscaleBlob = await convertToGrayscale(compressedFile);

    // Step 3: Convert blob back to File with original filename
    const processedFile = new File(
      [grayscaleBlob],
      file.name.replace(/\.[^/.]+$/, '.jpg'), // Change extension to .jpg
      {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }
    );

    return processedFile;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Creates a preview URL from a File object
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revokes a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Checks if a file is an image (not PDF)
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}
