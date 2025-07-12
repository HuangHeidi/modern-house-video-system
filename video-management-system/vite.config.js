const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

// https://vitejs.dev/config/
module.exports = defineConfig({
  plugins: [react( )],
  base: "/", // 新增這行，確保靜態資源路徑正確
});
