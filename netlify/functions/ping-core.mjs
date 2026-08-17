/* Deploy probe.
 *
 * This function has no dependencies and no storage. If /api/ping answers JSON
 * then Netlify Functions were published and the /api/* routing works, which
 * separates "the function was never deployed" from "the API function is
 * failing". If it answers HTML, the deploy did not include functions at all.
 */
export const config = { path: "/api/ping" };

export default async () =>
  new Response(
    JSON.stringify({ ok: true, functions: true, time: Date.now() }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
