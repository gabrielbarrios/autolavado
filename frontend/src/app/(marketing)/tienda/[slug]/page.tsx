import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/strapi/products";
import { ProductDetail } from "@/components/tienda/product-detail";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductoPage(props: PageProps) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <ProductDetail product={product} />
    </div>
  );
}
