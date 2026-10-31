import { fetchExamCodeList, fetchGradeSheet, PortalSession } from "@/lib/portal";

export async function POST(req: Request) {
  try {
    const { session, examCode, examTitle } = await req.json();
    if (!session || !session.phpSessId) {
      return Response.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }

    const s = session as PortalSession;
    if (examCode) {
      const sheet = await fetchGradeSheet(s, examCode, examTitle || "");
      return Response.json({ success: true, sheet });
    }
    const exams = await fetchExamCodeList(s);
    return Response.json({ success: true, exams });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to fetch exam results." },
      { status: 500 }
    );
  }
}
