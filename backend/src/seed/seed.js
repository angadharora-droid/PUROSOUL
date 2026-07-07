/**
 * Seeds default users and sample schemes.
 * Run with: npm run seed
 */
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Scheme from '../models/Scheme.js';

const USERS = [
  { name: 'Admin User', email: 'admin@company.com', password: 'Admin@1234', role: 'admin' },
  { name: 'Sales Employee', email: 'sales@company.com', password: 'Sales@1234', role: 'sales' },
];

const SCHEMES = [
  {
    name: 'Scheme A',
    advanceAmount: 10000,
    benefitPerCase: 1,
    targetCases: 1600,
    validityDays: 60,
    description: 'Advance ₹10,000 — achieve 1600 cases in 60 days and earn ₹1 per case.',
  },
  {
    name: 'Scheme B',
    advanceAmount: 25000,
    benefitPerCase: 2,
    targetCases: 4000,
    validityDays: 90,
    description: 'Advance ₹25,000 — achieve 4000 cases in 90 days and earn ₹2 per case.',
  },
];

async function seed() {
  await connectDB();

  for (const u of USERS) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`User already exists: ${u.email}`);
    } else {
      await User.create(u);
      console.log(`Created user ${u.email} (${u.role}) — password: ${u.password}`);
    }
  }

  const admin = await User.findOne({ role: 'admin' });
  for (const s of SCHEMES) {
    const exists = await Scheme.findOne({ name: s.name });
    if (exists) {
      console.log(`Scheme already exists: ${s.name}`);
    } else {
      await Scheme.create({ ...s, createdBy: admin._id });
      console.log(`Created scheme: ${s.name}`);
    }
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
