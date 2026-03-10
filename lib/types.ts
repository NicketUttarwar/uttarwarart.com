/** Manifest and section types from source_images/<id>/manifest.json */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Section {
  index: number;
  filename: string;
  bounds: Bounds;
  rotation_degrees: number;
  source_width: number;
  source_height: number;
  section_type: string;
  output_width_px: number;
  output_height_px: number;
  origin_x: number;
  origin_y: number;
  width_px: number;
  height_px: number;
  corners: [number, number][];
  position_rank: number;
  centroid_x: number;
  centroid_y: number;
}

export interface SectionRelations {
  left_of: number[];
  right_of: number[];
  above: number[];
  below: number[];
}

export interface Layout {
  reading_order: number[];
  description: string;
  section_relations: SectionRelations[];
}

export interface Manifest {
  source_filename: string;
  source_width: number;
  source_height: number;
  sections: Section[];
  composite_filename: string;
  composite_recreated_filename: string;
  layout: Layout;
}

/** Output of symmetry layout: adjusted placement for UI */
export interface SymmetrySectionPlacement {
  sectionIndex: number;
  displayOrder: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  /** Normalized 0-1: which edge section "comes from" for outside-in animation */
  entranceEdge: "left" | "right" | "top" | "bottom";
}

export type SymmetryLayoutResult = SymmetrySectionPlacement[];
