import { PartnerDetailView } from "@/components/admin/partner-detail-view";

export default async function AdminPartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartnerDetailView partnerId={id} />;
}
