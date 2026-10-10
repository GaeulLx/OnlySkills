const creators = [
  { id: 'student-001', name: 'Aisha Tan', skills: ['social media', 'copywriting', 'design'], availabilityHours: 6, preferredPay: 'revenue share', interests: ['sustainability', 'campus life'] },
  { id: 'student-002', name: 'Daniel Lim', skills: ['sales', 'customer research', 'partnerships'], availabilityHours: 8, preferredPay: 'commission', interests: ['student businesses', 'technology'] },
  { id: 'student-003', name: 'Mei Wong', skills: ['video editing', 'photography', 'branding'], availabilityHours: 5, preferredPay: 'fixed project fee', interests: ['food', 'lifestyle'] }
];

const sales = Array.from({ length: 20 }, (_, i) => ({
  id: `order-${String(i + 1).padStart(3, '0')}`,
  date: `2026-10-${String((i % 10) + 1).padStart(2, '0')}`,
  views: 100 + i * 17,
  clicks: 8 + (i % 7),
  amount: 12 + (i % 5) * 3,
  status: i % 4 === 0 ? 'refunded' : 'paid'
}));

module.exports = { creators, sales };
