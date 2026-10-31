import { fetchCreditRegister, PortalSession } from "@/lib/portal";

export async function POST(req: Request) {
  try {
    const { session } = (await req.json()) as { session: PortalSession };
    if (!session?.phpSessId) {
      return Response.json({ success: false, error: "No session." }, { status: 401 });
    }
    const data = await fetchCreditRegister(session);
    return Response.json({ success: true, data });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message || "Failed to load credit register." }, { status: 500 });
  }
}
