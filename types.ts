

export type SegmentType = 'text' | 'random' | 'label';

export interface Segment {
  id: string;
  type: SegmentType;
  // For text segments: content is the plain text
  // For random segments: content is the list of options
  // For label segments: content is the label name
  content: string | string[]; 
  // For random segments: the currently selected option to display
  activeValue?: string;
  // For random segments: indices of options that are temporarily disabled/ignored
  disabledIndices?: number[];
  // For label segments: the highlight color
  color?: string;
  // For label segments: the icon identifier
  icon?: string;
}

export interface SelectionState {
  startId: string | null;
  endId: string | null;
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface SectionGroup {
  labelSegment?: Segment;
  contentSegments: Segment[];
}

export interface SavedProject {
  id: string;
  name: string;
  segments: Segment[];
  updatedAt: number;
}

export interface OptionPreset {
  id: string;
  name: string;
  options: string[];
}

export interface SectionPreset {
  id: string;
  name: string;
  data: Segment[];
}
