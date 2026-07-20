import { StyleSheet } from "react-native";

export const C = {
  bg: "#0b1020",
  card: "#161c31",
  card2: "#1e2742",
  fg: "#eef1fb",
  muted: "#9aa3c4",
  accent: "#ff5a7a",
  accent2: "#6c8bff",
  ok: "#34d399",
  border: "#ffffff1f",
};

export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, padding: 20 },
  h1: { color: C.fg, fontSize: 26, fontWeight: "700", marginBottom: 8 },
  h2: { color: C.fg, fontSize: 18, fontWeight: "600", marginBottom: 8 },
  muted: { color: C.muted, fontSize: 15, lineHeight: 21 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ffffff12",
  },
  input: {
    backgroundColor: "#0c1122",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 13,
    color: C.fg,
    fontSize: 16,
    marginBottom: 12,
  },
  primary: {
    backgroundColor: C.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  primaryText: { color: "white", fontSize: 17, fontWeight: "600" },
  secondary: {
    backgroundColor: C.card2,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  secondaryText: { color: C.fg, fontSize: 15, fontWeight: "600" },
  pill: {
    backgroundColor: C.card2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
