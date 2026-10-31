import { fetchTimetable, fetchTimetableOptions, PortalSession } from "@/lib/portal";

export async function POST(req: Request) {
  try {
    const { session, ay, section } = await req.json();
    if (!session || !session.phpSessId) {
      return Response.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }

    const s = session as PortalSession;
    if (!ay || !section) {
      const options = await fetchTimetableOptions(s);
      const defaultAy = options.ayOptions[0] || "2026-27";
      const defaultSection = options.sectionOptions[0]?.value || "";
      if (defaultSection) {
        const data = await fetchTimetable(s, defaultAy, defaultSection);
        return Response.json({ success: true, data, options });
      }
      return Response.json({ success: true, data: null, options });
    }

    const data = await fetchTimetable(s, ay, section);
    return Response.json({ success: true, data });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to fetch timetable." },
      { status: 500 }
    );
  }
}
