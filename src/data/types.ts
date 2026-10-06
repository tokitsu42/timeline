export type Category = "政治" | "社会" | "経済" | "災害" | "科学" | "文化" | "スポーツ";
type Source = { label: string; url: string };
type QuotedImage = { url: string; sourcePageUrl: string; caption: string; attribution: string };
type EventBase = { id: string; title: string; summary: string; category: Category; source: Source; image?: QuotedImage };
export type TimelineEvent = EventBase & ({ kind: "point"; date: string } | { kind: "period"; startDate: string; endDate: string });
