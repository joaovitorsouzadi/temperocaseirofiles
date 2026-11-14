import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
const execute = promisify(execFile);
const library = path.resolve(
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) || ".",
);
const force = process.argv.includes("--force");
const output = path.join(library, "optimized");
const manifest = { version: 1, images: {}, videos: {} };
for (const folder of ["images", "videos", "previews", "posters"])
  await fs.mkdir(path.join(output, folder), { recursive: true });
const files = (await fs.readdir(library)).sort();
const statBytes = async (p) => (await fs.stat(p)).size;
async function encode(input, dest, options) {
  try {
    if (!force && (await fs.stat(dest)).size > 0) return;
  } catch {}
  const temp = dest.replace(/(\.[^.]+)$/, ".tmp$1");
  try {
    await execute(
      ffmpeg.path,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        input,
        ...options,
        temp,
      ],
      { maxBuffer: 2 * 1024 * 1024 },
    );
    await fs.rename(temp, dest);
  } catch (error) {
    await fs.unlink(temp).catch(() => {});
    throw error;
  }
}
for (const file of files) {
  const image = /^([fp]) \((\d+)\)\.jpg$/.exec(file);
  if (!image) continue;
  const name = `${image[1]}-${image[2]}`;
  const input = path.join(library, file);
  const variants = {};
  for (const width of [480, 960, 1600]) {
    const relative = `images/${name}-${width}.webp`;
    const dest = path.join(output, relative);
    const exists = await fs.access(dest).then(
      () => true,
      () => false,
    );
    if (force || !exists) {
      await sharp(input)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(dest);
    }
    const metadata = await sharp(dest).metadata();
    variants[width] = {
      path: relative,
      bytes: await statBytes(dest),
      width: metadata.width,
      height: metadata.height,
    };
  }
  manifest.images[name] = {
    original: file,
    originalBytes: await statBytes(input),
    variants,
  };
}
for (const file of files) {
  const video = /^v \((\d+)\)\.mp4$/.exec(file);
  if (!video) continue;
  const name = `v-${video[1]}`;
  const input = path.join(library, file);
  console.log("Otimizando", file);
  await encode(input, path.join(output, `videos/${name}.mp4`), [
    "-vf",
    "scale=720:1280:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "27",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    "-threads",
    "2",
  ]);
  await encode(input, path.join(output, `previews/${name}.mp4`), [
    "-t",
    "2",
    "-vf",
    "scale=360:640:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=20",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "29",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    "-threads",
    "2",
  ]);
  await encode(input, path.join(output, `posters/${name}.webp`), [
    "-frames:v",
    "1",
    "-vf",
    "scale=360:640:force_original_aspect_ratio=decrease",
    "-quality",
    "80",
  ]);
  manifest.videos[name] = {
    original: file,
    originalBytes: await statBytes(input),
    video: {
      path: `videos/${name}.mp4`,
      bytes: await statBytes(path.join(output, `videos/${name}.mp4`)),
    },
    preview: {
      path: `previews/${name}.mp4`,
      bytes: await statBytes(path.join(output, `previews/${name}.mp4`)),
    },
    poster: {
      path: `posters/${name}.webp`,
      bytes: await statBytes(path.join(output, `posters/${name}.webp`)),
    },
  };
}
await fs.writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
