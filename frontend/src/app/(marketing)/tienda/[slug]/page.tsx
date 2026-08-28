import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/strapi/products";
import { ProductDetail } from "@/components/tienda/product-detail";
import { STORE_ENABLED } from "@/lib/constants";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductoPage(props: PageProps) {
  // La tienda está apagada (STORE_ENABLED): la ruta no existe para nadie.
  if (!STORE_ENABLED) notFound();

  const { slug } = await props.params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <ProductDetail product={product} />
    </div>
  );
}
