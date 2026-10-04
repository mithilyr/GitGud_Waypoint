import { Card, Headline, Lead, NavRow } from "./ui";

/** The Help screen every role shares: eyebrow, headline, the answers as cards, a link to Settings, then one primary action. */
export function HelpLayout({
  lead,
  title,
  items,
  settings,
  action,
}: {
  lead: React.ReactNode;
  title: string;
  items: { q: string; a: string }[];
  settings: { label: string; href?: string; onClick?: () => void };
  action: React.ReactNode;
}) {
  return (
    <div className="rise mx-auto max-w-[620px]">
      <Lead>{lead}</Lead>
      <Headline className="mt-1">{title}</Headline>
      <div className="mt-5 space-y-3">
        {items.map(({ q, a }) => (
          <Card key={q} className="p-4">
            <div className="text-[15px] font-semibold">{q}</div>
            <p className="mt-2 text-[14px] text-muted">{a}</p>
          </Card>
        ))}
        <NavRow
          label={settings.label}
          href={settings.href}
          onClick={settings.onClick}
        />
      </div>
      <div className="mt-6">{action}</div>
    </div>
  );
}
