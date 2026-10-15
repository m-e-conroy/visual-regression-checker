import type { NextConfig } from "next";
import fs from "fs";

// Patch readlink on non-NTFS (e.g. exFAT) Windows filesystems where readlink on regular files throws EISDIR instead of EINVAL
const patchReadlink = () => {
  const origSync = fs.readlinkSync;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as any).readlinkSync = function (path: fs.PathLike, options?: any) {
    try {
      return origSync.call(fs, path, options);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "EISDIR" || code === "UNKNOWN") {
        const e = new Error("EINVAL") as Error & { code: string };
        e.code = "EINVAL";
        throw e;
      }
      throw err;
    }
  };

  const origAsync = fs.readlink;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as any).readlink = function (path: fs.PathLike, options?: any, callback?: any) {
    const cb = typeof options === "function" ? options : callback;
    const opt = typeof options === "function" ? undefined : options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origAsync as any).call(fs, path, opt, (err: any, linkString: any) => {
      if (err && (err.code === "EISDIR" || err.code === "UNKNOWN")) {
        const e = new Error("EINVAL") as Error & { code: string };
        e.code = "EINVAL";
        return cb(e, linkString);
      }
      return cb(err, linkString);
    });
  };

  if (fs.promises?.readlink) {
    const origPromise = fs.promises.readlink;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fs.promises as any).readlink = async function (path: fs.PathLike, options?: any) {
      try {
        return await origPromise.call(fs.promises, path, options);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === "EISDIR" || code === "UNKNOWN") {
          const e = new Error("EINVAL") as Error & { code: string };
          e.code = "EINVAL";
          throw e;
        }
        throw err;
      }
    };
  }
};

patchReadlink();

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
