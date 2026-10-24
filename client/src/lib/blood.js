export const groups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const donate = {
  "O-": groups, "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"], "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"], "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"], "AB+": ["AB+"]
};
export const canDonateTo = (donor, recipient) => Boolean(donate[donor]?.includes(recipient));
export const compatibleDonors = recipient => groups.filter(donor => canDonateTo(donor, recipient));
