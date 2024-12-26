export const rssFeedConfig = {
    title: "Your Blog Title",
    description: "Your blog description",
    id: process.env.NEXT_PUBLIC_APP_URL || "",
    link: process.env.NEXT_PUBLIC_APP_URL || "",
    language: "en",
    image: `${process.env.NEXT_PUBLIC_APP_URL}/images/og-image.jpg`,
    favicon: `${process.env.NEXT_PUBLIC_APP_URL}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    updated: new Date(),
    generator: "Your Blog RSS Feed",
    feedLinks: {
      rss2: `${process.env.NEXT_PUBLIC_APP_URL}/rss.xml`,
      json: `${process.env.NEXT_PUBLIC_APP_URL}/feed.json`,
      atom: `${process.env.NEXT_PUBLIC_APP_URL}/atom.xml`,
    },
    author: {
      name: "Your Name",
      email: "your-email@example.com",
      link: process.env.NEXT_PUBLIC_APP_URL || "",
    },
  }