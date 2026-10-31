import { loginToSamvidha } from "@/lib/portal";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    const result = await loginToSamvidha(username, password);

    if (!result.success || !result.session) {
      return Response.json(
        {
          success: false,
          error: result.error || "Login failed.",
        },
        { status: 401 }
      );
    }

    // Return the session to the client. The client stores it in memory only
    // (no database / no persistent storage) and uses it to trap portal endpoints.
    return Response.json({
      success: true,
      session: {
        username: result.session.username,
        phpSessId: result.session.phpSessId,
        csrfToken: result.session.csrfToken,
        loggedIn: result.session.loggedIn,
      },
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Login failed." },
      { status: 500 }
    );
  }
}
