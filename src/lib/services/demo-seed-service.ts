// Rich demo seeding is disabled for the university-ready build.
// SmartTravel keeps only clean demo accounts from prisma/seed.ts and uses live APIs for generated travel data.
export async function seedRichDemoData() {
  return { disabled: true, message: "Rich demo seeding is disabled. Use npm run setup1 for clean demo accounts." };
}
