import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function countIdsInGeoJSON(path: string) {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as any;

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${path} does not contain a JSON object`);
  }

  const features = Array.isArray(parsed.features) ? parsed.features : [];

  const totalFeatures = features.length;
  let totalIdCount = 0;

  for (const f of features) {
    if (!f || typeof f !== "object") {
      continue;
    }

    // count feature.id (can be scalar or array)
    if (f.id != null) {
      if (Array.isArray(f.id)) {
        totalIdCount += f.id.length;
      } else {
        totalIdCount += 1;
      }
    }

    const props = f.properties;
    if (!props || typeof props !== "object") {
      continue;
    }

    // properties._id
    if (props._id != null) {
      if (Array.isArray(props._id)) {
        totalIdCount += props._id.length;
      } else {
        totalIdCount += 1;
      }
    }

    // properties.id
    if (props.id != null) {
      if (Array.isArray(props.id)) {
        totalIdCount += props.id.length;
      } else {
        totalIdCount += 1;
      }
    }

    // properties.ids (plural)
    if (props.ids != null) {
      if (Array.isArray(props.ids)) {
        totalIdCount += props.ids.length;
      } else {
        totalIdCount += 1;
      }
    }
  }

  return { totalFeatures, totalIdCount };
}

async function main() {
  const repoRoot = resolve(import.meta.dirname, "..");
  const files = [
    resolve(repoRoot, "public", "output.old.geojson"),
    resolve(repoRoot, "public", "output.v6.geojson"),
  ];

  for (const file of files) {
    try {
      const { totalFeatures, totalIdCount } = await countIdsInGeoJSON(file);
      console.log(
        `${file}: features=${totalFeatures}, total_id_count=${totalIdCount}`
      );
    } catch (err) {
      console.error(
        `Error reading ${file}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
