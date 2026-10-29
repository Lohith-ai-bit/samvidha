import { fetchExamResults } from "@/lib/portal";


export async function POST(req: Request) {
  try {
    const { session } = await req.json();
    if (!session || !session.phpSessId) {
      return Response.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }

    const data = await fetchExamResults(session as any);
    return Response.json({ success: true, data });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to fetch exam results." },
      { status: 500 }
    );
  }
}
