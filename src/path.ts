export const dirname = (path: string): string => {
  const lastSlashIndex = path.lastIndexOf('/');
  return path.substr(0, lastSlashIndex);
};
