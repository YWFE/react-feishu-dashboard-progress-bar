import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { semiTheming } from "vite-plugin-semi-theming";
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    plugins: [
        basicSsl(),
        react(),
        semiTheming({
            theme: "@semi-bot/semi-theme-feishu-dashboard",
        }),
    ],
    css: {
        preprocessorOptions: {
            less: {
                javascriptEnabled: true,
            },
        },
    },
    resolve: {
        alias: [
            {
                find: /^~/,
                replacement: '',
            },
            {
                find: '@',
                replacement: resolve(__dirname, './src')
            }
        ],
    },
    server: {
        host: "0.0.0.0",
    },
    externals: {
        react: "React",
        "react-dom": "ReactDOM",
        "antd": "antd",
        "@ant-design/icons": "icons",
        "moment": "moment",
        "html2canvas": "html2canvas",
    }
});
