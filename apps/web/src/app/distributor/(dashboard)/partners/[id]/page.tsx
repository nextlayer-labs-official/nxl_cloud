import { DistributorPartnerDetailView } from "@/components/distributor/distributor-partner-detail-view";

export default async function DistributorPartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DistributorPartnerDetailView partnerId={id} />;
}
