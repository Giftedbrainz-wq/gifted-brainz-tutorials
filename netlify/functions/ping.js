// Netlify function entry point.
// Dependency-free deploy probe used by /api/ping.
import handler, { config } from "./ping-core.mjs";

export { config };
export default handler;
