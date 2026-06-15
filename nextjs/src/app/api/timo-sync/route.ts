import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { syncTimoTransactions } from "@/lib/timo";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session?.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.is_super_admin && !(user.permissions || []).includes("timo_sync")) {
    return NextResponse.json({ error: "Forbidden: Missing timo_sync permission" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendLog = async (level: string, message: string) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ level, message })}\n\n`));
  };

  const closeStream = async () => {
    await writer.write(encoder.encode(`data: [DONE]\n\n`));
    await writer.close();
  };

  (async () => {
    try {
      await syncTimoTransactions(sendLog);
    } catch (e: unknown) {
      await sendLog("error", `❌ Lỗi hệ thống: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      await closeStream();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
