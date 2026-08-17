// Netlify function entry point.
// Keep this small, conventional .js entry file so Netlify's function
// discovery cannot confuse the bundled backend with an ordinary asset.
import handler, { config } from "./api-core.mjs";

export { config };
export default handler;
