import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAllSettings() {
    return this.prisma.systemSetting.findMany();
  }

  async getSetting(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      if (key === 'FRONTEND_CMS_CONTENT') {
        return {
          key,
          value: JSON.stringify({
            heroTitle: "Learn the Skills of the Future",
            heroSubtitle: "Join millions of learners from around the world. Master tech, business, and creative skills with expert-led courses.",
            heroButtonText: "Explore Courses",
            footerDescription: "Empowering Nepal's students with CDC-aligned educational resources, board summaries, past papers, and AI-assisted tutoring.",
            feature1Title: "Expert Instructors",
            feature1Desc: "Learn from industry experts passionate about teaching.",
            feature2Title: "Interactive Learning",
            feature2Desc: "Engage with practical assignments and quizzes.",
            feature3Title: "Lifetime Access",
            feature3Desc: "Learn on your schedule, at your own pace.",
            becomeInstructorQuote: "Teaching on SolutionBook allowed me to reach thousands of students outside the Kathmandu valley. The course builder tools are incredibly intuitive.",
            becomeInstructorAuthor: "Ramesh KC, Physics Subject Expert",
            becomeInstructorTitle: "Share Your Knowledge. Earn Revenue.",
            becomeInstructorDesc: "Join our verified instructor program. Upload your PDF lecture summaries, build gamified worksheets, stream recorded classes, and set your own pricing tiers.",
            becomeInstructorImage: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80",
            announcements: [
              { id: "1", badge: "New", text: "📚 NEB Class 12 Routine 2083 Published! View details." },
              { id: "2", badge: "Live", text: "🔥 Loksewa Kharidar Fast-Track Batch Starting Tomorrow." },
              { id: "3", badge: "Free", text: "✨ Class 10 (SEE) Compulsory Math Mock Test Available." },
              { id: "4", badge: "Notice", text: "🎓 Apply for SolutionBook Scholarship Program 2026." }
            ],
            trustedLogos: [
              { name: "React Academy", url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" },
              { name: "Node Inst", url: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" },
              { name: "AWS Cloud School", url: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" },
              { name: "PG University", url: "https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg" },
              { name: "Python Academy", url: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg" }
            ],
            tutors: [
              {
                name: "Sita Sharma",
                subject: "SEE Mathematics Expert",
                bio: "12+ years teaching experience. Specializes in simplifying complex algebra, geometry, and theorems for Class 10 board students.",
                img: "https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=200&q=80"
              },
              {
                name: "Ramesh KC",
                subject: "NEB Physics Head",
                bio: "Former university lecturer. Author of multiple +2 Compulsory Physics solution sets and guides used by schools nationwide.",
                img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"
              },
              {
                name: "Anjali Thapa",
                subject: "Loksewa IQ Specialist",
                bio: "National rank holder in Civil Service Exams. Expert in teaching logical reasoning puzzles, pattern matrices, and speed tricks.",
                img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
              },
              {
                name: "Bimal Shrestha",
                subject: "Accountancy (+2 NEB)",
                bio: "Practicing Chartered Accountant who simplifies complex journal entries, double-entry bookkeeping, and corporate balances.",
                img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80"
              }
            ],
            reviews: [
              {
                text: "The gamified practice worksheets made preparing for SEE Science actually fun. Earning points and checking the daily leaderboard kept me fully motivated. I scored an A+ in Science!",
                name: "Aayush Shrestha",
                level: "Class 10 (SEE) Graduate",
                img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80",
                grade: "A+ 🎓"
              },
              {
                text: "Finding reliable, complete notes for NEB Computer Science and Physics was super hard until I joined this platform. The AI tutor explaining specific textbook notes instantly is a game-changer.",
                name: "Prerana Karki",
                level: "NEB Grade 12 (Science)",
                img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
                grade: "GPA 3.95 ⭐"
              },
              {
                text: "The Loksewa past paper solutions saved me hours of manual searches. The timed mock exams really help simulate the actual testing pressure. Extremely helpful guidance.",
                name: "Bimal Thapa",
                level: "Nayab Subba Aspirant",
                img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80",
                grade: "Selected 💼"
              }
            ]
          }),
        };
      }

      // Legacy fallback: if old format {title, content} exists, the frontend handles both formats
      const pageDefaults: Record<string, string> = {
        // ── Content Pages ──
        PAGE_ABOUT: JSON.stringify({
          title: "About Us",
          hero: { title: "About Us", subtitle: "Nepal's premier learning platform empowering students with CDC-aligned resources.", image: "" },
          blocks: [
            { type: "richtext", id: "b1", content: "<h2>Our Mission</h2><p>Welcome to SolutionBook, Nepal's premier learning platform. We are dedicated to empowering students with high-quality, CDC-aligned educational resources, board summaries, past papers, and AI-assisted tutoring.</p>" },
            { type: "richtext", id: "b2", content: "<h2>Our Vision</h2><p>To make world-class education accessible to every student in Nepal, regardless of their geographical location or economic background.</p>" },
            { type: "stats", id: "b3", items: [
              { label: "Students", value: "50,000+" },
              { label: "Courses", value: "200+" },
              { label: "Instructors", value: "120+" },
              { label: "Districts Covered", value: "77" }
            ]},
            { type: "cta", id: "b4", text: "Join Our Community", link: "/register", variant: "primary" }
          ]
        }),
        PAGE_CAREERS: JSON.stringify({
          title: "Careers",
          hero: { title: "Careers", subtitle: "Join our mission to revolutionize education in Nepal.", image: "" },
          blocks: [
            { type: "richtext", id: "b1", content: "<h2>Why Work With Us?</h2><p>Join our mission to revolutionize education in Nepal. We are always looking for passionate educators, content creators, and software developers to join our team.</p>" },
            { type: "richtext", id: "b2", content: "<h2>Open Positions</h2><p>We're currently hiring for roles in engineering, content creation, and curriculum design. Remote-friendly positions available across Nepal.</p>" },
            { type: "cta", id: "b3", text: "Apply Now", link: "mailto:careers@solutionbook.edu.np", variant: "primary" }
          ]
        }),
        PAGE_PARTNER: JSON.stringify({
          title: "Partner Program",
          hero: { title: "Partner Program", subtitle: "Collaborate with us to expand your reach.", image: "" },
          blocks: [
            { type: "richtext", id: "b1", content: "<h2>Partner With Us</h2><p>Collaborate with us to expand your reach. Our Partner Program is open to academic institutions, tutoring centers, and content publishers across Nepal.</p>" },
            { type: "richtext", id: "b2", content: "<h2>Benefits</h2><p>Partners gain access to our growing student base, co-branded marketing materials, and our curriculum-aligned content library.</p>" },
            { type: "cta", id: "b3", text: "Become a Partner", link: "mailto:partners@solutionbook.edu.np", variant: "primary" }
          ]
        }),
        PAGE_PRESS: JSON.stringify({
          title: "Press Kit",
          hero: { title: "Press Kit", subtitle: "Official media resources, logos, and statements for SolutionBook.", image: "" },
          blocks: [
            { type: "richtext", id: "b1", content: "<h2>Media Resources</h2><p>Official media resources, logos, and statements for SolutionBook. Journalists and media outlets can use these resources for coverage.</p>" },
            { type: "richtext", id: "b2", content: "<h2>Contact Press Team</h2><p>For media inquiries, please reach out to press@solutionbook.edu.np</p>" }
          ]
        }),
        // ── Support Pages ──
        PAGE_HELP: JSON.stringify({
          title: "Help Center",
          hero: { title: "Help Center", subtitle: "Find quick guides and answers to frequently asked questions.", image: "" },
          content: "<h2>Frequently Asked Questions</h2><p>Find quick guides and answers to frequently asked questions about billing, courses, certificates, and our AI tutor features.</p>"
        }),
        PAGE_CONTACT: JSON.stringify({
          title: "Contact Us",
          hero: { title: "Contact Us", subtitle: "We'd love to hear from you.", image: "" },
          content: "<h2>Get in Touch</h2><p>Our support team is here to help. Reach out via email, phone, or visit our office in Kathmandu.</p>",
          contactInfo: {
            email: "support@solutionbook.edu.np",
            phone: "+977-1-4XXXXXX",
            address: "Kathmandu, Nepal",
            hours: "Sunday - Friday, 9:00 AM - 5:00 PM NPT"
          }
        }),
        PAGE_STATUS: JSON.stringify({
          title: "System Status",
          hero: { title: "System Status", subtitle: "Real-time service health monitoring.", image: "" },
          content: "<h2>Current Status</h2><p>All core services are operational. Web servers, databases, and AI tutor subsystems are running normally.</p>"
        }),
        PAGE_FEEDBACK: JSON.stringify({
          title: "Share Feedback",
          hero: { title: "Share Feedback", subtitle: "Your suggestions help us improve.", image: "" },
          content: "<h2>We Value Your Input</h2><p>Your suggestions help us improve. Let us know how we can make your learning experience even better.</p>"
        }),
        // ── Legal Pages ──
        PAGE_PRIVACY: JSON.stringify({
          title: "Privacy Policy",
          hero: { title: "Privacy Policy", subtitle: "Your data, protected.", image: "" },
          lastUpdated: "2026-01-15",
          sections: [
            { id: "s1", heading: "Information We Collect", content: "<p>We collect personal information you provide directly, such as name, email, and payment details when you create an account or enroll in courses.</p>" },
            { id: "s2", heading: "How We Use Your Information", content: "<p>We use your information to provide and improve our services, process payments, send course-related communications, and personalize your learning experience.</p>" },
            { id: "s3", heading: "Data Security", content: "<p>We implement industry-standard security measures to protect your personal information. All data is encrypted in transit and at rest.</p>" },
            { id: "s4", heading: "Your Rights", content: "<p>You have the right to access, correct, or delete your personal information. Contact our support team to exercise these rights.</p>" }
          ]
        }),
        PAGE_TERMS: JSON.stringify({
          title: "Terms of Service",
          hero: { title: "Terms of Service", subtitle: "Please read these terms carefully.", image: "" },
          lastUpdated: "2026-01-15",
          sections: [
            { id: "s1", heading: "Acceptance of Terms", content: "<p>By accessing or using SolutionBook, you agree to be bound by these Terms of Service.</p>" },
            { id: "s2", heading: "User Accounts", content: "<p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>" },
            { id: "s3", heading: "Course Access", content: "<p>Course access is granted upon successful enrollment and payment. Lifetime access courses remain available as long as the platform operates.</p>" },
            { id: "s4", heading: "Refund Policy", content: "<p>Refund requests must be made within 30 days of purchase. Certain course materials may be non-refundable once downloaded.</p>" }
          ]
        }),
        PAGE_COOKIES: JSON.stringify({
          title: "Cookie Settings",
          hero: { title: "Cookie Settings", subtitle: "How we use cookies.", image: "" },
          lastUpdated: "2026-01-15",
          sections: [
            { id: "s1", heading: "What Are Cookies", content: "<p>Cookies are small text files stored on your device to help us improve your experience on SolutionBook.</p>" },
            { id: "s2", heading: "Essential Cookies", content: "<p>Required for basic platform functionality including authentication, session management, and security features.</p>" },
            { id: "s3", heading: "Analytics Cookies", content: "<p>Help us understand how students interact with our platform so we can improve course delivery and content quality.</p>" },
            { id: "s4", heading: "Managing Cookies", content: "<p>You can control cookie preferences through your browser settings. Disabling essential cookies may affect platform functionality.</p>" }
          ]
        }),
        PAGE_LICENSING: JSON.stringify({
          title: "Licensing Model",
          hero: { title: "Licensing Model", subtitle: "Content licensing and usage rights.", image: "" },
          lastUpdated: "2026-01-15",
          sections: [
            { id: "s1", heading: "Instructor Licenses", content: "<p>Instructors retain ownership of their content and grant SolutionBook a non-exclusive license to distribute and market their courses.</p>" },
            { id: "s2", heading: "Student Access", content: "<p>Students receive a limited, non-transferable license to access course content for personal educational use.</p>" },
            { id: "s3", heading: "Institutional Packages", content: "<p>Academic institutions can purchase bulk licenses with customized terms for classroom integration and student access.</p>" }
          ]
        }),
      };

      if (key === 'FOOTER_CONFIG') {
        return {
          key,
          value: JSON.stringify({
            brand: {
              description: "Empowering Nepal's students with CDC-aligned educational resources, board summaries, past papers, and AI-assisted tutoring.",
              socialLinks: [
                { platform: "Facebook", url: "#" },
                { platform: "Twitter", url: "#" },
                { platform: "YouTube", url: "#" }
              ]
            },
            columns: [
              {
                id: "platform",
                title: "Platform",
                visible: true,
                order: 0,
                links: [
                  { label: "About Us", href: "/about" },
                  { label: "Careers", href: "/careers" },
                  { label: "Partner Program", href: "/partner" },
                  { label: "Press Kit", href: "/press" }
                ]
              },
              {
                id: "courses",
                title: "Courses",
                visible: true,
                order: 1,
                links: [
                  { label: "BLE (Class 8)", href: "/courses" },
                  { label: "SEE (Class 10)", href: "/courses" },
                  { label: "NEB (+2 Science)", href: "/courses" },
                  { label: "Loksewa Preparation", href: "/courses" }
                ]
              },
              {
                id: "resources",
                title: "Resources",
                visible: true,
                order: 2,
                links: [
                  { label: "Lecture Summaries", href: "/notes" },
                  { label: "Past Board Papers", href: "/#notes" },
                  { label: "AI Tutor Hub", href: "/courses" },
                  { label: "Edu Blog", href: "/blog" }
                ]
              },
              {
                id: "support",
                title: "Support",
                visible: true,
                order: 3,
                links: [
                  { label: "Help Center", href: "/help" },
                  { label: "Contact Us", href: "/contact" },
                  { label: "System Status", href: "/status" },
                  { label: "Share Feedback", href: "/feedback" }
                ]
              },
              {
                id: "legal",
                title: "Legal",
                visible: true,
                order: 4,
                links: [
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Cookie Settings", href: "/cookies" },
                  { label: "Licensing Model", href: "/licensing" }
                ]
              }
            ],
            bottomBar: {
              copyrightText: "All CDC materials copyright verified. Made in Nepal.",
              paymentBadges: ["eSewa", "Khalti", "IME Pay", "Connect IPS"]
            }
          }),
        };
      }

      if (pageDefaults[key]) {
        return { key, value: pageDefaults[key] };
      }
    }

    return setting ? setting : { key, value: null };
  }

  async setSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
