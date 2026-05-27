import Image from "next/image";
import { strapiMediaUrl } from "@/lib/utils";
import type { StrapiMedia } from "@/types/strapi";

export function Gallery({ images }: { images?: StrapiMedia[] }) {
  if (!images || images.length === 0) return null;
  return (
    <section className="container mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Galería</h2>
        <p className="mt-2 text-muted-foreground">Algunos de los autos que pasaron por nuestras manos.</p>
      </div>
      <div className="grid auto-rows-[12rem] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.slice(0, 8).map((img, idx) => {
          const url = strapiMediaUrl(img, idx === 0 ? "medium" : "small");
          if (!url) return null;
          const featured = idx === 0;
          return (
            <div
              key={img.id ?? idx}
              className={`relative overflow-hidden rounded-2xl bg-muted ${
                featured ? "col-span-2 row-span-2" : ""
              }`}
            >
              <Image
                src={url}
                alt={img.alternativeText ?? `Galería ${idx + 1}`}
                fill
                sizes={featured ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
