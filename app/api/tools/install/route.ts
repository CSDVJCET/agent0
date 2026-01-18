import { z } from "zod";
import { addInstalledTool, removeInstalledTool } from "@/lib/installed-tools";

const bodySchema = z.object({
  toolId: z.string(),
  userId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parsed.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { toolId, userId } = parsed.data;

    addInstalledTool(toolId);
    console.log(`Installing tool ${toolId} for user ${userId || "anonymous"}`);

    return Response.json({
      success: true,
      toolId,
      message: `Tool ${toolId} installed successfully`,
    });
  } catch (error) {
    console.error("Install tool API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parsed.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { toolId, userId } = parsed.data;

    removeInstalledTool(toolId);
    console.log(`Uninstalling tool ${toolId} for user ${userId || "anonymous"}`);

    return Response.json({
      success: true,
      toolId,
      message: `Tool ${toolId} uninstalled successfully`,
    });
  } catch (error) {
    console.error("Uninstall tool API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
