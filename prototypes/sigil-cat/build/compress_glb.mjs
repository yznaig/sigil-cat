// compress_glb.mjs: work/cat.raw.glb -> models/sigil-cat.glb, meshopt-compressed, with the normals left as floats.
//   npx -p @gltf-transform/cli@4 -c 'node compress_glb.mjs work/cat.raw.glb ../models/sigil-cat.glb'
// Why not `gltf-transform optimize --compress meshopt` (2026-11-08): it quantizes every NORMAL as a unit vector,
// morph-target normal deltas too. Those deltas reach past length 1 where a pose turns the skin far (the loaf's flank),
// so they were clamped, and the site drew a diagonal line along the flank that the geometry doesn't have.
// Everything else is as before: positions 14 bits, weights 8, deduplicated accessors, resampled clips, nothing pruned
// (prune would drop the empty butter_socket node), the custom _AO attributes left as floats.
import { createRequire } from "module";
import path from "path";

const [inp, out] = process.argv.slice(2);
const bin = (process.env.PATH || "").split(":").find((p) => p.includes("_npx") && p.endsWith(path.join("node_modules", ".bin")));
if (!bin) throw new Error("run through npx -p @gltf-transform/cli@4 -c '...' (see the header)");
const req = createRequire(path.join(bin, "..", "resolve.js"));
const { NodeIO } = await import(req.resolve("@gltf-transform/core"));
const { ALL_EXTENSIONS, EXTMeshoptCompression } = await import(req.resolve("@gltf-transform/extensions"));
const { dedup, resample, reorder, quantize } = await import(req.resolve("@gltf-transform/functions"));
const { MeshoptEncoder, MeshoptDecoder } = await import(req.resolve("meshoptimizer"));
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(inp);
await doc.transform(
  dedup(),
  resample(),
  reorder({ encoder: MeshoptEncoder, target: "size" }),
  quantize({ pattern: /^(POSITION|TEXCOORD|JOINTS|WEIGHTS)/i, quantizePosition: 14, quantizeTexcoord: 12, quantizeWeight: 8 }),
);
doc.createExtension(EXTMeshoptCompression).setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(out, doc);
console.log("wrote", out);
