export const BLOOD_GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

const DONATE_TO = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"]
};

export const canDonateTo = (donor, recipient) => Boolean(DONATE_TO[donor]?.includes(recipient));
export const canReceiveFrom = (recipient, donor) => canDonateTo(donor, recipient);

export function isDonationEligible(lastDonationAt, now = new Date()) {
  if (!lastDonationAt) return { eligible: true, daysRemaining: 0 };
  const days = Math.floor((now - new Date(lastDonationAt)) / 86400000);
  const daysRemaining = Math.max(0, 90 - days);
  return { eligible: days >= 90, daysRemaining };
}
