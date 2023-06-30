import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import zipPack from "vite-plugin-zip-pack";

//@ts-ignore
import packageJson from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    zipPack({
      outFileName:
        (packageJson.name || "app") +
        "_" +
        (packageJson.version || "") +
        ".xdc",
    }),
  ],
});
