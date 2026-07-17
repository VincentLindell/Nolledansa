export type Section =
  | "A"
  | "D"
  | "E"
  | "F"
  | "I"
  | "ING"
  | "K"
  | "M"
  | "V"
  | "W";

export type DanceOrganization = "Nollningen" | "Sexmästeriet" | "Festmästeriet" | "Phusk";

export type DanceStatus = "pending" | "approved" | "rejected" | "hidden";
export type DanceEditRequestStatus = "pending" | "approved" | "rejected";
export type DanceEditRequestType = "edit" | "delete" | "hide";
export type SectionChantStatus = "pending" | "approved" | "rejected";

export interface Dance {
  id: string;
  created_at: string;
  title: string;
  section: Section;
  organization?: DanceOrganization | null;
  year: string; // e.g. "23", "24"
  song_title: string;
  dancer_names: string | null;
  artist: string | null;
  spotify_url: string | null;
  video_url: string;
  thumbnail_url: string | null;
  created_by: string | null;
  status: DanceStatus;
  hidden_until: string | null;
  hidden_note: string | null;
  hidden_at: string | null;
  // joined from dance_clicks aggregate
  view_count?: number;
  dance_clicks?: { count: number }[];
}

export interface DanceSegment {
  id: string;
  dance_id: string;
  name: string;
  description: string | null;
  start_time: number; // seconds
  end_time: number;   // seconds
  sort_order: number;
}

export interface DanceClick {
  id: string;
  dance_id: string;
  created_at: string;
  user_id: string | null;
  session_id: string | null;
}

export interface SectionChant {
  id: string;
  created_at: string;
  section: Section;
  name: string;
  melody: string;
  lyrics: string;
  status: SectionChantStatus;
}

export interface DanceEditRequest {
  id: string;
  created_at: string;
  dance_id: string;
  request_type?: DanceEditRequestType | null;
  title: string;
  section: Section;
  organization: DanceOrganization | null;
  year: string;
  song_title: string;
  dancer_names: string | null;
  artist: string | null;
  spotify_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  requester_note: string | null;
  hide_until: string | null;
  hide_indefinitely: boolean | null;
  status: DanceEditRequestStatus;
  resolved_at: string | null;
}

export interface DanceEditRequestSegment {
  id: string;
  request_id: string;
  name: string;
  description: string | null;
  start_time: number;
  end_time: number;
  sort_order: number;
}

// Form types
export interface DanceFormData {
  title: string;
  section: Section;
  organization: DanceOrganization;
  year: string;
  song_title: string;
  dancer_names: string;
  artist: string;
  spotify_url: string;
}

export interface SegmentFormData {
  name: string;
  description: string;
  start_time_str: string; // "mm:ss"
  end_time_str: string;   // "mm:ss"
  sort_order: number;
}

// Trending item returned from query
export interface TrendingDance extends Dance {
  view_count: number;
}
