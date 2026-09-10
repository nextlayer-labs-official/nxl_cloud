import { DistributorDetailView } from "@/components/admin/distributor-detail-view";

export default async function AdminDistributorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DistributorDetailView distributorId={id} />;
}
