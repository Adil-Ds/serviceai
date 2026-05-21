import React from "react";
import { Text, View } from "react-native";

// Brand colours extracted from the image
export const BRAND = {
  book: "#EAEAEA",   // near-white for dark backgrounds
  bookDark: "#1A1A2E", // dark for light backgrounds
  n: "#00BCD4",      // cyan / teal
  fix: "#E91E8C",    // pink / magenta
};

/**
 * BookNFix logo rendered as styled inline text.
 *
 * Props:
 *   size        — base font size (default 28)
 *   dark        — if true, "Book" renders dark instead of near-white
 *   style       — extra container style
 *   letterSpacing — optional letter-spacing override
 */
export default function BrandLogo({ size = 28, dark = false, style, letterSpacing = -0.5 }) {
  const bookColor = dark ? BRAND.bookDark : BRAND.book;
  const weight    = "900";
  const fontStyle = {
    fontSize: size,
    fontWeight: weight,
    letterSpacing,
    includeFontPadding: false,
  };

  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline" }, style]}>
      <Text style={[fontStyle, { color: bookColor }]}>Book</Text>
      <Text style={[fontStyle, { color: BRAND.n }]}>N</Text>
      <Text style={[fontStyle, { color: BRAND.fix }]}>Fix</Text>
    </View>
  );
}
