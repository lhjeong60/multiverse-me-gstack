import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data } = await supabase
    .from("results")
    .select("name, universes")
    .eq("id", id)
    .single();

  if (!data) {
    return { title: "Multiverse Me" };
  }

  const firstImage = (data.universes as Array<{ image_url: string }>)?.find(
    (u) => u.image_url
  )?.image_url;

  const title = `${data.name}의 멀티버스`;
  const description = "5개 평행세계에서의 나를 만나보세요";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: firstImage ? [{ url: firstImage, width: 1024, height: 1024 }] : [],
      type: "website",
      siteName: "Multiverse Me",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: firstImage ? [firstImage] : [],
    },
  };
}

export default function ResultLayout({ children }: Props) {
  return children;
}
