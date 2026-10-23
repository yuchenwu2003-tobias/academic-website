import { env } from "cloudflare:workers";
import { handleCloudState } from "../../../server/cloud-state.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleCloudState(request, env.DB);
}

export async function POST(request: Request) {
  return handleCloudState(request, env.DB);
}
