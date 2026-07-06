import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import os from "os";

export async function bundleAndRender({ id, images, audioUrl, audioStart, audioEnd, script, outPath }: {
  id: string;
  images: string[];
  audioUrl?: string;
  audioStart: number;
  audioEnd: number;
  script: any;
  outPath: string;
}) {
  console.log(`Starting Remotion bundle for job ${id}...`);
  // The root file that registers the composition
  const compositionId = "MainComposition";
  // Create a remotion project configuration file dynamically or point to the root
  // Actually we need to bundle the React code using Webpack.
  // We'll bundle `src/remotion/index.ts`
  const entryPoint = path.join(process.cwd(), "src/remotion/index.ts");
  
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  const durationInFrames = Math.max(1, Math.round((audioEnd - audioStart) * 30));

  const inputProps = {
    images,
    audioUrl,
    audioStart,
    audioEnd,
    script
  };

  console.log("Extracting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  console.log("Rendering media...");
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    chromiumOptions: {
      // Trying to run in a sandbox without desktop GUI
      gl: "angle"
    }
  });

  console.log(`Render complete: ${outPath}`);
}
