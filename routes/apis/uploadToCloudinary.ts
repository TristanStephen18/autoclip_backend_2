import cloudinary from "../utils/cloudinaryClient.ts";


export async function uploadClipToCloudinary(filePath: string) {
  try {
    console.log(`🎞️ Uploading clip to Cloudinary: ${filePath}`);

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      folder: "clips",
      use_filename: true,
      unique_filename: false,
    });

    console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (err: any) {
    console.error("❌ Cloudinary upload error:", err.message);
    throw err;
  }
}

export const deleteCloudinaryAsset = async (publicId: string) => {
  try {
    const res = await cloudinary.uploader.destroy(publicId);
    console.log("deleted clip from cloudinary");
    return res;
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
  }
};
