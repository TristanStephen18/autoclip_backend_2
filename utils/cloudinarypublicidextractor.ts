export const extractPublicId = (url: string) => {
  const parts = url.split("/");
  const file = parts[parts.length - 1];
  return file.split(".")[0]; // remove extension
};
