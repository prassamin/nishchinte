import { CategoryDetailsView } from "./view";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryDetailsPage({ params }: Props) {
  const { slug } = await params;
  return <CategoryDetailsView slug={slug} />;
}
