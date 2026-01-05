/// <reference types="@cloudflare/workers-types" />

interface Env {
  AUTH_USER?: string;
  AUTH_PASS?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { AUTH_USER = "friend", AUTH_PASS = "notfoe" } = context.env;

  const auth = context.request.headers.get("Authorization");

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic") {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(":");
      if (user === AUTH_USER && pass === AUTH_PASS) {
        return context.next();
      }
    }
  }

  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Protected"' },
  });
};
