"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  ErrorNote,
  Headline,
  Lead,
  toast,
} from "@/components/ui";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function ContactPage() {
  const { t } = useT();
  const { user } = useAuth();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="rise lg:mx-auto lg:max-w-[640px]">
      <Lead>
        {t("store.contact.eyebrow", { outlet: user?.outlet?.name ?? "" })}
      </Lead>
      <Headline className="mt-1">{t("store.contact.title")}</Headline>
      <p className="mt-2 text-[14px] text-muted">{t("store.contact.lede")}</p>
      <Card className="mt-5 p-4">
        <div className="text-[16px] font-semibold">
          {t("store.contact.cardTitle")}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={t("store.contact.placeholder")}
          className="mt-2 w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-muted"
        />
      </Card>
      <ErrorNote error={err} />
      <Button
        size="lg"
        block
        className="mt-8"
        busy={busy}
        disabled={!text.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await post("/store/message", { text });
            toast(t("store.contact.sent"));
            router.push("/store/track");
          } catch (e) {
            setErr(e instanceof Error ? e.message : t("store.contact.failed"));
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("store.contact.send")}
      </Button>
      <Button
        size="lg"
        variant="secondary"
        block
        className="mt-2"
        onClick={() => router.back()}
      >
        {t("common.cancel")}
      </Button>
    </div>
  );
}
