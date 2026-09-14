import {
  GamePage,
  gameMetadata,
  gameStaticParams,
} from "@/app/_localized/game";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return gameStaticParams();
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return gameMetadata("en", slug);
}

export default async function EnglishGamePage({ params }: Props) {
  const { slug } = await params;
  return <GamePage locale="en" slug={slug} />;
}
