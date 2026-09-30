// Keep catalog/save paths independent of the deployment directory.
export function publicAsset(path: string): string {
  const corrected = path === "/items/star-lance.svg"
    ? "/items/starforge-lance.svg"
    : path;
  if (!corrected.startsWith("/") || corrected.startsWith("//")) return corrected;
  const base = import.meta.env.BASE_URL;
  return corrected.startsWith(base) && base !== "/"
    ? corrected
    : `${base}${corrected.slice(1)}`;
}
