import { prisma } from "@/lib/db";

export type BlogViewSeed = {
  slug: string;
  title: string;
  views: number;
};

export const BLOG_VIEW_SEEDS: BlogViewSeed[] = [
  { slug: "voices-told-me-to-write", title: "So the Voices Told Me to Write This", views: 8 },
  { slug: "not-accept-defeat", title: "How Not to Accept Defeat 101", views: 5 },
  { slug: "sitcoms", title: "Sitcoms", views: 12 },
  { slug: "munnar-trip", title: "Munnar should be spelt 'Moonar'", views: 8 },
  { slug: "linux-experience", title: "The Linux Experience", views: 15 },
  { slug: "6-1-10-human-being", title: "6'1/10 human being", views: 21 },
  { slug: "20-days-before-21", title: "20 days before 21", views: 21 },
  { slug: "the-long-stride", title: "The Long Stride", views: 21 },
];

function normalizeSlug(slug: string): string {
  return slug.trim();
}

function normalizeTitle(title: string): string {
  return title.trim();
}

export async function ensureSeedBlogViews() {
  await Promise.all(
    BLOG_VIEW_SEEDS.map((seed) =>
      prisma.blogPostView.upsert({
        where: { slug: seed.slug },
        create: {
          slug: seed.slug,
          title: seed.title,
          views: seed.views,
        },
        update: {
          title: seed.title,
        },
      })
    )
  );
}

export async function listBlogViews(slugs?: string[]) {
  await ensureSeedBlogViews();

  const normalizedSlugs = (slugs ?? [])
    .map((slug) => normalizeSlug(slug))
    .filter((slug) => slug.length > 0);

  return prisma.blogPostView.findMany({
    where:
      normalizedSlugs.length > 0
        ? {
            slug: {
              in: normalizedSlugs,
            },
          }
        : undefined,
    select: {
      slug: true,
      title: true,
      views: true,
    },
    orderBy: {
      slug: "asc",
    },
  });
}

export async function incrementBlogView(input: { slug: string; title: string }) {
  const slug = normalizeSlug(input.slug);
  const title = normalizeTitle(input.title);

  if (!slug) {
    throw new Error("Invalid slug");
  }

  if (!title) {
    throw new Error("Invalid title");
  }

  await ensureSeedBlogViews();

  return prisma.blogPostView.upsert({
    where: { slug },
    create: {
      slug,
      title,
      views: 1,
    },
    update: {
      title,
      views: {
        increment: 1,
      },
    },
    select: {
      slug: true,
      views: true,
    },
  });
}
