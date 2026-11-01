import { Bodoni_Moda, Inter, Sora } from "next/font/google";

/**
 * Body, UI and display face. Variable weight, exposed as --font-inter;
 * --font-display points here too, so headings and body share one family.
 */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Editorial serif for cinematic headlines. Exposed as --font-bodoni. */
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bodoni",
});
/**
 * Variable geometric sans for the About page, set through fractional
 * 'wght' values (424, 506, 531...), so it must stay the variable build.
 * Exposed as --font-sora.
 */
export const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
});
