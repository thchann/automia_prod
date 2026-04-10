import { ApiError, apiRequest } from "./client";

export type AttachmentKind = "image" | "document";

export type PresignUploadBody = {
  filename: string;
  content_type: string;
  file_size: number;
  type: AttachmentKind;
};

export type PresignUploadResponse = {
  upload_url: string;
  storage_key: string;
  method: "PUT";
};

export type PresignDownloadResponse = {
  download_url: string;
};

/** Persisted attachment shape for PUT lead/car (wire). */
export type AttachmentWireItem = {
  type: AttachmentKind;
  url?: string;
  storage_key?: string;
  filename?: string;
  content_type?: string;
  size_bytes?: number;
};

export type AttachmentDeleteRequest = {
  storage_key: string;
};

export type AttachmentDeleteResponse = {
  message: string;
  trashed_key: string;
};

export async function deleteLeadAttachment(
  leadId: string,
  body: AttachmentDeleteRequest,
): Promise<AttachmentDeleteResponse> {
  return apiRequest<AttachmentDeleteResponse>(`/leads/${leadId}/attachments`, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export async function deleteCarAttachment(
  carId: string,
  body: AttachmentDeleteRequest,
): Promise<AttachmentDeleteResponse> {
  return apiRequest<AttachmentDeleteResponse>(`/cars/${carId}/attachments`, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export async function presignLeadAttachmentUpload(
  leadId: string,
  body: PresignUploadBody,
): Promise<PresignUploadResponse> {
  return apiRequest<PresignUploadResponse>(`/leads/${leadId}/attachments/presign-upload`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function presignCarAttachmentUpload(
  carId: string,
  body: PresignUploadBody,
): Promise<PresignUploadResponse> {
  return apiRequest<PresignUploadResponse>(`/cars/${carId}/attachments/presign-upload`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function presignLeadAttachmentDownload(
  leadId: string,
  storageKey: string,
): Promise<PresignDownloadResponse> {
  return apiRequest<PresignDownloadResponse>(`/leads/${leadId}/attachments/presign-download`, {
    method: "POST",
    body: JSON.stringify({ storage_key: storageKey }),
  });
}

export async function presignCarAttachmentDownload(
  carId: string,
  storageKey: string,
): Promise<PresignDownloadResponse> {
  return apiRequest<PresignDownloadResponse>(`/cars/${carId}/attachments/presign-download`, {
    method: "POST",
    body: JSON.stringify({ storage_key: storageKey }),
  });
}

/**
 * PUT raw bytes to the presigned URL (no Bearer token — S3/R2).
 * `Content-Type` must match the value sent to presign.
 */
export async function putFileToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": contentType,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || "Upload failed", text);
  }
}

export type AttachmentUploadInput = {
  type: AttachmentKind;
  url?: string;
  storage_key?: string;
  filename?: string;
  content_type?: string;
};

/**
 * Turns local `blob:` previews into bucket `storage_key` rows via presign + PUT.
 * Pass-through for items that already have `storage_key` or a non-blob `url`.
 */
export async function uploadLeadAttachmentsToBucket(
  leadId: string,
  items: AttachmentUploadInput[],
): Promise<AttachmentWireItem[]> {
  const out: AttachmentWireItem[] = [];
  for (const att of items) {
    if (att.storage_key) {
      out.push({
        type: att.type,
        storage_key: att.storage_key,
        filename: att.filename,
        content_type: att.content_type,
      });
      continue;
    }
    const u = att.url;
    if (typeof u === "string" && u.length > 0 && !u.startsWith("blob:")) {
      out.push({
        type: att.type,
        url: u,
        filename: att.filename,
        content_type: att.content_type,
      });
      continue;
    }
    if (typeof u !== "string" || !u.startsWith("blob:")) continue;

    const blob = await fetch(u).then((r) => r.blob());
    const contentType =
      blob.type || att.content_type || "application/octet-stream";
    const filename = att.filename?.trim() || "file";
    const presign = await presignLeadAttachmentUpload(leadId, {
      filename,
      content_type: contentType,
      file_size: blob.size,
      type: att.type,
    });
    const method = presign.method?.toUpperCase() ?? "PUT";
    if (method !== "PUT") {
      throw new ApiError(500, `Unexpected presign method: ${method}`);
    }
    await putFileToPresignedUrl(presign.upload_url, blob, contentType);
    out.push({
      type: att.type,
      storage_key: presign.storage_key,
      filename,
      content_type: contentType,
      size_bytes: blob.size,
    });
  }
  return out;
}

export async function uploadCarAttachmentsToBucket(
  carId: string,
  items: AttachmentUploadInput[],
): Promise<AttachmentWireItem[]> {
  const out: AttachmentWireItem[] = [];
  for (const att of items) {
    if (att.storage_key) {
      out.push({
        type: att.type,
        storage_key: att.storage_key,
        filename: att.filename,
        content_type: att.content_type,
      });
      continue;
    }
    const u = att.url;
    if (typeof u === "string" && u.length > 0 && !u.startsWith("blob:")) {
      out.push({
        type: att.type,
        url: u,
        filename: att.filename,
        content_type: att.content_type,
      });
      continue;
    }
    if (typeof u !== "string" || !u.startsWith("blob:")) continue;

    const blob = await fetch(u).then((r) => r.blob());
    const contentType =
      blob.type || att.content_type || "application/octet-stream";
    const filename = att.filename?.trim() || "file";
    const presign = await presignCarAttachmentUpload(carId, {
      filename,
      content_type: contentType,
      file_size: blob.size,
      type: att.type,
    });
    const method = presign.method?.toUpperCase() ?? "PUT";
    if (method !== "PUT") {
      throw new ApiError(500, `Unexpected presign method: ${method}`);
    }
    await putFileToPresignedUrl(presign.upload_url, blob, contentType);
    out.push({
      type: att.type,
      storage_key: presign.storage_key,
      filename,
      content_type: contentType,
      size_bytes: blob.size,
    });
  }
  return out;
}
