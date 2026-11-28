export type AdminLang = 'en' | 'bn';

const LANG_STORAGE_KEY = 'shanto_admin_lang';

export function readStoredAdminLang(): AdminLang {
  if (typeof window === 'undefined') return 'en';
  try {
    const val = window.localStorage.getItem(LANG_STORAGE_KEY);
    return val === 'bn' ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}

export function writeStoredAdminLang(lang: AdminLang): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage restriction
  }
}

export interface AdminTranslations {
  common: {
    back: string;
    refresh: string;
    liveSite: string;
    previewLiveSite: string;
    openLiveSite: string;
    signOut: string;
    installApp: string;
    installAdminApp: string;
    cancel: string;
    working: string;
    save: string;
    saving: string;
    edit: string;
    delete: string;
    hide: string;
    publish: string;
    published: string;
    draft: string;
    hiddenDraft: string;
    clear: string;
    unsavedChanges: string;
  };
  auth: {
    checkingSession: string;
    adminSignIn: string;
    verifyYourEmail: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    signingIn: string;
    signInButton: string;
    notVerifiedError: string;
    sendVerification: string;
    sendingVerification: string;
    iveVerified: string;
    notAuthorized: string;
    tryAnotherAccount: string;
  };
  nav: {
    controlCenter: string;
    overview: string;
    analytics: string;
    profile: string;
    projects: string;
    career: string;
    inquiries: string;
    subProfile: {
      identity: string;
      contact: string;
      social: string;
      metrics: string;
      process: string;
      viewer: string;
      cv: string;
    };
    subCareer: {
      milestones: string;
      experience: string;
    };
  };
  overview: {
    heading: string;
    cloudInitTitle: string;
    syncButton: string;
    liveRightNow: string;
    todayVisitors: string;
    totalSuffix: string;
    publishedProjects: string;
    milestonesTimeline: string;
    newInquiries: string;
    quickShortcuts: string;
    editNamePhotoBio: string;
    addUpdateProjects: string;
    milestonesExperience: string;
    openInquiries: string;
    viewAnalytics: string;
    cvCloudStatus: string;
    publicCvOn: string;
    publicCvOff: string;
    downloadCv: string;
    cvToggleSettings: string;
    resyncDefaults: string;
    seedDialogTitle: string;
    seedDialogDesc: string;
    seedDialogConfirm: string;
  };
  analytics: {
    heading: string;
    liveNowTitle: string;
    noActiveViewers: string;
    todayVisitors: string;
    pageViewsToday: string;
    monthVisitors: string;
    monthlyViewsAllTime: string;
    projectClicks: string;
    noClicks: string;
    hireSubmissions: string;
    opensSuffix: string;
    conversionCv: string;
    dailyTrafficTitle: string;
    monthlyTrafficTitle: string;
    dailyBtn: string;
    monthlyBtn: string;
    uniqueVisitors: string;
    interactionsLabel: string;
    emptyTraffic: string;
    mostClickedTitle: string;
    noTrackedProjects: string;
    clicksLabel: string;
    countriesTitle: string;
    noCountryData: string;
    ageGroupsTitle: string;
    noAgeData: string;
    hireFunnelTitle: string;
    modalOpens: string;
    submittedBriefs: string;
    cvDownloadsTitle: string;
    allTimeViewsTitle: string;
    daysRecorded: string;
  };
  projects: {
    heading: string;
    addNew: string;
    filterPlaceholder: string;
    emptyCloudTitle: string;
    emptyFilterTitle: string;
    createFirst: string;
    deleteTitle: string;
    deleteConfirm: string;
    backToProjects: string;
    editHeading: string;
    newHeading: string;
    publishedOnSite: string;
    saveProject: string;
    slidesTitle: string;
    addPhotosBtn: string;
    shortVideoBtn: string;
    addPhotoUrlPlaceholder: string;
    addPhotoUrlBtn: string;
    noMediaYet: string;
    setCover: string;
    deletePhoto: string;
    deleteVideo: string;
    deleteAllMedia: string;
    videoAttachedLabel: string;
    liveUrlLabel: string;
    repoUrlLabel: string;
    fallbackThemeLabel: string;
    enterNextError: string;
  };
  profile: {
    heading: string;
    loadDefaults: string;
    saveSettings: string;
    starterDemosTitle: string;
    publicCvTitle: string;
  };
  career: {
    heading: string;
    addMilestone: string;
    addExperience: string;
    milestonesTab: string;
    experienceTab: string;
    emptyMilestones: string;
    emptyExperience: string;
    deleteMilestoneTitle: string;
    deleteExperienceTitle: string;
    saveMilestone: string;
    saveEntry: string;
  };
  inquiries: {
    heading: string;
    emptyTitle: string;
    copyEmail: string;
    copied: string;
    reply: string;
    deleteTitle: string;
    statuses: {
      all: string;
      new: string;
      read: string;
      replied: string;
      archived: string;
    };
  };
}

const EN_COPY: AdminTranslations = {
  common: {
    back: 'Back',
    refresh: 'Refresh',
    liveSite: 'View Site',
    previewLiveSite: 'View Site',
    openLiveSite: 'Open Website',
    signOut: 'Log Out',
    installApp: 'Install App',
    installAdminApp: 'Install App',
    cancel: 'Cancel',
    working: 'Please wait...',
    save: 'Save',
    saving: 'Saving...',
    edit: 'Edit',
    delete: 'Delete',
    hide: 'Hide',
    publish: 'Show',
    published: 'Visible',
    draft: 'Hidden',
    hiddenDraft: 'Hidden',
    clear: 'Clear',
    unsavedChanges: 'Not Saved Yet',
  },
  auth: {
    checkingSession: 'Checking login...',
    adminSignIn: 'Admin Login',
    verifyYourEmail: 'Verify Email',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    signingIn: 'Logging in...',
    signInButton: 'Log In',
    notVerifiedError: 'Please verify your email first.',
    sendVerification: 'Send Verification Link',
    sendingVerification: 'Sending...',
    iveVerified: "I've Verified",
    notAuthorized: 'does not have admin access.',
    tryAnotherAccount: 'Use Another Account',
  },
  nav: {
    controlCenter: 'Admin',
    overview: 'Home',
    analytics: 'Visitors',
    profile: 'My Profile',
    projects: 'Projects',
    career: 'Experience',
    inquiries: 'Messages',
    subProfile: {
      identity: 'Name & Photo',
      contact: 'Contact Info',
      social: 'Social Links',
      metrics: 'Highlights',
      process: 'Services & Skills',
      viewer: 'Site Look',
      cv: 'CV / Resume',
    },
    subCareer: {
      milestones: 'Achievements',
      experience: 'Work History',
    },
  },
  overview: {
    heading: 'Welcome Back',
    cloudInitTitle: 'First-time setup not done yet',
    syncButton: 'Set Up Website Data',
    liveRightNow: 'Active Right Now',
    todayVisitors: "Today's Visitors",
    totalSuffix: 'total',
    publishedProjects: 'Visible Projects',
    milestonesTimeline: 'Career & Awards',
    newInquiries: 'New Messages',
    quickShortcuts: 'Quick Actions',
    editNamePhotoBio: 'Edit Name, Photo & Social',
    addUpdateProjects: 'Add or Edit Projects',
    milestonesExperience: 'Update Experience',
    openInquiries: 'Read Messages',
    viewAnalytics: 'See Visitor Stats',
    cvCloudStatus: 'Your Resume / CV',
    publicCvOn: 'Shown on Site',
    publicCvOff: 'Hidden on Site',
    downloadCv: 'Download CV',
    cvToggleSettings: 'CV Settings',
    resyncDefaults: 'Reset Website',
    seedDialogTitle: 'Set Up Starter Data',
    seedDialogDesc: 'Save starter profile info and sample projects to your website?',
    seedDialogConfirm: 'Set Up Now',
  },
  analytics: {
    heading: 'Visitor Stats',
    liveNowTitle: 'People Online Now',
    noActiveViewers: 'No one viewing right now',
    todayVisitors: "Today's Visitors",
    pageViewsToday: 'views today',
    monthVisitors: 'This Month',
    monthlyViewsAllTime: 'views ·',
    projectClicks: 'Project Views',
    noClicks: 'No clicks yet',
    hireSubmissions: 'Client Messages',
    opensSuffix: 'opened form',
    conversionCv: 'rate · CV downloads:',
    dailyTrafficTitle: 'Visitors (Last 14 Days)',
    monthlyTrafficTitle: 'Visitors (Last 6 Months)',
    dailyBtn: '14 Days',
    monthlyBtn: '6 Months',
    uniqueVisitors: 'Visitors',
    interactionsLabel: 'Clicks & Actions',
    emptyTraffic: 'No visitor data recorded yet.',
    mostClickedTitle: 'Most Viewed Projects',
    noTrackedProjects: 'No project clicks yet.',
    clicksLabel: 'clicks',
    countriesTitle: 'Visitor Countries',
    noCountryData: 'No country data yet.',
    ageGroupsTitle: 'Age Groups',
    noAgeData: 'No data yet.',
    hireFunnelTitle: 'Contact Form',
    modalOpens: 'Opened',
    submittedBriefs: 'Sent',
    cvDownloadsTitle: 'CV Downloads',
    allTimeViewsTitle: 'Total Page Views',
    daysRecorded: 'days recorded',
  },
  projects: {
    heading: 'Your Projects',
    addNew: 'Add Project',
    filterPlaceholder: 'Search by project name...',
    emptyCloudTitle: 'No projects added yet.',
    emptyFilterTitle: 'No matching projects found.',
    createFirst: 'Add First Project',
    deleteTitle: 'Delete Project',
    deleteConfirm: 'Delete this project permanently?',
    backToProjects: 'Projects',
    editHeading: 'Edit Project',
    newHeading: 'Add New Project',
    publishedOnSite: 'Shown on Site',
    saveProject: 'Save Project',
    slidesTitle: 'Project Photos or Video (Max 5 Photos)',
    addPhotosBtn: 'Add Photos',
    shortVideoBtn: 'Add Video',
    addPhotoUrlPlaceholder: 'Or paste photo link (https://...)',
    addPhotoUrlBtn: 'Add Link',
    noMediaYet: 'Default preview shown',
    setCover: 'Main Photo',
    deletePhoto: 'Delete Photo',
    deleteVideo: 'Delete Video',
    deleteAllMedia: 'Delete All',
    videoAttachedLabel: 'Video attached',
    liveUrlLabel: 'Live Website / App Link',
    repoUrlLabel: 'Code / GitHub Link (Optional)',
    fallbackThemeLabel: 'Preview Style',
    enterNextError: 'Please fill in all required fields marked with *.',
  },
  profile: {
    heading: 'Profile & Website Info',
    loadDefaults: 'Reset Defaults',
    saveSettings: 'Save Changes',
    starterDemosTitle: 'Show Sample Demo Projects on Website',
    publicCvTitle: 'Show CV Download Button on Website',
  },
  career: {
    heading: 'Experience & Achievements',
    addMilestone: 'Add Achievement',
    addExperience: 'Add Experience',
    milestonesTab: 'Achievements',
    experienceTab: 'Work History',
    emptyMilestones: 'No achievements added yet.',
    emptyExperience: 'No work history added yet.',
    deleteMilestoneTitle: 'Delete Achievement',
    deleteExperienceTitle: 'Delete Work History',
    saveMilestone: 'Save Achievement',
    saveEntry: 'Save Entry',
  },
  inquiries: {
    heading: 'Client Messages',
    emptyTitle: 'No messages yet.',
    copyEmail: 'Copy Email',
    copied: 'Copied!',
    reply: 'Send Reply',
    deleteTitle: 'Delete Message',
    statuses: {
      all: 'All',
      new: 'New',
      read: 'Read',
      replied: 'Replied',
      archived: 'Saved',
    },
  },
};

const BN_COPY: AdminTranslations = {
  common: {
    back: 'পেছনে যান',
    refresh: 'রিফ্রেশ',
    liveSite: 'সাইট দেখুন',
    previewLiveSite: 'সাইট দেখুন',
    openLiveSite: 'ওয়েবসাইট খুলুন',
    signOut: 'লগ আউট',
    installApp: 'অ্যাপ নিন',
    installAdminApp: 'অ্যাপ ইনস্টল',
    cancel: 'বাতিল',
    working: 'অপেক্ষা করুন...',
    save: 'সেভ করুন',
    saving: 'সেভ হচ্ছে...',
    edit: 'এডিট',
    delete: 'ডিলিট',
    hide: 'লুকান',
    publish: 'দেখান',
    published: 'দেখাচ্ছে',
    draft: 'লুকানো',
    hiddenDraft: 'লুকানো',
    clear: 'মুছুন',
    unsavedChanges: 'সেভ করা হয়নি',
  },
  auth: {
    checkingSession: 'লগইন চেক হচ্ছে...',
    adminSignIn: 'অ্যাডমিন লগইন',
    verifyYourEmail: 'ইমেইল নিশ্চিত করুন',
    emailLabel: 'ইমেইল',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: '••••••••',
    signingIn: 'লগইন হচ্ছে...',
    signInButton: 'লগইন করুন',
    notVerifiedError: 'আগে আপনার ইমেইল ভেরিফাই করুন।',
    sendVerification: 'ভেরিফিকেশন লিংক পাঠান',
    sendingVerification: 'পাঠানো হচ্ছে...',
    iveVerified: 'ভেরিফাই করেছি',
    notAuthorized: 'অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।',
    tryAnotherAccount: 'অন্য অ্যাকাউন্ট দিন',
  },
  nav: {
    controlCenter: 'অ্যাডমিন',
    overview: 'হোম',
    analytics: 'ভিজিটর',
    profile: 'প্রোফাইল',
    projects: 'প্রজেক্ট',
    career: 'অভিজ্ঞতা',
    inquiries: 'মেসেজ',
    subProfile: {
      identity: 'নাম ও ছবি',
      contact: 'যোগাযোগ তথ্য',
      social: 'সোশ্যাল মিডিয়া',
      metrics: 'মূল সংখ্যা',
      process: 'কাজ ও স্কিল',
      viewer: 'সাইট ডিজাইন',
      cv: 'সিভি / PDF',
    },
    subCareer: {
      milestones: 'অর্জনসমূহ',
      experience: 'কাজের ইতিহাস',
    },
  },
  overview: {
    heading: 'স্বাগতম',
    cloudInitTitle: 'প্রাথমিক তথ্য সেট করা নেই',
    syncButton: 'শুরু করুন',
    liveRightNow: 'এখন অনলাইনে আছেন',
    todayVisitors: 'আজকের ভিজিটর',
    totalSuffix: 'মোট',
    publishedProjects: 'প্রজেক্ট দেখাচ্ছে',
    milestonesTimeline: 'অভিজ্ঞতা ও অর্জন',
    newInquiries: 'নতুন মেসেজ',
    quickShortcuts: 'সহজ শর্টকাট',
    editNamePhotoBio: 'নাম, ছবি ও সোশ্যাল ঠিক করুন',
    addUpdateProjects: 'প্রজেক্ট যোগ বা এডিট করুন',
    milestonesExperience: 'অভিজ্ঞতা আপডেট করুন',
    openInquiries: 'মেসেজ দেখুন',
    viewAnalytics: 'ভিজিটর হিসাব দেখুন',
    cvCloudStatus: 'আপনার সিভি (CV)',
    publicCvOn: 'সাইটে দেখাচ্ছে',
    publicCvOff: 'লুকানো আছে',
    downloadCv: 'সিভি ডাউনলোড',
    cvToggleSettings: 'সিভি সেটিংস',
    resyncDefaults: 'রিসেট করুন',
    seedDialogTitle: 'প্রাথমিক তথ্য সেটআপ',
    seedDialogDesc: 'ওয়েবসাইটের জন্য প্রাথমিক প্রোফাইল ও ডেমো প্রজেক্ট সেভ করবেন?',
    seedDialogConfirm: 'সেটআপ করুন',
  },
  analytics: {
    heading: 'ভিজিটর হিসাব',
    liveNowTitle: 'এই মুহূর্তে সাইটে আছেন',
    noActiveViewers: 'এখন কেউ নেই',
    todayVisitors: 'আজকের ভিজিটর',
    pageViewsToday: 'বার দেখা হয়েছে',
    monthVisitors: 'এই মাসে ভিজিটর',
    monthlyViewsAllTime: 'ভিউ ·',
    projectClicks: 'প্রজেক্ট ক্লিক',
    noClicks: 'এখনো ক্লিক নেই',
    hireSubmissions: 'পাঠানো মেসেজ',
    opensSuffix: 'ফর্ম খুলেছেন',
    conversionCv: 'হার · সিভি ডাউনলোড:',
    dailyTrafficTitle: 'ভিজিটর (গত ১৪ দিন)',
    monthlyTrafficTitle: 'ভিজিটর (গত ৬ মাস)',
    dailyBtn: '১৪ দিন',
    monthlyBtn: '৬ মাস',
    uniqueVisitors: 'ভিজিটর',
    interactionsLabel: 'ক্লিক ও অ্যাকশন',
    emptyTraffic: 'এখনো কোনো ভিজিটরের তথ্য নেই।',
    mostClickedTitle: 'জনপ্রিয় প্রজেক্ট',
    noTrackedProjects: 'এখনো কোনো ক্লিক হয়নি।',
    clicksLabel: 'ক্লিক',
    countriesTitle: 'কোন দেশ থেকে ভিজিটর এসেছে',
    noCountryData: 'দেশের তথ্য এখনো নেই।',
    ageGroupsTitle: 'বয়স গ্রুপ',
    noAgeData: 'তথ্য নেই।',
    hireFunnelTitle: 'মেসেজ ফর্ম',
    modalOpens: 'খুলেছেন',
    submittedBriefs: 'পাঠিয়েছেন',
    cvDownloadsTitle: 'সিভি ডাউনলোড',
    allTimeViewsTitle: 'সর্বমোট পেজ ভিউ',
    daysRecorded: 'দিনের হিসাব',
  },
  projects: {
    heading: 'আপনার প্রজেক্টগুলো',
    addNew: 'নতুন প্রজেক্ট যোগ',
    filterPlaceholder: 'প্রজেক্টের নাম লিখে খুঁজুন...',
    emptyCloudTitle: 'এখনো কোনো প্রজেক্ট যোগ করা হয়নি।',
    emptyFilterTitle: 'এই নামে কোনো প্রজেক্ট নেই।',
    createFirst: 'প্রথম প্রজেক্ট যোগ করুন',
    deleteTitle: 'প্রজেক্ট ডিলিট',
    deleteConfirm: 'এই প্রজেক্টটি চিরতরে মুছে ফেলবেন?',
    backToProjects: 'প্রজেক্ট',
    editHeading: 'প্রজেক্ট এডিট',
    newHeading: 'নতুন প্রজেক্ট',
    publishedOnSite: 'সাইটে দেখাচ্ছে',
    saveProject: 'প্রজেক্ট সেভ করুন',
    slidesTitle: 'প্রজেক্টের ছবি বা ভিডিও (সর্বোচ্চ ৫টি ছবি)',
    addPhotosBtn: 'ছবি যোগ করুন',
    shortVideoBtn: 'ভিডিও যোগ করুন',
    addPhotoUrlPlaceholder: 'অথবা ছবির লিংক দিন (https://...)',
    addPhotoUrlBtn: 'যোগ করুন',
    noMediaYet: 'ডিফল্ট প্রিভিউ দেখাচ্ছে',
    setCover: 'প্রথম ছবি',
    deletePhoto: 'ছবি মুছুন',
    deleteVideo: 'ভিডিও মুছুন',
    deleteAllMedia: 'সব মুছুন',
    videoAttachedLabel: 'ভিডিও যুক্ত আছে',
    liveUrlLabel: 'লাইভ ওয়েবসাইট / অ্যাপ লিংক',
    repoUrlLabel: 'কোড / গিটহাব লিংক (ঐচ্ছিক)',
    fallbackThemeLabel: 'প্রিভিউ ডিজাইন',
    enterNextError: 'অনুগ্রহ করে * চিহ্নিত সব ঘর পূরণ করুন।',
  },
  profile: {
    heading: 'প্রোফাইল ও সাইটের তথ্য',
    loadDefaults: 'আগের অবস্থায় ফিরুন',
    saveSettings: 'সব সেভ করুন',
    starterDemosTitle: 'ওয়েবসাইটে ডেমো প্রজেক্টগুলো দেখাবে',
    publicCvTitle: 'ওয়েবসাইটে সিভি ডাউনলোড বাটন দেখাবে',
  },
  career: {
    heading: 'অভিজ্ঞতা ও অর্জন',
    addMilestone: 'নতুন অর্জন যোগ',
    addExperience: 'নতুন অভিজ্ঞতা যোগ',
    milestonesTab: 'অর্জনসমূহ',
    experienceTab: 'কাজের ইতিহাস',
    emptyMilestones: 'এখনো কোনো অর্জন যোগ করা হয়নি।',
    emptyExperience: 'এখনো কোনো কাজের অভিজ্ঞতা যোগ করা হয়নি।',
    deleteMilestoneTitle: 'অর্জন ডিলিট',
    deleteExperienceTitle: 'অভিজ্ঞতা ডিলিট',
    saveMilestone: 'অর্জন সেভ করুন',
    saveEntry: 'অভিজ্ঞতা সেভ করুন',
  },
  inquiries: {
    heading: 'ক্লায়েন্ট মেসেজ',
    emptyTitle: 'কোনো মেসেজ আসেনি।',
    copyEmail: 'ইমেইল কপি',
    copied: 'কপি হয়েছে!',
    reply: 'উত্তর দিন',
    deleteTitle: 'মেসেজ ডিলিট',
    statuses: {
      all: 'সব',
      new: 'নতুন',
      read: 'পড়া হয়েছে',
      replied: 'উত্তর দেওয়া',
      archived: 'সেভ করা',
    },
  },
};

export function getAdminCopy(lang: AdminLang): AdminTranslations {
  return lang === 'bn' ? BN_COPY : EN_COPY;
}
