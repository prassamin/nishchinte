import { CiferRequest, CiferResponse, type CiferContext } from "ciferjs";

/**
 * POST /admin/media/upload
 *
 * Uploads media files to the configured storage driver and returns metadata.
 */
export async function POST(req: CiferRequest, ctx: CiferContext) {
  try {
    console.log("Media upload request");
    console.log(await ctx.auth.admin.getUser());
    // Authenticate admin session via injected context auth
    await ctx.auth.admin.requireUser();

    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    const parentPath = (formData.get("parentPath") as string) || "media";

    if (!files || files.length === 0) {
      return CiferResponse.json(
        { ok: false, error: "No files provided" },
        { status: 400 },
      );
    }

    const uploaded = [];
    for (const file of files) {
      if (typeof file === "string" || !file.name) continue;

      const result = await ctx.storage.upload(file, {
        path: parentPath,
        filename: file.name,
        mimeType: file.type,
      });

      uploaded.push(result);
    }

    return CiferResponse.json({
      ok: true,
      uploads: uploaded,
      url: uploaded[0]?.url,
      path: uploaded[0]?.path,
      name: uploaded[0]?.name,
      size: uploaded[0]?.size,
      mimeType: uploaded[0]?.mimeType,
    });
  } catch (error: any) {
    console.error("Media upload error:", error);
    return CiferResponse.json(
      { ok: false, error: error?.message || "Failed to upload file" },
      { status: error?.message?.includes("UNAUTHORIZED") ? 401 : 500 },
    );
  }
}
