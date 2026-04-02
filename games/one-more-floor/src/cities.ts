export const CITY_NAMES = [
  'Tokyo', 'New York', 'London', 'Paris', 'Berlin', 'Sydney', 'Dubai',
  'Singapore', 'Seoul', 'Mumbai', 'São Paulo', 'Mexico City', 'Cairo',
  'Istanbul', 'Bangkok', 'Moscow', 'Lagos', 'Jakarta', 'Buenos Aires',
  'Toronto', 'Amsterdam', 'Barcelona', 'Rome', 'Vienna', 'Prague',
  'Lisbon', 'Athens', 'Oslo', 'Stockholm', 'Copenhagen', 'Helsinki',
  'Warsaw', 'Krakow', 'Budapest', 'Bucharest', 'Dublin', 'Edinburgh',
  'Brussels', 'Zurich', 'Geneva', 'Milan', 'Naples', 'Florence',
  'Marseille', 'Lyon', 'Hamburg', 'Munich', 'Frankfurt', 'Cologne',
  'Kyoto', 'Osaka', 'Shanghai', 'Beijing', 'Hong Kong', 'Taipei',
  'Manila', 'Hanoi', 'Kuala Lumpur', 'Chennai', 'Bangalore', 'Delhi',
  'Karachi', 'Dhaka', 'Colombo', 'Kathmandu', 'Bali', 'Perth',
  'Melbourne', 'Auckland', 'Wellington', 'Fiji', 'Honolulu',
  'Vancouver', 'Montreal', 'Chicago', 'San Francisco', 'Los Angeles',
  'Miami', 'Austin', 'Seattle', 'Denver', 'Boston', 'Portland',
  'Nashville', 'New Orleans', 'Lima', 'Bogotá', 'Santiago', 'Havana',
  'Medellín', 'Quito', 'Montevideo', 'Caracas', 'Georgetown',
  'Casablanca', 'Marrakech', 'Tunis', 'Nairobi', 'Cape Town',
  'Johannesburg', 'Accra', 'Addis Ababa', 'Dar es Salaam', 'Kampala',
  'Kigali', 'Maputo', 'Windhoek', 'Zanzibar', 'Luxor',
  'Tel Aviv', 'Amman', 'Beirut', 'Doha', 'Riyadh', 'Muscat',
  'Tashkent', 'Baku', 'Tbilisi', 'Yerevan', 'Almaty',
  'Reykjavik', 'Tallinn', 'Riga', 'Vilnius', 'Ljubljana',
  'Bratislava', 'Split', 'Dubrovnik', 'Sarajevo', 'Belgrade',
  'Thessaloniki', 'Porto', 'Seville', 'Valencia', 'Malaga',
  'Nice', 'Bordeaux', 'Bruges', 'Antwerp', 'Dresden',
  'Salzburg', 'Innsbruck', 'Lucerne', 'Interlaken',
  'Positano', 'Santorini', 'Mykonos', 'Crete', 'Rhodes',
  'Marrakesh', 'Fez', 'Chefchaouen', 'Petra', 'Jaipur',
  'Udaipur', 'Goa', 'Pondicherry', 'Luang Prabang', 'Siem Reap',
  'Hoi An', 'Chiang Mai', 'Phuket', 'Bora Bora', 'Tahiti',
  'Queenstown', 'Rotorua', 'Cusco', 'Cartagena', 'Tulum',
  'Playa del Carmen', 'Puerto Vallarta', 'Oaxaca',
  'Savannah', 'Charleston', 'Asheville', 'Santa Fe',
  'Sedona', 'Napa Valley', 'Aspen', 'Key West',
  'Anchorage', 'Juneau', 'Maui', 'Kauai',
];

export function getRandomCity(exclude: string[] = []): string {
  const available = CITY_NAMES.filter(c => !exclude.includes(c));
  return available[Math.floor(Math.random() * available.length)] || 'New City';
}

// Continent mapping for achievements
export const CITY_CONTINENTS: Record<string, string> = {};
const continentGroups: Record<string, string[]> = {
  'Europe': [
    'London', 'Paris', 'Berlin', 'Amsterdam', 'Barcelona', 'Rome', 'Vienna', 'Prague',
    'Lisbon', 'Athens', 'Oslo', 'Stockholm', 'Copenhagen', 'Helsinki', 'Warsaw', 'Krakow',
    'Budapest', 'Bucharest', 'Dublin', 'Edinburgh', 'Brussels', 'Zurich', 'Geneva', 'Milan',
    'Naples', 'Florence', 'Marseille', 'Lyon', 'Hamburg', 'Munich', 'Frankfurt', 'Cologne',
    'Moscow', 'Reykjavik', 'Tallinn', 'Riga', 'Vilnius', 'Ljubljana', 'Bratislava', 'Split',
    'Dubrovnik', 'Sarajevo', 'Belgrade', 'Thessaloniki', 'Porto', 'Seville', 'Valencia',
    'Malaga', 'Nice', 'Bordeaux', 'Bruges', 'Antwerp', 'Dresden', 'Salzburg', 'Innsbruck',
    'Lucerne', 'Interlaken', 'Positano', 'Santorini', 'Mykonos', 'Crete', 'Rhodes', 'Istanbul',
  ],
  'Asia': [
    'Tokyo', 'Singapore', 'Seoul', 'Mumbai', 'Bangkok', 'Jakarta', 'Kyoto', 'Osaka',
    'Shanghai', 'Beijing', 'Hong Kong', 'Taipei', 'Manila', 'Hanoi', 'Kuala Lumpur',
    'Chennai', 'Bangalore', 'Delhi', 'Karachi', 'Dhaka', 'Colombo', 'Kathmandu', 'Bali',
    'Dubai', 'Tel Aviv', 'Amman', 'Beirut', 'Doha', 'Riyadh', 'Muscat', 'Tashkent',
    'Baku', 'Tbilisi', 'Yerevan', 'Almaty', 'Jaipur', 'Udaipur', 'Goa', 'Pondicherry',
    'Luang Prabang', 'Siem Reap', 'Hoi An', 'Chiang Mai', 'Phuket', 'Petra',
  ],
  'North America': [
    'New York', 'Toronto', 'Vancouver', 'Montreal', 'Chicago', 'San Francisco',
    'Los Angeles', 'Miami', 'Austin', 'Seattle', 'Denver', 'Boston', 'Portland',
    'Nashville', 'New Orleans', 'Mexico City', 'Havana', 'Savannah', 'Charleston',
    'Asheville', 'Santa Fe', 'Sedona', 'Napa Valley', 'Aspen', 'Key West',
    'Anchorage', 'Juneau', 'Playa del Carmen', 'Puerto Vallarta', 'Oaxaca', 'Tulum',
    'Honolulu', 'Maui', 'Kauai',
  ],
  'South America': [
    'São Paulo', 'Buenos Aires', 'Lima', 'Bogotá', 'Santiago', 'Medellín', 'Quito',
    'Montevideo', 'Caracas', 'Georgetown', 'Cusco', 'Cartagena',
  ],
  'Africa': [
    'Cairo', 'Lagos', 'Casablanca', 'Marrakech', 'Marrakesh', 'Tunis', 'Nairobi',
    'Cape Town', 'Johannesburg', 'Accra', 'Addis Ababa', 'Dar es Salaam', 'Kampala',
    'Kigali', 'Maputo', 'Windhoek', 'Zanzibar', 'Luxor', 'Fez', 'Chefchaouen',
  ],
  'Oceania': [
    'Sydney', 'Perth', 'Melbourne', 'Auckland', 'Wellington', 'Fiji',
    'Bora Bora', 'Tahiti', 'Queenstown', 'Rotorua',
  ],
};
for (const [continent, cities] of Object.entries(continentGroups)) {
  for (const city of cities) CITY_CONTINENTS[city] = continent;
}

export const ALL_CONTINENTS = Object.keys(continentGroups);

export function getCityContinent(city: string): string {
  return CITY_CONTINENTS[city] || 'Unknown';
}
