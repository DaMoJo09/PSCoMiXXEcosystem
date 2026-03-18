import type { PageTemplate } from "@/types/layout-types";

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "single",
    name: "Splash",
    rows: 1,
    cols: 1,
    panels: [{ row: 1, col: 1, rowSpan: 1, colSpan: 1 }],
  },
  {
    id: "2-equal",
    name: "2 Rows",
    rows: 2,
    cols: 1,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  {
    id: "3-equal",
    name: "3 Rows",
    rows: 3,
    cols: 1,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 3, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  {
    id: "2x2",
    name: "2×2 Grid",
    rows: 2,
    cols: 2,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 2, rowSpan: 1, colSpan: 1 },
    ],
  },
  {
    id: "3x3",
    name: "3×3 Grid",
    rows: 3,
    cols: 3,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 3, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 3, rowSpan: 1, colSpan: 1 },
      { row: 3, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 3, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 3, col: 3, rowSpan: 1, colSpan: 1 },
    ],
  },
  {
    id: "manga-right",
    name: "Manga",
    rows: 3,
    cols: 2,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 2 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 2, rowSpan: 2, colSpan: 1 },
      { row: 3, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  {
    id: "action",
    name: "Action",
    rows: 2,
    cols: 3,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 3 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 3, rowSpan: 1, colSpan: 1 },
    ],
  },
  {
    id: "widescreen",
    name: "Strips",
    rows: 3,
    cols: 1,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 3, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  {
    id: "l-shape",
    name: "L-Shape",
    rows: 2,
    cols: 2,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 2 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  {
    id: "diagonal",
    name: "Dynamic",
    rows: 2,
    cols: 2,
    panels: [
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 2, rowSpan: 2, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
];
