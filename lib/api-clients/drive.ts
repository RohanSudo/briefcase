const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  owners: string[];
}

export async function searchFiles(
  accessToken: string,
  query: string,
  maxResults = 10
): Promise<DriveFile[]> {
  // Search by name or full-text content
  const q = `(name contains '${query.replace(/'/g, "\\'")}' or fullText contains '${query.replace(/'/g, "\\'")}') and trashed = false`;
  const params = new URLSearchParams({
    q,
    pageSize: String(maxResults),
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,owners)",
    orderBy: "modifiedTime desc",
  });

  const res = await fetch(`${DRIVE_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
  const data = await res.json();

  return (data.files || []).map(
    (f: {
      id: string;
      name: string;
      mimeType: string;
      webViewLink?: string;
      modifiedTime?: string;
      owners?: Array<{ displayName: string }>;
    }) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink || "",
      modifiedTime: f.modifiedTime || "",
      owners: (f.owners || []).map((o) => o.displayName),
    })
  );
}

export async function listRecentFiles(
  accessToken: string,
  maxResults = 10
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    pageSize: String(maxResults),
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,owners)",
    orderBy: "modifiedTime desc",
    q: "trashed = false",
  });

  const res = await fetch(`${DRIVE_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();

  return (data.files || []).map(
    (f: {
      id: string;
      name: string;
      mimeType: string;
      webViewLink?: string;
      modifiedTime?: string;
      owners?: Array<{ displayName: string }>;
    }) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink || "",
      modifiedTime: f.modifiedTime || "",
      owners: (f.owners || []).map((o) => o.displayName),
    })
  );
}
