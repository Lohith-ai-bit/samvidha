import { fetchQpPage, fetchQpList, PortalSession } from "@/lib/portal";

export async function POST(req: Request) {
  try {
    const { session, examCode } = (await req.json()) as {
      session: PortalSession;
      examCode?: string;
    };
    if (!session?.phpSessId) {
      return Response.json({ success: false, error: "No session." }, { status: 401 });
    }

    const options = await fetchQpPage(session);

    // Default to the newest CIE option that matches the student's current semester (V)
    const selected =
      examCode ||
      options.find((o) => o.kind === "CIE" && o.label.includes("V SEMESTER"))?.value ||
      options[0]?.value ||
      "";

    const papers = selected ? await fetchQpList(session, selected) : [];
    return Response.json({ success: true, options, selected, papers });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message || "Failed to load question papers." }, { status: 500 });
  }
}
