import fs from "fs";
import path from "path";
import { mega } from "./megaClient.ts";

export const uploadVideoToMega = async (
  localPath: string,
  fileName?: string,
  folderType: "videos" | "clips" = "videos"
): Promise<string> => {
  // get file size
  const fileSize = fs.statSync(localPath).size;
  const name = fileName || path.basename(localPath);

  // await mega ready
  if (!mega.ready) {
    await new Promise<void>((resolve, reject) => {
      (mega as any).on("ready", resolve);
      (mega as any).on("error", reject);
    });
  }

  // find or create folder node
  let folder = mega.root.children?.find(
    (child: any) => child.name?.toLowerCase() === folderType.toLowerCase()
  );
  if (!folder) {
    folder = await new Promise<any>((resolve, reject) => {
      mega.root.mkdir(folderType, (err, node) => {
        if (err) reject(err);
        else resolve(node);
      });
    });
  }

  console.log(`📁 Uploading to folder: ${folder?.name}`);

  // create uploadStream with size option
  const uploadStream = folder?.upload({ name, size: fileSize } as any);

  // pipe the file
  const fileStream = fs.createReadStream(localPath);
  fileStream.pipe(uploadStream);

  // wait for upload complete
  const file = await uploadStream.complete;
  const link = await file.link();
  return link;
};
