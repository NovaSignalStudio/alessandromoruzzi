const runtime = globalThis as typeof globalThis & { __MORUZZI_BASE_PATH__?: string };
export const basePath = runtime.__MORUZZI_BASE_PATH__ || '/';
export const assetUrl = (path: string) => `${basePath}${path.replace(/^\/+/, '')}`;
