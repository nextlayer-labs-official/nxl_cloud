import { OrganizationDetailView } from "@/components/admin/organization-detail-view";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrganizationDetailView orgId={id} />;
}
