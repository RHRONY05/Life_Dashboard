import {
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Schibsted_Grotesk,
  Hind_Siliguri,
} from "next/font/google";

export const fontSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const fontDisplay = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-display",
  display: "swap",
});

export const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const fontTaka = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-taka",
  preload: false,
  display: "swap",
});
