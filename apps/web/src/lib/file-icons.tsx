import {
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from "lucide-react";

export type FileCategory = "image" | "video" | "audio" | "document" | "spreadsheet" | "archive" | "code" | "other";

const RULES: Array<{ test: RegExp; icon: LucideIcon; category: FileCategory }> = [
  { test: /^image\//, icon: FileImage, category: "image" },
  { test: /^video\//, icon: FileVideo, category: "video" },
  { test: /^audio\//, icon: FileAudio, category: "audio" },
  { test: /pdf|msword|wordprocessingml|rtf/, icon: FileText, category: "document" },
  { test: /spreadsheet|ms-excel/, icon: FileSpreadsheet, category: "spreadsheet" },
  { test: /zip|rar|7z|tar|gzip/, icon: FileArchive, category: "archive" },
  { test: /json|javascript|typescript|xml|x-python|x-sh|html|css/, icon: FileCode, category: "code" },
  { test: /^text\//, icon: FileText, category: "document" },
];

export function getFileIcon(mimeType: string): LucideIcon {
  const match = RULES.find((rule) => rule.test.test(mimeType));
  return match?.icon ?? FileIcon;
}

export function getFileCategory(mimeType: string): FileCategory {
  return RULES.find((rule) => rule.test.test(mimeType))?.category ?? "other";
}

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  image: "Images",
  video: "Videos",
  audio: "Audio",
  document: "Documents",
  spreadsheet: "Spreadsheets",
  archive: "Archives",
  code: "Code",
  other: "Other",
};

export type PreviewKind = "image" | "pdf" | "text" | "video" | "audio" | "none";

export function getPreviewKind(mimeType: string): PreviewKind {
  if (/^image\//.test(mimeType)) return "image";
  if (/^video\//.test(mimeType)) return "video";
  if (/^audio\//.test(mimeType)) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (/^text\/|json|javascript|typescript|xml/.test(mimeType)) return "text";
  return "none";
}
