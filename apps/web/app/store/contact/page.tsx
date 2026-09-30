"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, Eyebrow, Headline, toast } from "@/components/ui";
import { post } from "@/lib/api";

export default function ContactPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="rise">
      <Eyebrow>Ruwan, dispatch</Eyebrow>
      <Headline className="mt-1">Contact dispatch</Headline>
      <p className="mt-1 text-[14px] text-muted">Ask Ruwan about a deferral or a delivery. He replies by push. It reaches him with your outlet attached.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Write your question…" className="mt-4 w-full rounded-[10px] border border-line bg-surface p-3 outline-none focus:border-ink" />
      <ErrorNote error={err} />
      <Button
        size="lg"
        block
        className="mt-3"
        busy={busy}
        disabled={!text.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await post("/store/message", { text });
            toast("Sent to Ruwan.");
            router.push("/store/track");
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not send");
          } finally {
            setBusy(false);
          }
        }}
      >
        Send message
      </Button>
      <Button variant="ghost" block className="mt-1" onClick={() => router.back()}>Cancel</Button>
    </div>
  );
}
