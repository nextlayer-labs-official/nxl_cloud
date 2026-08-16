import { FileView } from "@/components/portal/file-view";

export default async function PortalFilePage({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) {
  const { fileId } = await params;
  return <FileView fileId={fileId} />;
}
