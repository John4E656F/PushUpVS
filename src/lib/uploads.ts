// Direct-to-Backblaze uploads: the Go API presigns a PUT URL, the app
// streams the file bytes straight to B2 with expo-file-system.

import { File, UploadTask } from 'expo-file-system';

import { api, type TokenGetter } from './api';

export type UploadKind = 'video' | 'avatar';

function contentTypeFor(kind: UploadKind, uri: string): string {
  const lower = uri.toLowerCase();
  if (kind === 'video') return lower.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Uploads a local file to B2 and returns its storage key.
 * Throws ApiUnavailableError / SubscriptionRequiredError from the presign call.
 */
export async function uploadFile(
  getToken: TokenGetter,
  kind: UploadKind,
  localUri: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const contentType = contentTypeFor(kind, localUri);
  const presigned = await api.presignUpload(getToken, kind, contentType);

  const file = new File(localUri);
  const task = new UploadTask(file, presigned.url, {
    httpMethod: 'PUT',
    headers: presigned.headers,
    onProgress: onProgress
      ? ({ bytesSent, totalBytes }) => {
          if (totalBytes > 0) onProgress(bytesSent / totalBytes);
        }
      : undefined,
  });
  const result = await task.uploadAsync();
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`storage rejected the upload (${result.status})`);
  }
  return presigned.key;
}
