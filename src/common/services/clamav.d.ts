declare module 'clamav.js' {
  interface ClamavClient {
    ping(callback: (err: Error | null) => void): void;
    scanFile(
      path: string,
      callback: (
        err: Error | null,
        object: string,
        virus: string | null,
      ) => void,
    ): void;
    scanBuffer(
      buffer: Buffer,
      callback: (
        err: Error | null,
        object: string,
        virus: string | null,
      ) => void,
    ): void;
  }

  function createClient(port: number, host: string): ClamavClient;

  export { createClient };
}
