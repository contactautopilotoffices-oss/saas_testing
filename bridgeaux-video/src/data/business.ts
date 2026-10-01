// The one example business used throughout the film. Every scene reads from
// here so the name, place, products and numbers never drift between scenes.
// All values are fictional demonstration data, not BridgeAux claims.

export const business = {
  name: 'Kesar Bakehouse',
  shortName: 'Kesar',
  type: 'Bakery',
  since: 2009,
  city: 'Mumbai',
  area: 'Bandra West',
  street: 'Shop 4, Hill Road',
  address: 'Shop 4, Hill Road, Bandra West, Mumbai',
  domain: 'kesarbakehouse.in',
  email: 'hello@kesarbakehouse.in',
  phone: '+91 98765 43210',
  hours: 'Open daily, 8 AM to 10 PM',
  closes: 'Closes 10 PM',
  rating: 4.8,
  reviews: 126,
  services: ['Cakes', 'Pastries', 'Custom orders'],
  customers: 'Local families and celebrations',
  goal: 'More customers online',
  tagline: 'Baked fresh in Bandra, every morning.',
  onboardingInput:
    "I'm a bakery in Mumbai. We sell cakes, pastries and custom orders. We want more customers online.",
} as const;

export type ProductKind = 'chocolate' | 'cheesecake' | 'pastry' | 'croissant';

export const products: { name: string; price: string; note: string; kind: ProductKind }[] = [
  { name: 'Belgian Chocolate Cake', price: '₹850', note: '1 kg', kind: 'chocolate' },
  { name: 'Mango Cheesecake', price: '₹160', note: 'per slice', kind: 'cheesecake' },
  { name: 'Pistachio Rose Pastry', price: '₹140', note: 'fresh daily', kind: 'pastry' },
  { name: 'Butter Croissant', price: '₹90', note: 'from 8 AM', kind: 'croissant' },
];

// Illustrative dashboard figures for the example bakery
export const metrics = {
  visits: 1248,
  enquiries: 86,
  orders: 42,
  revenue: 24560,
  customers: 312,
  postsScheduled: 12,
};

// Customers who interact with the bakery in scene 05
export const customerActivity = {
  search: { who: 'Priya Menon', query: 'cake shop near me' },
  message: { who: 'Rahul Desai', text: 'Hi! Do you make eggless cakes?' },
  enquiry: { who: 'Ananya Shah', text: 'Custom birthday cake, 2 kg, for Saturday' },
  order: { id: '#1042', text: '2 × Mango Cheesecake, 1 × Chocolate Cake', amount: '₹1,170' },
};

// Other bakeries that show up in the scene 01 search
export const competitors = [
  { name: 'The Bread Co.', meta: 'Bakery · 1.2 km', rating: 4.5, reviews: 312 },
  { name: 'Sweet Crumb Café', meta: 'Café · 1.6 km', rating: 4.3, reviews: 198 },
];

export const formatINR = (n: number) => '₹' + n.toLocaleString('en-IN');
