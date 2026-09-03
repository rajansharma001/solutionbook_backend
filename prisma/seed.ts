import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  console.log('Clearing database tables...');
  await prisma.enrollment.deleteMany({});
  await prisma.userProgress.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.studyMaterial.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding baseline accounts...');

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@solutionbook.local',
      passwordHash,
      role: 'ADMIN',
      isEmailVerified: true,
      profileData: JSON.stringify({ name: 'Super Admin' }),
      name: 'Super Admin',
    },
  });

  // Create Teacher
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@solutionbook.local',
      passwordHash,
      role: 'TEACHER',
      isEmailVerified: true,
      profileData: JSON.stringify({ name: 'Expert Instructor' }),
      name: 'Expert Instructor',
    },
  });

  // Create Student
  const student = await prisma.user.create({
    data: {
      email: 'student@solutionbook.local',
      passwordHash,
      role: 'STUDENT',
      isEmailVerified: true,
      profileData: JSON.stringify({ name: 'Dedicated Learner' }),
      name: 'Dedicated Learner',
    },
  });

  console.log('Seeding 5 genuine academic preparation courses...');

  const genuineCoursesData = [
    {
      title: 'Class 10 (SEE) Compulsory Mathematics Masterclass',
      description: 'Step-by-step masterclass covering Algebra, Geometry, Trigonometry, and Statistics. Rigorously aligned with the latest CDC (Curriculum Development Centre) guidelines to ensure BLE graduates ace their SEE mathematics board examination.',
      category: 'Class 10 (SEE)',
      price: 1499,
      level: 'BEGINNER',
      isPublished: true,
      status: 'PUBLISHED',
      adminVerified: true,
      duration: 2400, // 40 hours
      requirements: JSON.stringify(['Basic understanding of Class 9 Algebra', 'Ruler and compass geometry tools']),
      learningOutcomes: JSON.stringify(['Acquire complete mastery over matrix algebra', 'Formulate and prove geometric theorems', 'Solve complex height and distance trigonometric scenarios', 'Speed through stats calculations']),
      modules: [
        {
          title: 'Sets and Arithmetic operations',
          lessons: ['Introduction to Sets & Venn Diagrams', 'Real-world Set Operations Problems', 'Profit & Loss and Value Added Tax (VAT)']
        },
        {
          title: 'Algebra Foundations & Matrices',
          lessons: ['Indices laws and algebraic equations', 'Solving Quadratic Equations', 'Matrix determinants and Cramer\'s rule']
        },
        {
          title: 'Geometry & Theorems',
          lessons: ['Area of triangles & parallelograms', 'Circle theorems & constructions', 'SEE trigonometry mock paper solution']
        }
      ]
    },
    {
      title: 'Class 12 (NEB) Physics: Classical Mechanics & Electromagnetism',
      description: 'Comprehensive curriculum focusing on classical mechanics, rotational dynamics, wave kinematics, and Maxwell’s electromagnetism. Specially designed for science faculty students prepping for NEB board exams and engineering entrance tests.',
      category: 'NEB (+2)',
      price: 1999,
      level: 'INTERMEDIATE',
      isPublished: true,
      status: 'PUBLISHED',
      adminVerified: true,
      duration: 3600, // 60 hours
      requirements: JSON.stringify(['Completed Class 11 Physics mechanics', 'Basic integral calculus operations']),
      learningOutcomes: JSON.stringify(['Analyze rotational kinetic energy states', 'Determine magnetic force configurations', 'Solve electric flux equations with Gauss Law', 'Score maximum points on NEB physical derivations']),
      modules: [
        {
          title: 'Rotational Dynamics',
          lessons: ['Moment of inertia of uniform structures', 'Conservation of Angular Momentum', 'Torque and rotational kinetics']
        },
        {
          title: 'Electrostatics & Gauss Law',
          lessons: ['Coulomb\'s Law & electric field lines', 'Gauss Law & electrostatic configurations', 'Capacitors and dielectric materials']
        }
      ]
    },
    {
      title: 'Loksewa Kharidar First Paper Intensive GK & IQ Guide',
      description: 'Syllabus-focused intensive training to crack the Loksewa Kharidar first paper exam. Includes high-efficiency study techniques, national geography highlights, global politics mnemonics, and numerical intelligence shortcuts.',
      category: 'Loksewa',
      price: 2499,
      level: 'INTERMEDIATE',
      isPublished: true,
      status: 'PUBLISHED',
      adminVerified: true,
      duration: 4800, // 80 hours
      requirements: JSON.stringify(['Self-motivation and daily current affairs newspaper reading', 'Secondary school certificate completion']),
      learningOutcomes: JSON.stringify(['Acquire extensive global geography insights', 'Solve number matrices and figure series in under 20 seconds', 'Memorize crucial historical events in Nepal', 'Understand constitutional directives easily']),
      modules: [
        {
          title: 'General Knowledge (GK) Blueprint',
          lessons: ['Geography of Nepal: Rivers & Himalayas', 'History of Nepal: Shah Dynasty & Unification', 'International Organizations: SAARC, UN & BIMSTEC']
        },
        {
          title: 'IQ & Mental Ability',
          lessons: ['Number Series & Matrix completion shortcuts', 'Coding-Decoding and direction test patterns', 'Non-verbal reasoning & visual intelligence puzzles']
        }
      ]
    },
    {
      title: 'Class 8 (BLE) Science & Technology Blueprint',
      description: 'Fully CDC-aligned blueprint covering Physics, Chemistry, Biology, and Astronomy. Highly visual lectures explaining cell division, chemical reactions, environmental balance, and planetary motion for District BLE prep.',
      category: 'Class 8 (BLE)',
      price: 0,
      level: 'BEGINNER',
      isPublished: true,
      status: 'PUBLISHED',
      adminVerified: true,
      duration: 1500, // 25 hours
      requirements: JSON.stringify(['An inquisitive mind', 'Access to general school science materials']),
      learningOutcomes: JSON.stringify(['Explain simple chemical reactions', 'Categorize biological kingdoms and cell models', 'Understand sound, light, and electricity physics basics', 'Demonstrate gravitational principles']),
      modules: [
        {
          title: 'Physics around Us',
          lessons: ['Measurement units and scalar vectors', 'Light reflection & lenses concepts', 'Static and dynamic electricity grids']
        },
        {
          title: 'Chemistry & Biology basics',
          lessons: ['Atoms, elements, and simple chemical formulas', 'Animal and plant cell structures', 'Ecosystems & food chain loops']
        }
      ]
    },
    {
      title: 'Advanced Loksewa Section Officer IQ Prep',
      description: 'High-level training designed to solve advanced verbal, logical, non-verbal, and mathematical reasoning questions. Essential preparation for candidates targeting Loksewa Section Officer status.',
      category: 'Loksewa',
      price: 2999,
      level: 'ADVANCED',
      isPublished: true,
      status: 'PUBLISHED',
      adminVerified: true,
      duration: 3000, // 50 hours
      requirements: JSON.stringify(['Prior exposure to basic verbal reasoning', 'Strong arithmetic and fraction fundamentals']),
      learningOutcomes: JSON.stringify(['Conquer syllogisms and logical deduction modules', 'Perform advanced arithmetic reasoning tasks', 'Crack sectional officer spatial series matrices', 'Maximize confidence under tight mock time frames']),
      modules: [
        {
          title: 'Advanced Verbal Reasoning',
          lessons: ['Logical Deduction & Syllogism techniques', 'Statement-Assumption & critical arguments', 'Data sufficiency exercises']
        },
        {
          title: 'Advanced Quantitative Aptitude',
          lessons: ['Permutations, combinations & probability', 'Advanced average, ratio and time-work metrics', 'Visual spatial reasoning matrices']
        }
      ]
    }
  ];

  for (const cData of genuineCoursesData) {
    const course = await prisma.course.create({
      data: {
        title: cData.title,
        description: cData.description,
        category: cData.category,
        price: cData.price,
        level: cData.level,
        isPublished: cData.isPublished,
        status: cData.status,
        adminVerified: cData.adminVerified,
        duration: cData.duration,
        requirements: cData.requirements,
        learningOutcomes: cData.learningOutcomes,
        teacherId: teacher.id,
      },
    });

    console.log(`Created course: ${course.title}`);

    for (let mIdx = 0; mIdx < cData.modules.length; mIdx++) {
      const mData = cData.modules[mIdx];
      const module = await prisma.module.create({
        data: {
          title: mData.title,
          courseId: course.id,
          order: mIdx + 1,
        },
      });

      for (let lIdx = 0; lIdx < mData.lessons.length; lIdx++) {
        const lessonTitle = mData.lessons[lIdx];
        await prisma.lesson.create({
          data: {
            title: lessonTitle,
            courseId: course.id,
            topicId: module.id,
            order: lIdx + 1,
            lessonType: 'VIDEO',
          },
        });
      }
    }
  }

  console.log('Database Seeding successfully completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
