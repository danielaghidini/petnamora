import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { blogPosts } from "@/features/blog/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL("/", siteUrl).href },
    { url: new URL("/blog", siteUrl).href },
    ...blogPosts.map(post => ({
      url: new URL(`/blog/${post.slug}`, siteUrl).href,
      lastModified: `${post.publishedAt}T12:00:00-03:00`,
    })),
  ];
}
