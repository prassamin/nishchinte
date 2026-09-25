import { OrderDetailView } from "./view";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const { orderId } = await params;
  return <OrderDetailView orderId={orderId} />;
}
