const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'General Discussion', slug: 'general', description: 'Anything and everything related to studying and exams.', icon: 'Hash' },
    { name: 'React Developers', slug: 'react', description: 'Help, tips, and showcases for React.js', icon: 'Code' },
    { name: 'UI/UX Design', slug: 'design', description: 'Share your Figma mockups and get feedback.', icon: 'PenTool' },
    { name: 'Career Advice', slug: 'career', description: 'Resume reviews and interview tips.', icon: 'Briefcase' }
  ];

  for (const c of categories) {
    await prisma.forumCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: c
    });
  }
  console.log('Categories seeded successfully');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
