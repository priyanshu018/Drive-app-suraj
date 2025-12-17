import {
  OctagonX,
  TriangleAlert,
  Gauge,
  Ban,
  ParkingCircle,
  Volume2,
  Car,
  Undo2,
  School,
  Navigation,
  ArrowLeftRight,
  MoveHorizontal,
  CloudRain,
  ParkingSquare,
  Hospital,
  Fuel,
  Cross,
  type LucideIcon,
} from "lucide-react-native";

export type { LucideIcon };
export interface TrafficSign {
  id: string;
  icon: LucideIcon;
  nameEnglish: string;
  nameHindi: string;
  category: "mandatory" | "warning" | "informatory" | "prohibition";
  meaning: string;
  hindiMeaning: string;
  explanation: string;
  realLifeExample: string;
  color: string;
  shape: string;
}

export const INDIAN_TRAFFIC_SIGNS: TrafficSign[] = [
  // MANDATORY SIGNS
  {
    id: "stop",
    icon: OctagonX,
    nameEnglish: "Stop",
    nameHindi: "रुकें",
    category: "mandatory",
    meaning: "Stop completely before the intersection",
    hindiMeaning: "चौराहे से पहले पूरी तरह रुकें",
    explanation:
      "Come to a complete halt. Check all directions before proceeding.",
    realLifeExample:
      "At major intersections, railway crossings, or blind turns.",
    color: "#FF0000",
    shape: "Octagon",
  },
  {
    id: "give_way",
    icon: TriangleAlert,
    nameEnglish: "Give Way",
    nameHindi: "रास्ता दें",
    category: "mandatory",
    meaning: "Slow down and give way to traffic on the main road",
    hindiMeaning: "धीमे हो जाएं और मुख्य सड़क पर यातायात को रास्ता दें",
    explanation: "Yield to vehicles on the priority road. Stop if necessary.",
    realLifeExample: "When merging onto highways or entering main roads.",
    color: "#FFFFFF",
    shape: "Inverted Triangle",
  },
  {
    id: "speed_limit_40",
    icon: Gauge,
    nameEnglish: "Speed Limit 40",
    nameHindi: "गति सीमा 40",
    category: "mandatory",
    meaning: "Maximum speed allowed is 40 km/h",
    hindiMeaning: "अधिकतम गति 40 किमी/घंटा है",
    explanation: "Do not exceed 40 km/h in this zone.",
    realLifeExample: "School zones, residential areas, narrow roads.",
    color: "#FF0000",
    shape: "Circle",
  },

  // PROHIBITION SIGNS
  {
    id: "no_entry",
    icon: Ban,
    nameEnglish: "No Entry",
    nameHindi: "प्रवेश निषेध",
    category: "prohibition",
    meaning: "Entry prohibited from this direction",
    hindiMeaning: "इस दिशा से प्रवेश निषेध",
    explanation: "Vehicles cannot enter from this side. Usually one-way roads.",
    realLifeExample: "One-way streets, exit-only gates, restricted zones.",
    color: "#FF0000",
    shape: "Circle",
  },
  {
    id: "no_parking",
    icon: ParkingCircle,
    nameEnglish: "No Parking",
    nameHindi: "पार्किंग निषेध",
    category: "prohibition",
    meaning: "Parking not allowed in this area",
    hindiMeaning: "इस क्षेत्र में पार्किंग की अनुमति नहीं",
    explanation:
      "Stopping for loading/unloading may be allowed but not parking.",
    realLifeExample: "Busy roads, fire lanes, near hospitals.",
    color: "#FF0000",
    shape: "Circle",
  },
  {
    id: "no_horn",
    icon: Volume2,
    nameEnglish: "No Horn",
    nameHindi: "हॉर्न निषेध",
    category: "prohibition",
    meaning: "Horn use prohibited",
    hindiMeaning: "हॉर्न बजाना मना है",
    explanation: "Do not use horn in this zone.",
    realLifeExample: "Near hospitals, schools, silence zones.",
    color: "#FF0000",
    shape: "Circle",
  },
  {
    id: "no_overtaking",
    icon: Car,
    nameEnglish: "No Overtaking",
    nameHindi: "ओवरटेक निषेध",
    category: "prohibition",
    meaning: "Overtaking not allowed",
    hindiMeaning: "ओवरटेक करना मना है",
    explanation: "Stay in your lane. Do not overtake.",
    realLifeExample: "Narrow roads, blind curves, near schools.",
    color: "#FF0000",
    shape: "Circle",
  },
  {
    id: "no_u_turn",
    icon: Undo2,
    nameEnglish: "No U-Turn",
    nameHindi: "यू-टर्न निषेध",
    category: "prohibition",
    meaning: "U-turn not permitted",
    hindiMeaning: "यू-टर्न की अनुमति नहीं",
    explanation: "Continue ahead. Find another route to turn.",
    realLifeExample: "Busy intersections, highways.",
    color: "#FF0000",
    shape: "Circle",
  },

  // WARNING SIGNS
  {
    id: "school_ahead",
    icon: School,
    nameEnglish: "School Ahead",
    nameHindi: "स्कूल आगे",
    category: "warning",
    meaning: "School zone ahead - children may cross",
    hindiMeaning: "आगे स्कूल क्षेत्र - बच्चे रास्ता पार कर सकते हैं",
    explanation: "Reduce speed. Be alert for children crossing the road.",
    realLifeExample: "Near schools, especially during school hours.",
    color: "#FF0000",
    shape: "Triangle",
  },
  {
    id: "sharp_curve",
    icon: Navigation,
    nameEnglish: "Sharp Curve",
    nameHindi: "तीखा मोड़",
    category: "warning",
    meaning: "Sharp curve ahead - reduce speed",
    hindiMeaning: "आगे तीखा मोड़ - गति कम करें",
    explanation:
      "Slow down before entering the curve. Use horn on blind curves.",
    realLifeExample: "Mountain roads, rural highways.",
    color: "#FF0000",
    shape: "Triangle",
  },
  {
    id: "two_way_traffic",
    icon: ArrowLeftRight,
    nameEnglish: "Two-Way Traffic",
    nameHindi: "दो तरफा यातायात",
    category: "warning",
    meaning: "Road ahead has traffic from both directions",
    hindiMeaning: "आगे सड़क पर दोनों दिशाओं से यातायात",
    explanation: "Stay on your side. Divided road ends ahead.",
    realLifeExample: "Where divided highway becomes two-way road.",
    color: "#FF0000",
    shape: "Triangle",
  },
  {
    id: "narrow_road",
    icon: MoveHorizontal,
    nameEnglish: "Narrow Road Ahead",
    nameHindi: "आगे संकरी सड़क",
    category: "warning",
    meaning: "Road becomes narrower ahead",
    hindiMeaning: "आगे सड़क संकरी हो जाती है",
    explanation: "Reduce speed and be prepared to give way.",
    realLifeExample: "Construction zones, bridges, village roads.",
    color: "#FF0000",
    shape: "Triangle",
  },
  {
    id: "slippery_road",
    icon: CloudRain,
    nameEnglish: "Slippery Road",
    nameHindi: "फिसलन वाली सड़क",
    category: "warning",
    meaning: "Road may be slippery when wet",
    hindiMeaning: "गीली होने पर सड़क फिसलन भरी हो सकती है",
    explanation: "Reduce speed in rain. Avoid sudden braking.",
    realLifeExample: "During monsoon, near water bodies.",
    color: "#FF0000",
    shape: "Triangle",
  },

  // INFORMATORY SIGNS
  {
    id: "parking_allowed",
    icon: ParkingSquare,
    nameEnglish: "Parking",
    nameHindi: "पार्किंग",
    category: "informatory",
    meaning: "Parking facility available",
    hindiMeaning: "पार्किंग सुविधा उपलब्ध",
    explanation: "You can park your vehicle in this area.",
    realLifeExample: "Public parking lots, designated parking zones.",
    color: "#0066CC",
    shape: "Rectangle",
  },
  {
    id: "hospital",
    icon: Hospital,
    nameEnglish: "Hospital",
    nameHindi: "अस्पताल",
    category: "informatory",
    meaning: "Hospital nearby - maintain silence",
    hindiMeaning: "अस्पताल नज़दीक - शांति बनाए रखें",
    explanation: "Avoid using horn. Drive quietly.",
    realLifeExample: "Near hospitals and medical facilities.",
    color: "#0066CC",
    shape: "Rectangle",
  },
  {
    id: "petrol_pump",
    icon: Fuel,
    nameEnglish: "Petrol Pump",
    nameHindi: "पेट्रोल पंप",
    category: "informatory",
    meaning: "Fuel station ahead",
    hindiMeaning: "आगे ईंधन स्टेशन",
    explanation: "Refueling facility available ahead.",
    realLifeExample: "On highways and main roads.",
    color: "#0066CC",
    shape: "Rectangle",
  },
  {
    id: "first_aid",
    icon: Cross,
    nameEnglish: "First Aid",
    nameHindi: "प्राथमिक चिकित्सा",
    category: "informatory",
    meaning: "First aid post available",
    hindiMeaning: "प्राथमिक चिकित्सा उपलब्ध",
    explanation: "Emergency medical help available.",
    realLifeExample: "On highways, tourist spots.",
    color: "#0066CC",
    shape: "Rectangle",
  },
];

// Helper functions
export const getSignsByCategory = (category: TrafficSign["category"]) => {
  return INDIAN_TRAFFIC_SIGNS.filter((sign) => sign.category === category);
};

export const getSignById = (id: string) => {
  return INDIAN_TRAFFIC_SIGNS.find((sign) => sign.id === id);
};

export const searchSigns = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return INDIAN_TRAFFIC_SIGNS.filter(
    (sign) =>
      sign.nameEnglish.toLowerCase().includes(lowerQuery) ||
      sign.nameHindi.includes(query) ||
      sign.meaning.toLowerCase().includes(lowerQuery)
  );
};

export const getRandomSigns = (count: number) => {
  const shuffled = [...INDIAN_TRAFFIC_SIGNS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
