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

const RULES: Array<{ test: RegExp; icon: LucideIcon }> = [
  { test: /^image\//, icon: FileImage },
  { test: /^video\//, icon: FileVideo },
  { test: /^audio\//, icon: FileAudio },
  { test: /pdf|msword|wordprocessingml|rtf/, icon: FileText },
  { test: /spreadsheet|ms-excel/, icon: FileSpreadsheet },
  { test: /zip|rar|7z|tar|gzip/, icon: FileArchive },
  { test: /json|javascript|typescript|xml|x-python|x-sh|html|css/, icon: FileCode },
  { test: /^text\//, icon: FileText },
];

export function getFileIcon(mimeType: string): LucideIcon {
  const match = RULES.find((rule) => rule.test.test(mimeType));
  return match?.icon ?? FileIcon;
}
