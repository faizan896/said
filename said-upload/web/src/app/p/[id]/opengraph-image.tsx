import { ImageResponse } from "next/og";
import { getPromiseById } from "@db/queries";
import { displayName, formatShortDate } from "@/lib/format";

export const runtime = "nodejs";
export const alt = "said — on the record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promise = await getPromiseById(Number(id));

  const statement = promise?.statement ?? "you said you'd do it.";
  const name = promise ? displayName(promise.creator_address, promise.creatorUsername) : "";
  const witnessCount = promise?.witnessCount ?? 0;
  const due = promise ? formatShortDate(promise.deadline) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf9f6",
          padding: "72px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, color: "#17140f" }}>said</div>

        <div
          style={{
            display: "flex",
            fontSize: statement.length > 90 ? 48 : 60,
            lineHeight: 1.25,
            color: "#17140f",
            maxWidth: 1000,
          }}
        >
          {`“${statement}”`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontSize: 28, color: "#17140f", fontFamily: "sans-serif" }}>
            {`— ${name}`}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#6f6a5f", fontFamily: "sans-serif" }}>
            {`${witnessCount} people witnessed this. due ${due}`}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#a29c8c",
              fontFamily: "sans-serif",
              marginTop: 8,
            }}
          >
            {"on the record · Monad"}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
