export type ProcessingStatus =
  | "uploaded"
  | "processing"
  | "extracting_text"
  | "validating_text"
  | "sample_ocr"
  | "full_ocr"
  | "gemini_ocr"
  | "scene_detection"
  | "completed"
  | "corrected"
  | "failed";

export type ProcessingSummary = {
  language: string;
  language_code: string | null;
  structure_type: string;
  total_scenes: number;
  processing_status: ProcessingStatus;
  processing_progress: number;
  processing_message: string | null;
};

export type Scene = {
  id: string;
  script_id: string;
  scene_number: number;
  heading: string;
  content: string;
  created_at: string;
};

export type SceneListResponse = {
  script_id: string;
  total_scenes: number;
  scenes: Scene[];
};
