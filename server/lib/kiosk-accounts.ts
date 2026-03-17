export const KIOSK_DEFAULT_PASSWORD = '0000';

export const BRANCH_KIOSK_ACCOUNTS = [
  { username: 'isiklar', firstName: 'Işıklar', branchId: 5 },
  { username: 'mallof', firstName: 'Antalya Mallof', branchId: 6 },
  { username: 'markantalya', firstName: 'Antalya Markantalya', branchId: 7 },
  { username: 'lara', firstName: 'Antalya Lara', branchId: 8 },
  { username: 'beachpark', firstName: 'Antalya Beachpark', branchId: 9 },
  { username: 'ibrahimli', firstName: 'Gaziantep İbrahimli', branchId: 10 },
  { username: 'ibnisina', firstName: 'Gaziantep İbnisina', branchId: 11 },
  { username: 'universite', firstName: 'Gaziantep Üniversite', branchId: 12 },
  { username: 'meram', firstName: 'Konya Meram', branchId: 13 },
  { username: 'bosna', firstName: 'Konya Bosna', branchId: 14 },
  { username: 'marina', firstName: 'Samsun Marina', branchId: 15 },
  { username: 'atakum', firstName: 'Samsun Atakum', branchId: 16 },
  { username: 'batman', firstName: 'Batman', branchId: 17 },
  { username: 'duzce', firstName: 'Düzce', branchId: 18 },
  { username: 'siirt', firstName: 'Siirt', branchId: 19 },
  { username: 'kilis', firstName: 'Kilis', branchId: 20 },
  { username: 'sanliurfa', firstName: 'Şanlıurfa', branchId: 21 },
  { username: 'nizip', firstName: 'Nizip', branchId: 22 },
] as const;

export const FABRIKA_KIOSK_ACCOUNT = {
  username: 'fabrika',
  firstName: 'Fabrika',
  branchId: 24,
  role: 'fabrika_operator' as const,
};
