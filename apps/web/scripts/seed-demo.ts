/**
 * Seed 10 historical demo sessions for the admin dashboard.
 * Run: pnpm --filter @loan-wizard/web seed
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { MOCK_OFFER, MOCK_TRANSCRIPT } from '@loan-wizard/contracts';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NAMES = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sunita Rao', 'Vikram Singh', 'Deepa Nair', 'Arjun Mehta', 'Kavitha Reddy', 'Sanjay Gupta', 'Anita Joshi'];
const TENANTS: Array<'alpha' | 'beta'> = ['alpha', 'beta'];
const STATUSES = ['accepted', 'offered', 'rejected', 'accepted', 'offered', 'accepted', 'rejected', 'offered', 'accepted', 'failed'];
const SOURCES = ['sms', 'whatsapp', 'email', 'direct'];

async function seed() {
  console.log('Seeding demo sessions…');

  const now = Date.now();
  const DAY = 86400_000;

  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const createdAt = new Date(now - daysAgo * DAY - Math.random() * DAY);
    const status = STATUSES[i];
    const eligible = !['rejected', 'failed'].includes(status);
    const offer = { ...MOCK_OFFER, session_id: 'seed', eligible, rejection_reason: eligible ? null : 'Income below minimum threshold' };

    const session = await prisma.session.create({
      data: {
        createdAt,
        campaignSource: SOURCES[i % SOURCES.length],
        deviceUserAgent: 'Mozilla/5.0 (demo seed)',
        status,
        tenantId: TENANTS[i % 2],
        declaredName: NAMES[i],
        declaredEmployment: i % 3 === 0 ? 'self_employed' : 'salaried',
        declaredIncome: 50000 + i * 5000,
        loanAmountReq: 300000 + i * 50000,
        loanPurpose: ['home renovation', 'education', 'medical', 'business'][i % 4],
        endedAt: new Date(createdAt.getTime() + 120_000),
        offerJson: eligible ? JSON.stringify(offer) : null,
      },
    });

    // Add 2 transcript turns
    for (const t of MOCK_TRANSCRIPT.slice(0, 2)) {
      await prisma.transcript.create({
        data: {
          sessionId: session.id,
          turnIdx: t.turn_idx,
          speaker: t.speaker,
          text: t.text,
          confidence: t.confidence,
          timestamp: new Date(createdAt.getTime() + t.turn_idx * 15_000),
          questionId: t.question_id ?? null,
        },
      });
    }

    // Add consent if accepted
    if (status === 'accepted') {
      await prisma.consentRecord.create({
        data: {
          sessionId: session.id,
          consentType: 'offer_acceptance',
          verbalText: 'I accept the loan offer as stated.',
          timestamp: new Date(createdAt.getTime() + 130_000),
        },
      });
    }

    console.log(`  Created session ${i + 1}/10: ${session.id} (${status})`);
  }

  console.log('Done.');
  await prisma.$disconnect();
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
