// SQLite uses strings instead of enums
type TravelStyle = string;
type TravelPace = string;
type Currency = string;

interface GenerateItineraryInput {
  destination: string;
  country: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  currency: Currency;
  travelerCount: number;
  travelStyle: TravelStyle;
  interests: string[];
  pace: TravelPace;
  constraints: string[];
  latitude: number;
  longitude: number;
}

interface ItineraryDayOutput {
  dayNumber: number;
  date: Date;
  title: string;
  items: ItineraryItemOutput[];
  dailyCost: number;
}

interface ItineraryItemOutput {
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  startTime: string;
  endTime: string;
  estimatedCost: number;
  category: string;
  tags: string[];
  notes: string;
  crowdLevel: string;
  weatherNote: string;
}

// ─── DESTINATION DATABASE ─────────────────────────

const DESTINATION_DATA: Record<string, {
  activities: Array<{
    name: string; desc: string; category: string; cost: number;
    tags: string[]; duration: string; crowd: string; lat: number; lng: number;
  }>;
  restaurants: Array<{
    name: string; desc: string; cuisine: string; cost: number;
    tags: string[]; lat: number; lng: number;
  }>;
  morningActivities: string[];
  afternoonActivities: string[];
  eveningActivities: string[];
}> = {
  'Istanbul': {
    activities: [
      { name: 'Hagia Sophia', desc: 'Iconic 6th-century cathedral turned mosque with stunning Byzantine architecture', category: 'landmark', cost: 0, tags: ['history', 'architecture', 'culture'], duration: '2h', crowd: 'High', lat: 41.0086, lng: 28.9802 },
      { name: 'Blue Mosque', desc: 'Magnificent Ottoman-era mosque with six minarets and blue İznik tiles', category: 'landmark', cost: 0, tags: ['history', 'architecture', 'culture'], duration: '1h', crowd: 'High', lat: 41.0054, lng: 28.9768 },
      { name: 'Grand Bazaar', desc: 'One of the world\'s oldest and largest covered markets with 4,000+ shops', category: 'shopping', cost: 50, tags: ['shopping', 'culture', 'local'], duration: '3h', crowd: 'Very High', lat: 41.0106, lng: 28.9680 },
      { name: 'Topkapi Palace', desc: 'Ottoman imperial palace with stunning courtyards, treasures, and Bosphorus views', category: 'museum', cost: 30, tags: ['history', 'museum', 'culture'], duration: '3h', crowd: 'Moderate', lat: 41.0115, lng: 28.9833 },
      { name: 'Bosphorus Cruise', desc: 'Scenic boat tour along the strait separating Europe and Asia', category: 'tour', cost: 25, tags: ['scenic', 'relaxation', 'photography'], duration: '2h', crowd: 'Moderate', lat: 41.0245, lng: 29.0049 },
      { name: 'Basilica Cistern', desc: 'Underground Byzantine water storage with mysterious Medusa columns', category: 'landmark', cost: 20, tags: ['history', 'architecture', 'unique'], duration: '1h', crowd: 'Moderate', lat: 41.0084, lng: 28.9779 },
      { name: 'Spice Bazaar', desc: 'Colorful Egyptian bazaar filled with spices, teas, and Turkish delight', category: 'shopping', cost: 20, tags: ['food', 'shopping', 'culture'], duration: '1.5h', crowd: 'High', lat: 41.0167, lng: 28.9706 },
      { name: 'Galata Tower', desc: 'Medieval stone tower offering panoramic views of the Golden Horn and city', category: 'landmark', cost: 15, tags: ['scenic', 'photography', 'history'], duration: '1h', crowd: 'High', lat: 41.0256, lng: 28.9741 },
      { name: 'Dolmabahçe Palace', desc: 'Opulent 19th-century palace blending Ottoman and European styles', category: 'museum', cost: 25, tags: ['history', 'architecture', 'luxury'], duration: '2h', crowd: 'Moderate', lat: 41.0391, lng: 29.0005 },
      { name: 'Süleymaniye Mosque', desc: 'Masterpiece of Ottoman architect Sinan with stunning city views', category: 'landmark', cost: 0, tags: ['architecture', 'history', 'spiritual'], duration: '1h', crowd: 'Low', lat: 41.0162, lng: 28.9637 },
      { name: 'Istanbul Modern Art Museum', desc: 'Contemporary art museum on the Bosphorus waterfront', category: 'museum', cost: 15, tags: ['art', 'modern', 'culture'], duration: '2h', crowd: 'Low', lat: 41.0265, lng: 28.9835 },
      { name: 'Prince\'s Islands Ferry', desc: 'Day trip to car-free islands with horse carriages and pine forests', category: 'tour', cost: 10, tags: ['nature', 'relaxation', 'scenic'], duration: '6h', crowd: 'Moderate', lat: 40.8716, lng: 29.1233 },
      { name: 'Turkish Bath Experience', desc: 'Traditional hammam with steam, scrub, and massage', category: 'activity', cost: 60, tags: ['relaxation', 'wellness', 'culture'], duration: '2h', crowd: 'Low', lat: 41.0080, lng: 28.9760 },
      { name: 'Istiklal Avenue Walk', desc: 'Lively pedestrian avenue with shops, galleries, and street performers', category: 'activity', cost: 0, tags: ['walking', 'shopping', 'nightlife'], duration: '2h', crowd: 'Very High', lat: 41.0335, lng: 28.9770 },
    ],
    restaurants: [
      { name: 'Nusr-Et Steakhouse', desc: 'Famous steakhouse by Salt Bae', cuisine: 'Turkish', cost: 80, tags: ['luxury', 'steak'], lat: 41.0490, lng: 29.0340 },
      { name: 'Çiya Sofrası', desc: 'Authentic Anatolian cuisine in Kadıköy', cuisine: 'Turkish', cost: 20, tags: ['local', 'authentic'], lat: 40.9906, lng: 29.0254 },
      { name: 'Karaköy Güllüoğlu', desc: 'Famous baklava shop since 1949', cuisine: 'Dessert', cost: 10, tags: ['dessert', 'local'], lat: 41.0214, lng: 28.9768 },
      { name: 'Mikla Restaurant', desc: 'Fine dining with Bosphorus views by chef Mehmet Gürs', cuisine: 'Modern Turkish', cost: 100, tags: ['fine-dining', 'views'], lat: 41.0328, lng: 28.9766 },
      { name: 'Sultanahmet Köftecisi', desc: 'Historic meatball restaurant since 1920', cuisine: 'Turkish', cost: 12, tags: ['local', 'budget', 'historic'], lat: 41.0079, lng: 28.9757 },
    ],
    morningActivities: ['Hagia Sophia', 'Blue Mosque', 'Topkapi Palace', 'Dolmabahçe Palace', 'Süleymaniye Mosque'],
    afternoonActivities: ['Grand Bazaar', 'Bosphorus Cruise', 'Basilica Cistern', 'Istanbul Modern Art Museum', 'Prince\'s Islands Ferry', 'Spice Bazaar'],
    eveningActivities: ['Galata Tower', 'Istiklal Avenue Walk', 'Turkish Bath Experience', 'Bosphorus dinner cruise'],
  },
  'Paris': {
    activities: [
      { name: 'Eiffel Tower', desc: 'Iconic iron lattice tower and symbol of Paris with stunning city views', category: 'landmark', cost: 25, tags: ['landmark', 'views', 'romantic'], duration: '2h', crowd: 'Very High', lat: 48.8584, lng: 2.2945 },
      { name: 'Louvre Museum', desc: 'World\'s largest art museum housing the Mona Lisa and 35,000+ works', category: 'museum', cost: 17, tags: ['art', 'museum', 'culture'], duration: '4h', crowd: 'Very High', lat: 48.8606, lng: 2.3376 },
      { name: 'Musée d\'Orsay', desc: 'Impressionist art collection in a beautiful former railway station', category: 'museum', cost: 16, tags: ['art', 'impressionism', 'architecture'], duration: '3h', crowd: 'High', lat: 48.8600, lng: 2.3266 },
      { name: 'Notre-Dame Cathedral', desc: 'Legendary Gothic cathedral on Île de la Cité (exterior viewing)', category: 'landmark', cost: 0, tags: ['architecture', 'history', 'gothic'], duration: '1h', crowd: 'High', lat: 48.8530, lng: 2.3499 },
      { name: 'Montmartre & Sacré-Cœur', desc: 'Artistic hilltop neighborhood with stunning basilica views', category: 'landmark', cost: 0, tags: ['views', 'art', 'bohemian'], duration: '3h', crowd: 'Moderate', lat: 48.8867, lng: 2.3431 },
      { name: 'Seine River Cruise', desc: 'Relaxing boat tour passing Paris\'s most famous landmarks', category: 'tour', cost: 15, tags: ['scenic', 'romantic', 'relaxation'], duration: '1.5h', crowd: 'Moderate', lat: 48.8600, lng: 2.3200 },
      { name: 'Champs-Élysées Walk', desc: 'Famous tree-lined avenue leading to the Arc de Triomphe', category: 'activity', cost: 0, tags: ['shopping', 'walking', 'landmark'], duration: '2h', crowd: 'High', lat: 48.8698, lng: 2.3075 },
      { name: 'Palace of Versailles', desc: 'Opulent royal residence with magnificent gardens', category: 'museum', cost: 21, tags: ['history', 'architecture', 'gardens'], duration: '5h', crowd: 'High', lat: 48.8049, lng: 2.1204 },
      { name: 'Latin Quarter Exploration', desc: 'Vibrant student district with bookshops, cafés, and history', category: 'activity', cost: 0, tags: ['culture', 'walking', 'bohemian'], duration: '2h', crowd: 'Moderate', lat: 48.8505, lng: 2.3471 },
    ],
    restaurants: [
      { name: 'Le Comptoir du Panthéon', desc: 'Classic Parisian brasserie near the Panthéon', cuisine: 'French', cost: 35, tags: ['classic', 'brasserie'], lat: 48.8462, lng: 2.3466 },
      { name: 'Café de Flore', desc: 'Legendary literary café in Saint-Germain', cuisine: 'French', cost: 25, tags: ['historic', 'café'], lat: 48.8542, lng: 2.3327 },
      { name: 'L\'As du Fallafel', desc: 'Best falafel in Paris in the Marais district', cuisine: 'Middle Eastern', cost: 10, tags: ['budget', 'street-food'], lat: 48.8570, lng: 2.3580 },
      { name: 'Breizh Café', desc: 'Outstanding buckwheat galettes and crêpes', cuisine: 'French', cost: 18, tags: ['crêpes', 'casual'], lat: 48.8599, lng: 2.3611 },
    ],
    morningActivities: ['Eiffel Tower', 'Louvre Museum', 'Palace of Versailles', 'Montmartre & Sacré-Cœur'],
    afternoonActivities: ['Musée d\'Orsay', 'Notre-Dame Cathedral', 'Latin Quarter Exploration', 'Champs-Élysées Walk'],
    eveningActivities: ['Seine River Cruise', 'Eiffel Tower light show', 'Montmartre dinner'],
  },
  'Tokyo': {
    activities: [
      { name: 'Senso-ji Temple', desc: 'Tokyo\'s oldest temple in Asakusa with a vibrant thunder gate', category: 'landmark', cost: 0, tags: ['spiritual', 'culture', 'history'], duration: '2h', crowd: 'High', lat: 35.7148, lng: 139.7967 },
      { name: 'Shibuya Crossing', desc: 'World\'s busiest pedestrian crossing — an iconic Tokyo experience', category: 'landmark', cost: 0, tags: ['urban', 'photography', 'iconic'], duration: '0.5h', crowd: 'Very High', lat: 35.6595, lng: 139.7004 },
      { name: 'Meiji Shrine', desc: 'Serene Shinto shrine in a forested park in Harajuku', category: 'landmark', cost: 0, tags: ['spiritual', 'nature', 'peaceful'], duration: '1.5h', crowd: 'Moderate', lat: 35.6764, lng: 139.6993 },
      { name: 'Tsukiji Outer Market', desc: 'Famous food market with fresh sushi, street food, and seafood', category: 'food', cost: 30, tags: ['food', 'market', 'sushi'], duration: '2h', crowd: 'High', lat: 35.6654, lng: 139.7707 },
      { name: 'Akihabara Electric Town', desc: 'Nerdy paradise for anime, manga, electronics, and maid cafés', category: 'shopping', cost: 20, tags: ['anime', 'tech', 'gaming', 'unique'], duration: '3h', crowd: 'High', lat: 35.7022, lng: 139.7741 },
      { name: 'TeamLab Borderless', desc: 'Immersive digital art museum with stunning interactive exhibits', category: 'museum', cost: 32, tags: ['art', 'technology', 'unique', 'instagram'], duration: '2.5h', crowd: 'High', lat: 35.6260, lng: 139.7839 },
      { name: 'Shinjuku Gyoen', desc: 'Beautiful national garden blending Japanese, English, and French styles', category: 'park', cost: 5, tags: ['nature', 'relaxation', 'gardens'], duration: '2h', crowd: 'Moderate', lat: 35.6852, lng: 139.7100 },
      { name: 'Tokyo Skytree', desc: 'Tallest tower in Japan with observation decks at 350m and 450m', category: 'landmark', cost: 25, tags: ['views', 'modern', 'photography'], duration: '1.5h', crowd: 'High', lat: 35.7101, lng: 139.8107 },
      { name: 'Harajuku Takeshita Street', desc: 'Quirky youth fashion street with crêpes and kawaii culture', category: 'shopping', cost: 15, tags: ['fashion', 'youth', 'unique', 'kawaii'], duration: '1.5h', crowd: 'Very High', lat: 35.6707, lng: 139.7026 },
    ],
    restaurants: [
      { name: 'Ichiran Ramen', desc: 'Famous solo-booth ramen chain with customizable tonkotsu', cuisine: 'Japanese', cost: 12, tags: ['ramen', 'budget', 'iconic'], lat: 35.6595, lng: 139.7004 },
      { name: 'Sukiyabashi Jiro', desc: 'Legendary sushi restaurant featured in documentary', cuisine: 'Sushi', cost: 250, tags: ['sushi', 'luxury', 'michelin'], lat: 35.6738, lng: 139.7632 },
      { name: 'Afuri Ramen', desc: 'Light yuzu shio ramen in a modern setting', cuisine: 'Japanese', cost: 12, tags: ['ramen', 'casual'], lat: 35.6569, lng: 139.7097 },
    ],
    morningActivities: ['Senso-ji Temple', 'Meiji Shrine', 'Tsukiji Outer Market', 'Shinjuku Gyoen'],
    afternoonActivities: ['Shibuya Crossing', 'Akihabara Electric Town', 'TeamLab Borderless', 'Harajuku Takeshita Street'],
    eveningActivities: ['Tokyo Skytree', 'Shinjuku nightlife', 'Golden Gai bar hopping'],
  },
  'Rome': {
    activities: [
      { name: 'Colosseum', desc: 'Ancient amphitheater and icon of Imperial Rome', category: 'landmark', cost: 18, tags: ['history', 'architecture', 'ancient'], duration: '2h', crowd: 'Very High', lat: 41.8902, lng: 12.4922 },
      { name: 'Vatican Museums & Sistine Chapel', desc: 'Vast art collection with Michelangelo\'s ceiling masterpiece', category: 'museum', cost: 17, tags: ['art', 'religion', 'culture'], duration: '4h', crowd: 'Very High', lat: 41.9065, lng: 12.4536 },
      { name: 'Pantheon', desc: 'Best-preserved ancient Roman temple with its famous dome', category: 'landmark', cost: 5, tags: ['architecture', 'history', 'ancient'], duration: '1h', crowd: 'High', lat: 41.8986, lng: 12.4769 },
      { name: 'Trevi Fountain', desc: 'Baroque masterpiece — toss a coin to ensure your return to Rome', category: 'landmark', cost: 0, tags: ['romantic', 'landmark', 'photography'], duration: '0.5h', crowd: 'Very High', lat: 41.9009, lng: 12.4833 },
      { name: 'Roman Forum', desc: 'Ruins of the ancient city center of the Roman Empire', category: 'landmark', cost: 18, tags: ['history', 'ancient', 'ruins'], duration: '2h', crowd: 'High', lat: 41.8925, lng: 12.4853 },
      { name: 'Trastevere Walk', desc: 'Charming medieval neighborhood with cobblestone streets and trattorias', category: 'activity', cost: 0, tags: ['walking', 'food', 'local'], duration: '2h', crowd: 'Moderate', lat: 41.8870, lng: 12.4700 },
      { name: 'Spanish Steps', desc: 'Monumental stairway of 135 steps connecting two famous piazzas', category: 'landmark', cost: 0, tags: ['landmark', 'photography', 'romantic'], duration: '0.5h', crowd: 'High', lat: 41.9060, lng: 12.4828 },
      { name: 'Borghese Gallery', desc: 'Stunning collection of Bernini sculptures and Caravaggio paintings', category: 'museum', cost: 15, tags: ['art', 'sculpture', 'culture'], duration: '2h', crowd: 'Moderate', lat: 41.9142, lng: 12.4921 },
    ],
    restaurants: [
      { name: 'Da Enzo al 29', desc: 'Beloved trattoria for cacio e pepe in Trastevere', cuisine: 'Italian', cost: 18, tags: ['local', 'pasta', 'traditional'], lat: 41.8854, lng: 12.4690 },
      { name: 'Roscioli', desc: 'Gourmet deli with exceptional pasta and wine selection', cuisine: 'Italian', cost: 35, tags: ['gourmet', 'wine', 'pasta'], lat: 41.8951, lng: 12.4735 },
      { name: 'Pizzarium', desc: 'Best pizza al taglio by Gabriele Bonci', cuisine: 'Pizza', cost: 8, tags: ['pizza', 'budget', 'casual'], lat: 41.9072, lng: 12.4432 },
    ],
    morningActivities: ['Colosseum', 'Vatican Museums & Sistine Chapel', 'Borghese Gallery'],
    afternoonActivities: ['Pantheon', 'Roman Forum', 'Trastevere Walk', 'Spanish Steps'],
    eveningActivities: ['Trevi Fountain at sunset', 'Trastevere dinner', 'Piazza Navona walk'],
  },
  'Barcelona': {
    activities: [
      { name: 'Sagrada Família', desc: 'Gaudí\'s unfinished masterpiece basilica — a UNESCO World Heritage site', category: 'landmark', cost: 26, tags: ['architecture', 'art', 'gaudi'], duration: '2h', crowd: 'Very High', lat: 41.4036, lng: 2.1744 },
      { name: 'Park Güell', desc: 'Colorful mosaic park designed by Gaudí with panoramic city views', category: 'park', cost: 10, tags: ['art', 'gaudi', 'views', 'nature'], duration: '2h', crowd: 'High', lat: 41.4145, lng: 2.1527 },
      { name: 'La Boqueria Market', desc: 'Famous food market on La Rambla with vibrant stalls', category: 'food', cost: 15, tags: ['food', 'market', 'local'], duration: '1.5h', crowd: 'Very High', lat: 41.3816, lng: 2.1719 },
      { name: 'Gothic Quarter Walk', desc: 'Medieval labyrinth of narrow streets, plazas, and hidden gems', category: 'activity', cost: 0, tags: ['history', 'walking', 'culture'], duration: '2h', crowd: 'Moderate', lat: 41.3833, lng: 2.1761 },
      { name: 'Casa Batlló', desc: 'Gaudí\'s fantastical apartment building on Passeig de Gràcia', category: 'landmark', cost: 35, tags: ['architecture', 'gaudi', 'art'], duration: '1.5h', crowd: 'High', lat: 41.3916, lng: 2.1650 },
      { name: 'Barceloneta Beach', desc: 'Popular city beach with promenades and seafood restaurants', category: 'activity', cost: 0, tags: ['beach', 'relaxation', 'sun'], duration: '3h', crowd: 'High', lat: 41.3784, lng: 2.1925 },
      { name: 'Camp Nou Tour', desc: 'FC Barcelona\'s legendary stadium and museum experience', category: 'activity', cost: 28, tags: ['sports', 'football', 'culture'], duration: '2h', crowd: 'Moderate', lat: 41.3809, lng: 2.1228 },
    ],
    restaurants: [
      { name: 'Cal Pep', desc: 'Legendary tapas bar near the beach', cuisine: 'Spanish', cost: 40, tags: ['tapas', 'seafood'], lat: 41.3839, lng: 2.1833 },
      { name: 'La Pepita', desc: 'Creative tapas in trendy Gràcia neighborhood', cuisine: 'Spanish', cost: 20, tags: ['tapas', 'modern'], lat: 41.4008, lng: 2.1568 },
      { name: 'Bar Cañete', desc: 'Vibrant tapas bar on Carrer de la Unió', cuisine: 'Spanish', cost: 30, tags: ['tapas', 'wine'], lat: 41.3805, lng: 2.1730 },
    ],
    morningActivities: ['Sagrada Família', 'Park Güell', 'La Boqueria Market'],
    afternoonActivities: ['Gothic Quarter Walk', 'Casa Batlló', 'Barceloneta Beach', 'Camp Nou Tour'],
    eveningActivities: ['Gothic Quarter tapas crawl', 'Barceloneta sunset', 'Flamenco show'],
  },
  'London': {
    activities: [
      { name: 'British Museum', desc: 'World-famous museum with Egyptian mummies and the Rosetta Stone', category: 'museum', cost: 0, tags: ['museum', 'history', 'culture', 'free'], duration: '3h', crowd: 'High', lat: 51.5194, lng: -0.1270 },
      { name: 'Tower of London', desc: 'Historic castle housing the Crown Jewels and a 1000-year history', category: 'landmark', cost: 30, tags: ['history', 'castle', 'crown'], duration: '3h', crowd: 'High', lat: 51.5081, lng: -0.0759 },
      { name: 'Westminster Abbey & Parliament', desc: 'Gothic abbey and seat of British democracy with Big Ben views', category: 'landmark', cost: 25, tags: ['architecture', 'history', 'politics'], duration: '2h', crowd: 'High', lat: 51.4994, lng: -0.1275 },
      { name: 'Buckingham Palace', desc: 'Official London residence of the monarch with Changing of the Guard', category: 'landmark', cost: 0, tags: ['royalty', 'ceremony', 'landmark'], duration: '1h', crowd: 'Very High', lat: 51.5014, lng: -0.1419 },
      { name: 'Borough Market', desc: 'London\'s most renowned food market with artisan producers', category: 'food', cost: 20, tags: ['food', 'market', 'gourmet'], duration: '2h', crowd: 'High', lat: 51.5055, lng: -0.0910 },
      { name: 'Tate Modern', desc: 'World-class modern art in a converted power station on the Thames', category: 'museum', cost: 0, tags: ['art', 'modern', 'free'], duration: '2h', crowd: 'Moderate', lat: 51.5076, lng: -0.0994 },
    ],
    restaurants: [
      { name: 'Dishoom', desc: 'Bombay-inspired café with legendary bacon naan roll', cuisine: 'Indian', cost: 20, tags: ['indian', 'brunch'], lat: 51.5174, lng: -0.1294 },
      { name: 'Sketch', desc: 'Eccentric fine dining with Instagram-famous pink room', cuisine: 'European', cost: 50, tags: ['luxury', 'unique', 'instagram'], lat: 51.5129, lng: -0.1411 },
    ],
    morningActivities: ['British Museum', 'Tower of London', 'Westminster Abbey & Parliament'],
    afternoonActivities: ['Buckingham Palace', 'Borough Market', 'Tate Modern'],
    eveningActivities: ['Thames river walk', 'West End theatre', 'Soho dinner'],
  },
  'Dubai': {
    activities: [
      { name: 'Burj Khalifa', desc: 'World\'s tallest building with observation deck at 555m', category: 'landmark', cost: 40, tags: ['views', 'modern', 'iconic', 'record'], duration: '2h', crowd: 'High', lat: 25.1972, lng: 55.2744 },
      { name: 'Dubai Mall', desc: 'World\'s largest shopping mall with aquarium and ice rink', category: 'shopping', cost: 0, tags: ['shopping', 'luxury', 'entertainment'], duration: '4h', crowd: 'Very High', lat: 25.1986, lng: 55.2796 },
      { name: 'Desert Safari', desc: 'Dune bashing, camel riding, and BBQ dinner under the stars', category: 'tour', cost: 60, tags: ['adventure', 'desert', 'unique'], duration: '6h', crowd: 'Moderate', lat: 25.0500, lng: 55.3000 },
      { name: 'Dubai Creek & Gold Souk', desc: 'Historic trading area with traditional abra boats and gold markets', category: 'shopping', cost: 5, tags: ['culture', 'shopping', 'traditional'], duration: '2h', crowd: 'Moderate', lat: 25.2621, lng: 55.2972 },
      { name: 'Palm Jumeirah', desc: 'Iconic man-made island with luxury hotels and Atlantis resort', category: 'landmark', cost: 0, tags: ['luxury', 'beach', 'iconic'], duration: '3h', crowd: 'Moderate', lat: 25.1124, lng: 55.1390 },
    ],
    restaurants: [
      { name: 'Al Mahara', desc: 'Underwater seafood restaurant in Burj Al Arab', cuisine: 'Seafood', cost: 200, tags: ['luxury', 'unique', 'seafood'], lat: 25.1413, lng: 55.1853 },
      { name: 'Ravi Restaurant', desc: 'Legendary Pakistani eatery loved by locals', cuisine: 'Pakistani', cost: 8, tags: ['budget', 'local', 'authentic'], lat: 25.2316, lng: 55.2783 },
    ],
    morningActivities: ['Burj Khalifa', 'Dubai Creek & Gold Souk'],
    afternoonActivities: ['Dubai Mall', 'Palm Jumeirah', 'Desert Safari'],
    eveningActivities: ['Desert Safari dinner', 'Dubai Fountain show', 'Marina walk'],
  },
  'Baku': {
    activities: [
      { name: 'Old City (Icherisheher)', desc: 'UNESCO-listed medieval walled city with narrow alleys and palaces', category: 'landmark', cost: 0, tags: ['history', 'culture', 'UNESCO'], duration: '3h', crowd: 'Moderate', lat: 40.3663, lng: 49.8372 },
      { name: 'Flame Towers', desc: 'Iconic trio of glass skyscrapers shaped like flames', category: 'landmark', cost: 0, tags: ['modern', 'architecture', 'iconic'], duration: '1h', crowd: 'Low', lat: 40.3595, lng: 49.8438 },
      { name: 'Heydar Aliyev Center', desc: 'Zaha Hadid\'s flowing white masterpiece of modern architecture', category: 'museum', cost: 15, tags: ['architecture', 'art', 'modern'], duration: '2h', crowd: 'Low', lat: 40.3959, lng: 49.8678 },
      { name: 'Maiden Tower', desc: 'Ancient 12th-century tower and symbol of Baku', category: 'landmark', cost: 5, tags: ['history', 'views', 'ancient'], duration: '1h', crowd: 'Moderate', lat: 40.3660, lng: 49.8373 },
      { name: 'Baku Boulevard', desc: 'Beautiful waterfront promenade along the Caspian Sea', category: 'activity', cost: 0, tags: ['walking', 'scenic', 'relaxation'], duration: '1.5h', crowd: 'Moderate', lat: 40.3565, lng: 49.8380 },
      { name: 'Gobustan National Park', desc: 'Ancient rock carvings and mud volcanoes outside Baku', category: 'tour', cost: 10, tags: ['nature', 'history', 'unique'], duration: '4h', crowd: 'Low', lat: 40.1267, lng: 49.3972 },
    ],
    restaurants: [
      { name: 'Firuze Restaurant', desc: 'Traditional Azerbaijani cuisine in Old City', cuisine: 'Azerbaijani', cost: 20, tags: ['traditional', 'local'], lat: 40.3665, lng: 49.8355 },
      { name: 'Dolma Restaurant', desc: 'Fine Azerbaijani dining with modern twists', cuisine: 'Azerbaijani', cost: 30, tags: ['fine-dining', 'local'], lat: 40.3690, lng: 49.8400 },
    ],
    morningActivities: ['Old City (Icherisheher)', 'Maiden Tower', 'Heydar Aliyev Center'],
    afternoonActivities: ['Gobustan National Park', 'Flame Towers', 'Baku Boulevard'],
    eveningActivities: ['Baku Boulevard sunset', 'Old City dinner', 'Flame Towers light show'],
  },
};

// Default fallback for unknown destinations
const DEFAULT_DEST = {
  activities: [
    { name: 'City Center Walking Tour', desc: 'Explore the historic heart of the city', category: 'tour', cost: 0, tags: ['walking', 'culture'], duration: '3h', crowd: 'Moderate', lat: 0, lng: 0 },
    { name: 'Local Market Visit', desc: 'Browse local crafts, foods, and souvenirs', category: 'shopping', cost: 10, tags: ['shopping', 'local'], duration: '2h', crowd: 'Moderate', lat: 0, lng: 0 },
    { name: 'Museum Visit', desc: 'Explore the city\'s top-rated museum', category: 'museum', cost: 15, tags: ['culture', 'museum'], duration: '2h', crowd: 'Low', lat: 0, lng: 0 },
    { name: 'Park & Gardens', desc: 'Relax in the city\'s most beautiful green spaces', category: 'park', cost: 0, tags: ['nature', 'relaxation'], duration: '1.5h', crowd: 'Low', lat: 0, lng: 0 },
    { name: 'Viewpoint Visit', desc: 'Enjoy panoramic views of the cityscape', category: 'landmark', cost: 5, tags: ['views', 'photography'], duration: '1h', crowd: 'Moderate', lat: 0, lng: 0 },
    { name: 'Local Cooking Class', desc: 'Learn to prepare traditional local dishes', category: 'activity', cost: 45, tags: ['food', 'culture', 'unique'], duration: '3h', crowd: 'Low', lat: 0, lng: 0 },
  ],
  restaurants: [
    { name: 'Traditional Restaurant', desc: 'Authentic local cuisine in a cozy setting', cuisine: 'Local', cost: 15, tags: ['local', 'traditional'], lat: 0, lng: 0 },
    { name: 'Street Food Corner', desc: 'Popular street food and local snacks', cuisine: 'Street Food', cost: 5, tags: ['budget', 'street-food'], lat: 0, lng: 0 },
  ],
  morningActivities: ['City Center Walking Tour', 'Museum Visit'],
  afternoonActivities: ['Local Market Visit', 'Park & Gardens', 'Viewpoint Visit'],
  eveningActivities: ['Local Cooking Class', 'Traditional dinner'],
};

function getDestData(destination: string) {
  const key = Object.keys(DESTINATION_DATA).find(k => destination.toLowerCase().includes(k.toLowerCase()));
  const data = key ? DESTINATION_DATA[key] : null;
  if (!data) return DEFAULT_DEST;
  return data;
}

const TRAVEL_STYLE_PRICING: Record<string, { multiplier: number; lodging: string; dining: string; transport: string; note: string }> = {
  BUDGET: {
    multiplier: 0.6,
    lodging: 'hostels, guesthouses, or budget hotels',
    dining: 'street food, bakeries, and local casual restaurants',
    transport: 'walking and public transport',
    note: 'Budget style keeps costs low and prioritizes free or low-cost attractions.',
  },
  BACKPACKER: {
    multiplier: 0.7,
    lodging: 'hostels and shared rooms',
    dining: 'street food, markets, and simple local meals',
    transport: 'walking, buses, and metro',
    note: 'Backpacker style focuses on flexible, social, low-cost travel.',
  },
  MODERATE: {
    multiplier: 1.0,
    lodging: '3-star hotels or comfortable apartments',
    dining: 'balanced mix of local restaurants and cafes',
    transport: 'public transport with occasional taxi rides',
    note: 'Moderate style balances comfort, good experiences, and controlled spending.',
  },
  ADVENTURE: {
    multiplier: 1.15,
    lodging: 'comfortable stays near activity zones',
    dining: 'quick local food plus energy-friendly meals',
    transport: 'local transport plus activity transfers',
    note: 'Adventure style adds outdoor activities, tours, and route-based experiences.',
  },
  CULTURAL: {
    multiplier: 1.2,
    lodging: 'central hotels near old town or museums',
    dining: 'traditional restaurants and local cuisine',
    transport: 'walkable cultural districts and short transfers',
    note: 'Cultural style adds museums, guided visits, historic areas, and local cuisine.',
  },
  LUXURY: {
    multiplier: 2.0,
    lodging: 'premium 4-5 star hotels',
    dining: 'fine dining, rooftop restaurants, and curated experiences',
    transport: 'private transfers and taxis',
    note: 'Luxury style upgrades comfort, food, transfers, and premium experiences.',
  },
  FAMILY: {
    multiplier: 1.3,
    lodging: 'family-friendly hotels or apartments',
    dining: 'comfortable restaurants with flexible menus',
    transport: 'safe transfers and short routes',
    note: 'Family style prioritizes comfort, safety, and slower logistics.',
  },
  RELAXATION: {
    multiplier: 1.4,
    lodging: 'comfortable hotels with wellness or beach access',
    dining: 'slow dining and cafes',
    transport: 'low-stress transfers and taxis',
    note: 'Relaxation style reduces intensity and adds calm experiences.',
  },
};

function getTravelStyleProfile(style: TravelStyle) {
  return TRAVEL_STYLE_PRICING[String(style).toUpperCase()] || TRAVEL_STYLE_PRICING.MODERATE;
}

function adjustCostForStyle(baseCost: number, style: TravelStyle): number {
  return Math.round(baseCost * getTravelStyleProfile(style).multiplier);
}

function getDailyBaseTripCost(destination: string, style: TravelStyle): number {
  const cityMultipliers: Record<string, number> = {
    Istanbul: 0.9, Paris: 1.35, Tokyo: 1.25, Rome: 1.1, Barcelona: 1.05,
    London: 1.5, Dubai: 1.45, Baku: 0.75, Default: 1,
  };
  const cityKey = Object.keys(cityMultipliers).find(k => destination.toLowerCase().includes(k.toLowerCase())) || 'Default';
  const baseDaily = 120 * cityMultipliers[cityKey];
  return Math.round(baseDaily * getTravelStyleProfile(style).multiplier);
}

function getItemsPerSlot(pace: TravelPace): number {
  switch (pace) {
    case 'SLOW': return 1;
    case 'MODERATE': return 1;
    case 'FAST': return 2;
    case 'PACKED': return 2;
    default: return 1;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function generateItinerary(input: GenerateItineraryInput): Promise<ItineraryDayOutput[]> {
  // Full local demo by default. Online AI is optional only when explicitly enabled.
  if (process.env.ENABLE_ONLINE_AI === "true" && process.env.OPENAI_API_KEY) {
    try {
      return await generateWithAI(input);
    } catch (e) {
      console.warn('AI generation failed, falling back to local generator:', e);
    }
  }
  return generateLocally(input);
}

async function generateWithAI(input: GenerateItineraryInput): Promise<ItineraryDayOutput[]> {
  const days = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dailyBudget = input.budget / days;

  const prompt = `Generate a ${days}-day travel itinerary for ${input.destination}, ${input.country}.
Budget: ${input.budget} ${input.currency} total (${Math.round(dailyBudget)} per day).
Travel style: ${input.travelStyle}. Pace: ${input.pace}. Travelers: ${input.travelerCount}.
Interests: ${input.interests.join(', ') || 'general sightseeing'}.
Constraints: ${input.constraints.join(', ') || 'none'}.

Return ONLY valid JSON array with this structure for each day:
[{"dayNumber":1,"title":"Day title","items":[{"title":"Activity","description":"Brief description","location":"Place name","timeSlot":"MORNING|AFTERNOON|EVENING","startTime":"09:00","endTime":"11:00","estimatedCost":20,"category":"landmark|museum|food|shopping|tour|activity|park","tags":["tag1"],"notes":"","crowdLevel":"Low|Moderate|High","weatherNote":""}]}]`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');

  const parsed = JSON.parse(content);
  return parsed.map((day: any, i: number) => ({
    dayNumber: day.dayNumber || i + 1,
    date: new Date(input.startDate.getTime() + i * 86400000),
    title: day.title || `Day ${i + 1}`,
    dailyCost: day.items?.reduce((s: number, it: any) => s + (it.estimatedCost || 0), 0) || 0,
    items: (day.items || []).map((item: any, j: number) => ({
      ...item,
      latitude: input.latitude + (Math.random() - 0.5) * 0.05,
      longitude: input.longitude + (Math.random() - 0.5) * 0.05,
      orderIndex: j,
    })),
  }));
}

function generateLocally(input: GenerateItineraryInput): ItineraryDayOutput[] {
  const days = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dailyBudget = input.budget / days;
  const destData = getDestData(input.destination);
  const itemsPerSlot = getItemsPerSlot(input.pace);
  const styleProfile = getTravelStyleProfile(input.travelStyle);
  const dailyBaseTripCost = getDailyBaseTripCost(input.destination, input.travelStyle);

  const allActivities = shuffle([...destData.activities]);
  const allRestaurants = shuffle([...destData.restaurants]);
  let actIdx = 0;
  let restIdx = 0;

  const result: ItineraryDayOutput[] = [];

  for (let d = 0; d < days; d++) {
    const dayItems: ItineraryItemOutput[] = [];
    let dayCost = 0;

    // Style-based daily travel package: lodging + local transport baseline.
    const packageCost = Math.max(0, Math.round(dailyBaseTripCost - 65));
    if (packageCost > 0) {
      dayItems.push({
        title: `${String(input.travelStyle).replace(/_/g, ' ')} travel setup`,
        description: `${styleProfile.lodging}; ${styleProfile.transport}; ${styleProfile.dining}.`,
        location: input.destination,
        latitude: input.latitude,
        longitude: input.longitude,
        timeSlot: 'MORNING',
        startTime: '08:30',
        endTime: '09:00',
        estimatedCost: packageCost,
        category: 'travel',
        tags: ['travel-style', String(input.travelStyle).toLowerCase()],
        notes: styleProfile.note,
        crowdLevel: 'Low',
        weatherNote: '',
      });
      dayCost += packageCost;
    }

    // Morning
    for (let m = 0; m < itemsPerSlot; m++) {
      const act = allActivities[actIdx % allActivities.length];
      actIdx++;
      const cost = adjustCostForStyle(act.cost, input.travelStyle);
      dayItems.push({
        title: act.name,
        description: act.desc,
        location: `${act.name}, ${input.destination}`,
        latitude: act.lat || input.latitude + (Math.random() - 0.5) * 0.03,
        longitude: act.lng || input.longitude + (Math.random() - 0.5) * 0.03,
        timeSlot: 'MORNING',
        startTime: m === 0 ? '09:00' : '10:30',
        endTime: m === 0 ? '11:00' : '12:00',
        estimatedCost: cost,
        category: act.category,
        tags: act.tags,
        notes: `Estimated duration: ${act.duration}`,
        crowdLevel: act.crowd,
        weatherNote: '',
      });
      dayCost += cost;
    }

    // Lunch
    const lunch = allRestaurants[restIdx % allRestaurants.length];
    restIdx++;
    const lunchCost = adjustCostForStyle(lunch.cost, input.travelStyle);
    dayItems.push({
      title: `Lunch at ${lunch.name}`,
      description: lunch.desc,
      location: `${lunch.name}, ${input.destination}`,
      latitude: lunch.lat || input.latitude + (Math.random() - 0.5) * 0.02,
      longitude: lunch.lng || input.longitude + (Math.random() - 0.5) * 0.02,
      timeSlot: 'AFTERNOON',
      startTime: '12:30',
      endTime: '13:30',
      estimatedCost: lunchCost,
      category: 'food',
      tags: ['food', lunch.cuisine?.toLowerCase() || 'local'],
      notes: `Cuisine: ${lunch.cuisine}`,
      crowdLevel: 'Moderate',
      weatherNote: '',
    });
    dayCost += lunchCost;

    // Afternoon
    for (let a = 0; a < itemsPerSlot; a++) {
      const act = allActivities[actIdx % allActivities.length];
      actIdx++;
      const cost = adjustCostForStyle(act.cost, input.travelStyle);
      dayItems.push({
        title: act.name,
        description: act.desc,
        location: `${act.name}, ${input.destination}`,
        latitude: act.lat || input.latitude + (Math.random() - 0.5) * 0.03,
        longitude: act.lng || input.longitude + (Math.random() - 0.5) * 0.03,
        timeSlot: 'AFTERNOON',
        startTime: a === 0 ? '14:00' : '16:00',
        endTime: a === 0 ? '16:00' : '17:30',
        estimatedCost: cost,
        category: act.category,
        tags: act.tags,
        notes: `Estimated duration: ${act.duration}`,
        crowdLevel: act.crowd,
        weatherNote: '',
      });
      dayCost += cost;
    }

    // Dinner
    const dinner = allRestaurants[restIdx % allRestaurants.length];
    restIdx++;
    const dinnerCost = adjustCostForStyle(dinner.cost * 1.3, input.travelStyle);
    dayItems.push({
      title: `Dinner at ${dinner.name}`,
      description: dinner.desc,
      location: `${dinner.name}, ${input.destination}`,
      latitude: dinner.lat || input.latitude + (Math.random() - 0.5) * 0.02,
      longitude: dinner.lng || input.longitude + (Math.random() - 0.5) * 0.02,
      timeSlot: 'EVENING',
      startTime: '19:00',
      endTime: '21:00',
      estimatedCost: Math.round(dinnerCost),
      category: 'food',
      tags: ['food', 'dinner', dinner.cuisine?.toLowerCase() || 'local'],
      notes: `Cuisine: ${dinner.cuisine}`,
      crowdLevel: 'Low',
      weatherNote: '',
    });
    dayCost += Math.round(dinnerCost);

    // Evening activity
    if (input.pace !== 'SLOW') {
      const act = allActivities[actIdx % allActivities.length];
      actIdx++;
      const cost = adjustCostForStyle(act.cost * 0.5, input.travelStyle);
      dayItems.push({
        title: act.name + ' (Evening)',
        description: `Evening visit: ${act.desc}`,
        location: `${act.name}, ${input.destination}`,
        latitude: act.lat || input.latitude + (Math.random() - 0.5) * 0.03,
        longitude: act.lng || input.longitude + (Math.random() - 0.5) * 0.03,
        timeSlot: 'EVENING',
        startTime: '21:00',
        endTime: '22:30',
        estimatedCost: Math.round(cost),
        category: act.category,
        tags: [...act.tags, 'evening'],
        notes: 'Evening activity',
        crowdLevel: 'Low',
        weatherNote: '',
      });
      dayCost += Math.round(cost);
    }

    const dayDate = new Date(input.startDate.getTime() + d * 86400000);
    const dayTitles = [
      `Exploring ${input.destination}`,
      `${input.destination} Highlights`,
      `Discovering ${input.destination}`,
      `${input.destination} Deep Dive`,
      `Hidden Gems of ${input.destination}`,
      `Cultural ${input.destination}`,
      `${input.destination} Adventure`,
    ];

    if (dailyBudget > 0 && dayCost > dailyBudget) {
      dayItems.push({
        title: 'Budget note',
        description: `This day is estimated above the daily target (${Math.round(dailyBudget)} ${input.currency}). Consider removing one optional paid activity.`,
        location: input.destination,
        latitude: input.latitude,
        longitude: input.longitude,
        timeSlot: 'EVENING',
        startTime: '22:30',
        endTime: '22:35',
        estimatedCost: 0,
        category: 'budget-note',
        tags: ['budget', 'note'],
        notes: 'Local planner budget guidance',
        crowdLevel: 'Low',
        weatherNote: '',
      });
    }

    result.push({
      dayNumber: d + 1,
      date: dayDate,
      title: d === 0 ? `Arrival & First Impressions` : d === days - 1 ? `Final Day & Departure` : dayTitles[d % dayTitles.length],
      items: dayItems,
      dailyCost: Math.round(dayCost),
    });
  }

  return result;
}

export async function generateBudgetSuggestions(tripId: string, totalBudget: number, spent: number, currency: string): Promise<string[]> {
  const percentage = (spent / totalBudget) * 100;
  const remaining = totalBudget - spent;
  const suggestions: string[] = [];

  if (totalBudget <= 0) {
    suggestions.push("💡 Set a trip budget to start tracking your spending.");
    suggestions.push("Go to the Budget tab and set a total budget to see personalized suggestions.");
    return suggestions;
  }

  const fmt = (n: number) => `${currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency + " "}${Math.round(n).toLocaleString()}`;

  if (percentage >= 100) {
    const over = spent - totalBudget;
    suggestions.push(`⚠️ Over budget by ${fmt(over)} (${Math.round(percentage - 100)}%). Immediate action recommended.`);
    suggestions.push("🚶 Switch all remaining transport to public transit or walking — saves up to 80% vs taxis.");
    suggestions.push("🥙 Street food and local markets cost 60–70% less than sit-down restaurants.");
    suggestions.push("🏛️ Many museums have free admission on specific days or evenings — check local schedules.");
    suggestions.push("💳 Avoid dynamic currency conversion at ATMs — always pay in local currency.");
  } else if (percentage >= 90) {
    suggestions.push(`⚠️ ${Math.round(percentage)}% spent — only ${fmt(remaining)} remaining. Tighten up spending.`);
    suggestions.push("🆓 Prioritize free attractions: parks, viewpoints, walking districts, and beaches.");
    suggestions.push("🛒 Shop at local supermarkets for snacks and drinks instead of tourist shops.");
    suggestions.push("📅 Check if you have any bookings that can be cancelled without penalty.");
  } else if (percentage >= 75) {
    suggestions.push(`📊 ${Math.round(percentage)}% spent — ${fmt(remaining)} remaining. Good pace, keep monitoring.`);
    suggestions.push("🎟️ City tourist passes often bundle transport + attractions at 30–40% discount.");
    suggestions.push("🚇 Public transport over ride-sharing saves ${} per day on average.");
    suggestions.push("🌅 Free time activities: sunrise/sunset viewpoints, local markets, waterfront walks.");
    suggestions.push("📱 Download offline maps to avoid costly data roaming charges.");
  } else if (percentage >= 50) {
    suggestions.push(`✅ ${Math.round(percentage)}% spent — you're on a healthy pace with ${fmt(remaining)} left.`);
    suggestions.push("🗓️ Book remaining paid activities in advance — online prices are usually 15–25% lower.");
    suggestions.push("🍽️ Try the local lunch set menu (prix fixe) — same restaurants, half the dinner price.");
    suggestions.push("🏨 If your accommodation has a kitchen, cooking one meal a day cuts food costs significantly.");
  } else {
    suggestions.push(`🎉 Only ${Math.round(percentage)}% spent — you have ${fmt(remaining)} available. Well ahead of pace!`);
    suggestions.push("⭐ You could add a special experience: a cooking class, wine tasting, or day trip.");
    suggestions.push("🏰 Consider upgrading one activity to a premium or guided version.");
    suggestions.push("🎭 Evening events like live music, theatre, or rooftop dining are worth splurging on.");
    suggestions.push("🛍️ Leave some buffer for last-minute finds — souvenirs, markets, and spontaneous meals.");
  }

  return suggestions;
}
