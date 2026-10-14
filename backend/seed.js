const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Post = require('./models/Post');
const Event = require('./models/Event');
const Blog = require('./models/Blog');
const Donation = require('./models/Donation');
const DonationCampaign = require('./models/DonationCampaign');
const Report = require('./models/Report');
const Notification = require('./models/Notification');
const PlatformSettings = require('./models/PlatformSettings');
const { DEFAULT_CATEGORIES } = require('./controllers/categoryController');

const seedData = async () => {
  try {
    console.log('Clearing all temporary data collections...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Post.deleteMany({});
    await Event.deleteMany({});
    await Blog.deleteMany({});
    await Donation.deleteMany({});
    await DonationCampaign.deleteMany({});
    await Report.deleteMany({});
    await Notification.deleteMany({});
    await PlatformSettings.deleteMany({});

    console.log('Seeding official platform categories...');
    await Category.insertMany(
      DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      }))
    );

    console.log('Seeding official users (Admin, Ram, Sita, Aarav, Kriti, NGO)...');
    const adminUser = await User.create({
      name: 'Super Admin (हातेमालो)',
      email: 'admin@hateymalo.com',
      password: 'admin123',
      role: 'SUPER_ADMIN',
      permissions: [
        'canApprovePosts',
        'canDeletePosts',
        'canManageUsers',
        'canManageDonations',
        'canManageEvents',
        'canManageBlogs',
        'canManageOrganizations',
        'canSendNotifications',
        'canChangeSettings',
      ],
      memberLevel: 'ADMIN',
      isVerified: true,
      profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      location: 'Kathmandu, Nepal',
      bio: 'Official Platform Administrator & Community Coordinator across Nepal.',
      skills: ['Platform Management', 'Community Outreach', 'Emergency Coordination'],
      interests: ['Social Impact', 'Community Welfare', 'Environmental Protection'],
    });

    const userRam = await User.create({
      name: 'Ram Shrestha',
      email: 'ram@hateymalo.com',
      password: 'user123',
      role: 'USER',
      memberLevel: 'VERIFIED MEMBER',
      isVerified: true,
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      location: 'Kathmandu, Nepal',
      bio: 'Passionate civic volunteer & environmentalist based in Thamel, Kathmandu.',
      skills: ['Tree Planting', 'Teaching', 'First Aid'],
      interests: ['Environment', 'Youth Empowerment', 'Education'],
    });

    const userSita = await User.create({
      name: 'Sita Gurung',
      email: 'sita@hateymalo.com',
      password: 'user123',
      role: 'USER',
      memberLevel: 'TRUSTED MEMBER',
      isVerified: true,
      profilePicture: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      location: 'Pokhara, Nepal',
      bio: 'Social worker, student tutor, and lake clean-up activist in Pokhara.',
      skills: ['Tutoring', 'Event Management', 'Public Speaking'],
      interests: ['Education', 'Clean Energy', 'Women Empowerment'],
    });

    const userAarav = await User.create({
      name: 'Aarav Sharma',
      email: 'aarav@hateymalo.com',
      password: 'user123',
      role: 'USER',
      memberLevel: 'TRUSTED MEMBER',
      isVerified: true,
      profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      location: 'Lalitpur, Nepal',
      bio: 'Medical student passionate about blood donation and community health awareness.',
      skills: ['Medical Assistance', 'Blood Donation Drive', 'Health Awareness'],
      interests: ['Healthcare', 'Disaster Relief', 'Sanitation'],
    });

    const userKriti = await User.create({
      name: 'Kriti Thapa',
      email: 'kriti@hateymalo.com',
      password: 'user123',
      role: 'USER',
      memberLevel: 'NEW MEMBER',
      isVerified: false,
      profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
      location: 'Bhaktapur, Nepal',
      bio: 'Youth volunteer focused on heritage preservation and food distribution drives.',
      skills: ['Food Preparation', 'Social Media', 'Art & Craft'],
      interests: ['Heritage', 'Food Distribution', 'Animal Care'],
    });

    const orgSamajSeva = await User.create({
      name: 'Samaj Seva Nepal (NGO)',
      email: 'ngo@hateymalo.com',
      password: 'user123',
      role: 'USER',
      memberLevel: 'ORGANIZATION',
      isVerified: true,
      profilePicture: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=300&q=80',
      location: 'Kathmandu, Nepal',
      bio: 'Registered Non-Profit NGO dedicated to rural education, winter warmth drives, and disaster relief.',
      skills: ['Disaster Relief', 'NGO Operations', 'Fundraising'],
      interests: ['Child Education', 'Rural Support', 'Emergency Aid'],
      orgDetails: {
        orgName: 'Samaj Seva Nepal',
        orgType: 'NGO',
        website: 'https://samajsevanepal.org',
        contactPhone: '+977 1 4220000',
        description: 'Empowering marginalized communities across Nepal through non-profit aid & education.',
      },
    });

    console.log('Seeding official community help posts...');
    const post1 = await Post.create({
      title: 'Clean Bagmati River Campaign & Plastic Collection Drive',
      description: 'Join us this Saturday morning at Shankhamul Ghat to clean plastic waste along the Bagmati riverbed. Gloves, boots, and collection bags will be provided to all volunteers. Together, let\'s revitalize our sacred river!',
      category: 'Cleaning',
      location: 'Shankhamul Ghat, Lalitpur/Kathmandu',
      dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      requiredMembers: 20,
      creator: adminUser._id,
      status: 'APPROVED',
      isFeatured: true,
      featuredOrder: 1,
      joinedUsers: [userRam._id, userSita._id, userAarav._id, userKriti._id],
      interestedUsers: [userRam._id, userSita._id, userAarav._id, orgSamajSeva._id],
      images: ['https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80'],
    });

    const post2 = await Post.create({
      title: 'Free Mathematics & Science Tutoring for Grade 10 SEE Students',
      description: 'We are organizing free weekend tuition sessions for underprivileged Grade 10 students preparing for their SEE board exams. Looking for volunteers who can teach Math, Science, and English for 2 hours on Saturdays.',
      category: 'Education',
      location: 'Patan High School, Lalitpur',
      dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      requiredMembers: 8,
      creator: userRam._id,
      status: 'APPROVED',
      isFeatured: true,
      featuredOrder: 2,
      joinedUsers: [userSita._id, userKriti._id, adminUser._id],
      interestedUsers: [userSita._id, userAarav._id, adminUser._id],
      images: ['https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80'],
    });

    const post3 = await Post.create({
      title: 'Emergency Winter Warm Clothes Collection for Chepang Children',
      description: 'Temperatures are dropping rapidly in rural Chitwan villages. We are collecting warm jackets, sweaters, blankets, and thermal wear for Chepang school children. Drop-off locations in Kathmandu & Pokhara.',
      category: 'Emergency Aid',
      location: 'Ichhyakamana, Chitwan & Collection Center Thamel',
      dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      requiredMembers: 15,
      creator: userSita._id,
      status: 'APPROVED',
      isFeatured: false,
      joinedUsers: [userRam._id, orgSamajSeva._id, adminUser._id],
      interestedUsers: [userRam._id, userAarav._id, userKriti._id],
      images: ['https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80'],
    });

    const post4 = await Post.create({
      title: '1000 Green Tree Saplings Plantation Drive along Ring Road',
      description: 'Help us plant native avocado, jacaranda, and paulownia saplings along the Balkhu-Kirtipur Ring Road stretch. Tools and tree guards will be provided. Let\'s make Kathmandu green again!',
      category: 'Plantation',
      location: 'Balkhu-Kirtipur Stretch, Ring Road, Kathmandu',
      dateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      requiredMembers: 30,
      creator: adminUser._id,
      status: 'APPROVED',
      isFeatured: true,
      featuredOrder: 3,
      joinedUsers: [userRam._id, userSita._id, userAarav._id, userKriti._id, orgSamajSeva._id],
      interestedUsers: [userRam._id, userSita._id, userAarav._id, userKriti._id],
      images: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'],
    });

    const post5 = await Post.create({
      title: 'Community Blood Donation Drive & Free Health Camp',
      description: 'Urgent need for O-negative, A-positive, and B-positive blood units. In partnership with Central Blood Transfusion Service, we are hosting a blood donation camp with free BP & sugar tests.',
      category: 'Blood Donation',
      location: 'Mangal Bazaar Durbar Square, Lalitpur',
      dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      requiredMembers: 25,
      creator: userAarav._id,
      status: 'APPROVED',
      isFeatured: false,
      joinedUsers: [userRam._id, userSita._id, adminUser._id],
      interestedUsers: [userRam._id, userKriti._id],
      images: ['https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80'],
    });

    const post6 = await Post.create({
      title: 'Community Kitchen Food Distribution for Daily Wage Laborers',
      description: 'Samaj Seva Nepal is providing warm meals to 150 daily wage workers and homeless individuals in Kalimati. Volunteers needed for meal preparation, packing, and orderly distribution.',
      category: 'Food Drive',
      location: 'Kalimati Chowk, Kathmandu',
      dateTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      requiredMembers: 12,
      creator: orgSamajSeva._id,
      status: 'APPROVED',
      isFeatured: false,
      joinedUsers: [userSita._id, userKriti._id, userRam._id],
      interestedUsers: [userRam._id, adminUser._id],
      images: ['https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80'],
    });

    const post7 = await Post.create({
      title: 'Free Health & Eye Checkup Camp for Elderly Citizens',
      description: 'Organizing a comprehensive health screening camp providing free eye examinations, prescription glasses distribution, and doctor consultations for elderly residents in Kirtipur.',
      category: 'Medical Help',
      location: 'Kirtipur Community Center, Kathmandu',
      dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      requiredMembers: 10,
      creator: userKriti._id,
      status: 'PENDING',
      isFeatured: false,
      joinedUsers: [],
      interestedUsers: [userAarav._id, adminUser._id],
      images: ['https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80'],
    });

    console.log('Seeding official events...');
    await Event.create({
      title: 'Annual Civic Leadership & Mutual Aid Summit 2026',
      description: 'A nationwide assembly bringing together community leaders, NGO directors, youth volunteers, and local ward officials to discuss grassroots collaboration strategies across Nepal.',
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      location: 'Nepal Academy Hall, Kamaladi, Kathmandu',
      creator: adminUser._id,
      category: 'Assembly',
      coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      joinedUsers: [userRam._id, userSita._id, userAarav._id, orgSamajSeva._id],
      interestedUsers: [userRam._id, userSita._id, userKriti._id],
    });

    await Event.create({
      title: 'Fewa Lake Clean-Up & Biodiversity Protection Workshop',
      description: 'Combining a lakeside plastic cleanup drive with interactive workshops on aquatic ecosystem conservation and eco-tourism practices in Pokhara.',
      date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      location: 'Lakeside Baidam, Pokhara',
      creator: userSita._id,
      category: 'Workshop',
      coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      joinedUsers: [userRam._id, adminUser._id],
      interestedUsers: [userAarav._id, orgSamajSeva._id],
    });

    console.log('Seeding official community blog stories...');
    await Blog.create({
      title: 'How 50 Volunteers Transformed Shankhamul Bagmati Riverbed in 4 Weeks',
      content: 'When we first launched the Bagmati cleanliness initiative on HATEYMALO, many doubted whether a small team of youth volunteers could make an impact. Over four intense weekends, 50 dedicated citizens collected over 2.5 metric tons of non-biodegradable waste. Here is our story of community solidarity...',
      author: userRam._id,
      status: 'APPROVED',
      coverImage: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
      reactions: [adminUser._id, userSita._id, userAarav._id],
    });

    await Blog.create({
      title: 'Empowering Rural Classrooms: The Story Behind Chitwan Book Drive',
      content: 'Access to supplementary reading books and learning materials remains a challenge for students in remote Chepang settlements. Thanks to donations mobilized via HATEYMALO, we successfully established two new community school libraries equipped with over 800 storybooks and science guides.',
      author: userSita._id,
      status: 'APPROVED',
      coverImage: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
      reactions: [adminUser._id, userRam._id],
    });

    await Blog.create({
      title: '100% Financial Transparency: How HATEYMALO Itemized Ledgers Build Trust',
      content: 'In non-profit mutual aid, trust is everything. At HATEYMALO, every donation dollar is tracked down to individual line-item expense receipts. Transparency empowers volunteers and donors to see the tangible real-world impact of their generosity.',
      author: adminUser._id,
      status: 'APPROVED',
      coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      reactions: [userRam._id, userSita._id, orgSamajSeva._id],
    });

    console.log('Seeding donation campaigns & ledgers...');
    const campaign1 = await DonationCampaign.create({
      title: 'Chitwan Rural School Library & Digital Learning Fund',
      description: 'Funding book acquisition, study desks, solar power, and 2 computers for Chepang primary school in Ichhyakamana, Chitwan.',
      goalAmount: 150000,
      raisedAmount: 95000,
      creator: orgSamajSeva._id,
      status: 'ACTIVE',
      post: post3._id,
    });

    await Donation.create({
      campaign: campaign1._id,
      donor: userRam._id,
      type: 'CAMPAIGN',
      amount: 15000,
      paymentMethod: 'eSewa',
      transactionId: 'ESEWA-2026-987123',
      donorMessage: 'For 30 science textbooks and school bags.',
    });

    await Donation.create({
      campaign: campaign1._id,
      donor: userSita._id,
      type: 'CAMPAIGN',
      amount: 10000,
      paymentMethod: 'Khalti',
      transactionId: 'KHALTI-2026-445566',
      donorMessage: 'For student winter jackets purchase.',
    });

    console.log('Seeding official in-app notifications...');
    await Notification.create({
      recipient: adminUser._id,
      sender: userRam._id,
      type: 'JOIN',
      title: 'New Volunteer Joined 🤝',
      message: 'Ram Shrestha joined your campaign "Clean Bagmati River Campaign & Plastic Collection Drive"',
      post: post1._id,
    });

    await Notification.create({
      recipient: adminUser._id,
      sender: userSita._id,
      type: 'JOIN',
      title: 'New Volunteer Joined 🤝',
      message: 'Sita Gurung joined your drive "1000 Green Tree Saplings Plantation Drive"',
      post: post4._id,
    });

    await Notification.create({
      recipient: userRam._id,
      sender: adminUser._id,
      type: 'POST_APPROVED',
      title: 'Post Approved 🎉',
      message: 'Your post "Free Mathematics & Science Tutoring" was approved by Admin!',
      post: post2._id,
    });

    await Notification.create({
      recipient: userSita._id,
      sender: adminUser._id,
      type: 'POST_APPROVED',
      title: 'Post Approved 🎉',
      message: 'Your post "Emergency Winter Warm Clothes Collection" was approved by Admin!',
      post: post3._id,
    });

    console.log('Initializing Platform Settings & CMS...');
    await PlatformSettings.create({
      platformName: 'हातेमालो (HATEYMALO)',
      tagline: 'मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।',
      contactEmail: 'support@hateymalo.com',
      heroSmallLabel: 'Together, We Can Make a Difference',
      heroHeadline: 'मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।',
      heroDescription: 'हातेमालो is an official non-profit community platform where citizens, volunteers, and NGOs collaborate for mutual help, education support, environmental drives, and civic initiatives.',
      heroImage: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1000&q=80',
    });

    console.log('====================================================');
    console.log('  Database Cleaned & Rich Nepali Data Populated!');
    console.log('  Super Admin: admin@hateymalo.com / admin123');
    console.log('  User Ram:    ram@hateymalo.com   / user123');
    console.log('  User Sita:   sita@hateymalo.com  / user123');
    console.log('====================================================');
  } catch (error) {
    console.error('Error seeding authorized data:', error.message);
  }
};

// onlyIfNoUsers: used for the real (Atlas) database. seedData() wipes every
// collection, so a live DB is only seeded when it has no users and no posts.
const autoSeedIfEmpty = async ({ onlyIfNoUsers = false } = {}) => {
  try {
    const userCount = await User.countDocuments();
    const isEmpty = onlyIfNoUsers
      ? userCount === 0 && (await Post.countDocuments()) === 0
      : userCount <= 1;
    if (isEmpty) {
      console.log('Initializing rich community dataset...');
      await seedData();
    }
  } catch (err) {
    console.error('Auto seed check error:', err.message);
  }
};

if (require.main === module) {
  const connectDB = require('./config/db');
  connectDB().then(() => {
    seedData().then(() => process.exit(0));
  });
}

module.exports = seedData;
module.exports.autoSeedIfEmpty = autoSeedIfEmpty;
