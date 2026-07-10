import SchemeRegistration from '../models/SchemeRegistration.js';
import Dispatch from '../models/Dispatch.js';
import ReportImport from '../models/ReportImport.js';
import { startOfDay } from '../utils/helpers.js';
import { expireOverdue, decorate } from './registration.service.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function lastMonths(count) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      y: d.getFullYear(),
      m: d.getMonth() + 1,
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  return months;
}

export async function getDashboard() {
  await expireOverdue();

  const months = lastMonths(6);
  const monthStart = new Date(months[0].y, months[0].m - 1, 1);
  const todayStart = startOfDay();

  const in7Days = new Date(Date.now() + 7 * 86400000);

  const [
    statusCounts,
    expiringSoon,
    todayDispatch,
    benefitAgg,
    monthlyRegs,
    monthlyDispatch,
    completionAgg,
    recent,
    latestReportImport,
  ] = await Promise.all([
      SchemeRegistration.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      SchemeRegistration.countDocuments({ status: 'ACTIVE', expiryDate: { $lte: in7Days } }),
      Dispatch.aggregate([
        { $match: { dispatchDate: { $gte: todayStart } } },
        { $group: { _id: null, cases: { $sum: '$totalCases' }, trips: { $sum: 1 } } },
      ]),
      SchemeRegistration.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$benefitEarned' } } },
      ]),
      SchemeRegistration.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        {
          $group: {
            _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Dispatch.aggregate([
        { $match: { dispatchDate: { $gte: monthStart } } },
        {
          $group: {
            _id: { y: { $year: '$dispatchDate' }, m: { $month: '$dispatchDate' } },
            cases: { $sum: '$totalCases' },
          },
        },
      ]),
      SchemeRegistration.aggregate([
        { $match: { status: { $in: ['ACTIVE', 'COMPLETED', 'EXPIRED'] } } },
        {
          $project: {
            pct: {
              $cond: [
                { $gt: ['$schemeSnapshot.targetCases', 0] },
                {
                  $min: [
                    100,
                    { $multiply: [{ $divide: ['$currentCases', '$schemeSnapshot.targetCases'] }, 100] },
                  ],
                },
                0,
              ],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$pct' } } },
      ]),
      SchemeRegistration.find().sort('-createdAt').limit(6).populate('scheme', 'name'),
      ReportImport.findOne().sort('-createdAt').lean(),
    ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));

  const monthly = months.map(({ y, m, label }) => ({
    label,
    registrations: monthlyRegs.find((r) => r._id.y === y && r._id.m === m)?.count || 0,
    cases: monthlyDispatch.find((r) => r._id.y === y && r._id.m === m)?.cases || 0,
  }));

  return {
    cards: {
      active: byStatus.ACTIVE || 0,
      completed: byStatus.COMPLETED || 0,
      expired: byStatus.EXPIRED || 0,
      expiringSoon,
      todayDispatchCases: todayDispatch[0]?.cases || 0,
      todayDispatchTrips: todayDispatch[0]?.trips || 0,
      totalBenefits: benefitAgg[0]?.total || 0,
    },
    completionAvg: Math.round((completionAgg[0]?.avg || 0) * 10) / 10,
    monthly,
    recent: recent.map(decorate),
    latestReportImport,
  };
}
