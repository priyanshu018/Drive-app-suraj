import { supabase } from "./supabaseClient";

export interface TrafficSign {
  id: string;
  name_english: string;
  name_hindi: string;
  meaning: string;
  hindi_meaning: string;
  explanation: string;
  real_life_example: string;
  color: string;
  shape: string;
  video_url: string | null;
  icon_urls: string[];
  sort_order?: number;
  created_at?: string;
}

/**
 * Fetch all traffic signs from the database
 */
export async function getAllTrafficSigns(): Promise<TrafficSign[]> {
  try {
    const { data, error } = await supabase
      .from("traffic_signs")
      .select("*")
      .order("name_english", { ascending: true });

    if (error) {
      console.error("Error fetching traffic signs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getAllTrafficSigns:", error);
    return [];
  }
}

/**
 * Get random traffic signs from the database
 * @param count - Number of random signs to fetch
 */
export async function getRandomSigns(count: number): Promise<TrafficSign[]> {
  try {
    // First, get all signs
    const allSigns = await getAllTrafficSigns();

    if (allSigns.length === 0) {
      return [];
    }

    // Shuffle and take the requested count
    const shuffled = [...allSigns].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  } catch (error) {
    console.error("Error in getRandomSigns:", error);
    return [];
  }
}

/**
 * Get a specific traffic sign by ID
 */
export async function getTrafficSignById(
  id: string
): Promise<TrafficSign | null> {
  try {
    const { data, error } = await supabase
      .from("traffic_signs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching traffic sign:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getTrafficSignById:", error);
    return null;
  }
}

/**
 * Search traffic signs by name (English or Hindi)
 */
export async function searchTrafficSigns(
  query: string
): Promise<TrafficSign[]> {
  try {
    const { data, error } = await supabase
      .from("traffic_signs")
      .select("*")
      .or(`name_english.ilike.%${query}%,name_hindi.ilike.%${query}%`)
      .order("name_english", { ascending: true });

    if (error) {
      console.error("Error searching traffic signs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in searchTrafficSigns:", error);
    return [];
  }
}
