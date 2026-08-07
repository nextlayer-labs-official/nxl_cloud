import { FileBrowser } from "@/components/portal/file-browser";

export default async function PortalFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <FileBrowser folderId={folderId} />;
}
