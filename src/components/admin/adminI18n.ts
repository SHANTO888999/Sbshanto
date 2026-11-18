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
    liveSite: 'Live Site',
    previewLiveSite: 'Preview Site',
    openLiveSite: 'Open Site',
    signOut: 'Sign Out',
    installApp: 'Install App',
    installAdminApp: 'Install App',
    cancel: 'Cancel',
    working: 'Working...',
    save: 'Save',
    saving: 'Saving...',
    edit: 'Edit',
    delete: 'Delete',
    hide: 'Hide',
    publish: 'Publish',
    published: 'Published',
    draft: 'Draft',
    hiddenDraft: 'Draft',
    clear: 'Clear',
    unsavedChanges: 'Unsaved',
  },
  auth: {
    checkingSession: 'Checking session...',
    adminSignIn: 'Admin Sign In',
    verifyYourEmail: 'Verify Email',
    emailLabel: 'Email',
    emailPlaceholder: 'admin@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    signingIn: 'Signing In...',
    signInButton: 'Sign In',
    notVerifiedError: 'Email not verified yet.',
    sendVerification: 'Send Verification Email',
    sendingVerification: 'Sending...',
    iveVerified: "I've Verified",
    notAuthorized: 'is not authorized.',
    tryAnotherAccount: 'Switch Account',
  },
  nav: {
    controlCenter: 'Admin',
    overview: 'Overview',
    analytics: 'Analytics',
    profile: 'Profile',
    projects: 'Projects',
    career: 'Career',
    inquiries: 'Inquiries',
    subProfile: {
      identity: 'Identity',
      contact: 'Contact & Quote',
      metrics: 'Metrics',
      process: 'Services & Stack',
      viewer: 'Site Settings',
      cv: 'CV / PDF',
    },
    subCareer: {
      milestones: 'Milestones',
      experience: 'Timeline',
    },
  },
  overview: {
    heading: 'Overview',
    cloudInitTitle: 'Cloud defaults not initialized',
    syncButton: 'Initialize Cloud',
    liveRightNow: 'Online Now',
    todayVisitors: 'Today Visitors',
    totalSuffix: 'total',
    publishedProjects: 'Published Projects',
    milestonesTimeline: 'Career Entries',
    newInquiries: 'New Inquiries',
    quickShortcuts: 'Shortcuts',
    editNamePhotoBio: 'Edit Profile',
    addUpdateProjects: 'Manage Projects',
    milestonesExperience: 'Career & Milestones',
    openInquiries: 'Inquiries',
    viewAnalytics: 'Analytics',
    cvCloudStatus: 'Resume / CV',
    publicCvOn: 'Public: ON',
    publicCvOff: 'Public: OFF',
    downloadCv: 'Download PDF',
    cvToggleSettings: 'CV Settings',
    resyncDefaults: 'Reset Cloud',
    seedDialogTitle: 'Initialize Cloud Defaults',
    seedDialogDesc: 'Write starter settings, projects, milestones, and timeline to Firestore.',
    seedDialogConfirm: 'Initialize',
  },
  analytics: {
    heading: 'Analytics',
    liveNowTitle: 'Online Now',
    noActiveViewers: '0 active sessions',
    todayVisitors: 'Today Visitors',
    pageViewsToday: 'views',
    monthVisitors: 'This Month',
    monthlyViewsAllTime: 'views ·',
    projectClicks: 'Project Clicks',
    noClicks: 'No clicks yet',
    hireSubmissions: 'Hire Submissions',
    opensSuffix: 'opens',
    conversionCv: 'conv · CV:',
    dailyTrafficTitle: 'Traffic (14d)',
    monthlyTrafficTitle: 'Traffic (6m)',
    dailyBtn: '14d',
    monthlyBtn: '6m',
    uniqueVisitors: 'Visitors',
    interactionsLabel: 'Interactions',
    emptyTraffic: 'No traffic data yet.',
    mostClickedTitle: 'Top Projects',
    noTrackedProjects: 'No clicks recorded.',
    clicksLabel: 'clicks',
    countriesTitle: 'Countries',
    noCountryData: 'No country data yet.',
    ageGroupsTitle: 'Age Groups',
    noAgeData: 'No data yet.',
    hireFunnelTitle: 'Hire Funnel',
    modalOpens: 'Opened',
    submittedBriefs: 'Submitted',
    cvDownloadsTitle: 'CV Downloads',
    allTimeViewsTitle: 'Total Page Views',
    daysRecorded: 'days recorded',
  },
  projects: {
    heading: 'Projects',
    addNew: 'New Project',
    filterPlaceholder: 'Search projects...',
    emptyCloudTitle: 'No cloud projects yet.',
    emptyFilterTitle: 'No matching projects.',
    createFirst: 'Add Project',
    deleteTitle: 'Delete Project',
    deleteConfirm: 'Delete permanently?',
    backToProjects: 'Projects',
    editHeading: 'Edit Project',
    newHeading: 'New Project',
    publishedOnSite: 'Published',
    saveProject: 'Save Project',
    slidesTitle: 'Media (Up to 5 Photos or Video)',
    addPhotosBtn: 'Photos',
    shortVideoBtn: 'Video',
    addPhotoUrlPlaceholder: 'https://...',
    addPhotoUrlBtn: 'Add',
    noMediaYet: 'Fallback vector preview active',
    setCover: 'Cover',
    liveUrlLabel: 'Live URL',
    repoUrlLabel: 'Source URL',
    fallbackThemeLabel: 'Fallback Theme',
    enterNextError: 'Fill in all required fields.',
  },
  profile: {
    heading: 'Profile & Settings',
    loadDefaults: 'Defaults',
    saveSettings: 'Save Changes',
    starterDemosTitle: 'Show Starter Demo Projects',
    publicCvTitle: 'Public CV Download Button',
  },
  career: {
    heading: 'Career & Milestones',
    addMilestone: 'New Milestone',
    addExperience: 'New Entry',
    milestonesTab: 'Milestones',
    experienceTab: 'Timeline',
    emptyMilestones: 'No milestones saved.',
    emptyExperience: 'No timeline entries saved.',
    deleteMilestoneTitle: 'Delete Milestone',
    deleteExperienceTitle: 'Delete Entry',
    saveMilestone: 'Save Milestone',
    saveEntry: 'Save Entry',
  },
  inquiries: {
    heading: 'Inquiries',
    emptyTitle: 'No inquiries.',
    copyEmail: 'Copy',
    copied: 'Copied',
    reply: 'Reply',
    deleteTitle: 'Delete Inquiry',
    statuses: {
      all: 'All',
      new: 'New',
      read: 'Read',
      replied: 'Replied',
      archived: 'Archived',
    },
  },
};

const BN_COPY: AdminTranslations = {
  common: {
    back: 'পেছনে',
    refresh: 'রিফ্রেশ',
    liveSite: 'লাইভ সাইট',
    previewLiveSite: 'সাইট দেখুন',
    openLiveSite: 'সাইট খুলুন',
    signOut: 'লগ আউট',
    installApp: 'ইনস্টল',
    installAdminApp: 'অ্যাপ ইনস্টল',
    cancel: 'বাতিল',
    working: 'অপেক্ষা...',
    save: 'সেভ',
    saving: 'সেভ হচ্ছে...',
    edit: 'এডিট',
    delete: 'ডিলিট',
    hide: 'হাইড',
    publish: 'পাবলিশ',
    published: 'পাবলিশড',
    draft: 'ড্রাফট',
    hiddenDraft: 'ড্রাফট',
    clear: 'মুছুন',
    unsavedChanges: 'আনসেভড',
  },
  auth: {
    checkingSession: 'সেশন যাচাই হচ্ছে...',
    adminSignIn: 'অ্যাডমিন লগইন',
    verifyYourEmail: 'ইমেইল ভেরিফাই',
    emailLabel: 'ইমেইল',
    emailPlaceholder: 'admin@example.com',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: '••••••••',
    signingIn: 'লগইন হচ্ছে...',
    signInButton: 'লগইন',
    notVerifiedError: 'ইমেইল ভেরিফাই করা নেই।',
    sendVerification: 'ভেরিফিকেশন পাঠান',
    sendingVerification: 'পাঠানো হচ্ছে...',
    iveVerified: 'ভেরিফাই করেছি',
    notAuthorized: 'অনুমোদিত নয়।',
    tryAnotherAccount: 'অন্য অ্যাকাউন্ট',
  },
  nav: {
    controlCenter: 'অ্যাডমিন',
    overview: 'ওভারভিউ',
    analytics: 'অ্যানালিটিক্স',
    profile: 'প্রোফাইল',
    projects: 'প্রজেক্ট',
    career: 'ক্যারিয়ার',
    inquiries: 'মেসেজ',
    subProfile: {
      identity: 'পরিচিতি',
      contact: 'যোগাযোগ ও কোট',
      metrics: 'মেট্রিক্স',
      process: 'সার্ভিস ও স্ট্যাক',
      viewer: 'সাইট সেটিংস',
      cv: 'সিভি / PDF',
    },
    subCareer: {
      milestones: 'মাইলস্টোন',
      experience: 'টাইমলাইন',
    },
  },
  overview: {
    heading: 'ওভারভিউ',
    cloudInitTitle: 'ক্লাউড ডিফল্ট সেট করা নেই',
    syncButton: 'ক্লাউড সেটআপ',
    liveRightNow: 'অনলাইন এখন',
    todayVisitors: 'আজকের ভিজিটর',
    totalSuffix: 'মোট',
    publishedProjects: 'পাবলিশড প্রজেক্ট',
    milestonesTimeline: 'ক্যারিয়ার এন্ট্রি',
    newInquiries: 'নতুন মেসেজ',
    quickShortcuts: 'শর্টকাট',
    editNamePhotoBio: 'প্রোফাইল এডিট',
    addUpdateProjects: 'প্রজেক্ট ম্যানেজ',
    milestonesExperience: 'মাইলস্টোন ও ক্যারিয়ার',
    openInquiries: 'মেসেজ',
    viewAnalytics: 'অ্যানালিটিক্স',
    cvCloudStatus: 'সিভি / PDF',
    publicCvOn: 'পাবলিক: চালু',
    publicCvOff: 'পাবলিক: বন্ধ',
    downloadCv: 'PDF ডাউনলোড',
    cvToggleSettings: 'সিভি সেটিংস',
    resyncDefaults: 'ক্লাউড রিসেট',
    seedDialogTitle: 'ক্লাউড ডিফল্ট সেটআপ',
    seedDialogDesc: 'ফায়ারস্টোরে প্রাথমিক সেটিংস ও ডেমো প্রজেক্ট সেভ করবে।',
    seedDialogConfirm: 'সেটআপ করুন',
  },
  analytics: {
    heading: 'অ্যানালিটিক্স',
    liveNowTitle: 'অনলাইন এখন',
    noActiveViewers: '০ জন সক্রিয়',
    todayVisitors: 'আজকের ভিজিটর',
    pageViewsToday: 'ভিউ',
    monthVisitors: 'এই মাস',
    monthlyViewsAllTime: 'ভিউ ·',
    projectClicks: 'প্রজেক্ট ক্লিক',
    noClicks: 'ক্লিক নেই',
    hireSubmissions: 'হায়ার মেসেজ',
    opensSuffix: 'ওপেন',
    conversionCv: 'রেট · সিভি:',
    dailyTrafficTitle: 'ট্রাফিক (১৪ দিন)',
    monthlyTrafficTitle: 'ট্রাফিক (৬ মাস)',
    dailyBtn: '১৪ দিন',
    monthlyBtn: '৬ মাস',
    uniqueVisitors: 'ভিজিটর',
    interactionsLabel: 'ইন্টারঅ্যাকশন',
    emptyTraffic: 'কোনো ট্রাফিক ডেটা নেই।',
    mostClickedTitle: 'শীর্ষ প্রজেক্ট',
    noTrackedProjects: 'কোনো ক্লিক নেই।',
    clicksLabel: 'ক্লিক',
    countriesTitle: 'দেশসমূহ',
    noCountryData: 'দেশের ডেটা নেই।',
    ageGroupsTitle: 'বয়স গ্রুপ',
    noAgeData: 'ডেটা নেই।',
    hireFunnelTitle: 'হায়ার ফানেল',
    modalOpens: 'ফর্ম ওপেন',
    submittedBriefs: 'জমা',
    cvDownloadsTitle: 'সিভি ডাউনলোড',
    allTimeViewsTitle: 'মোট পেজ ভিউ',
    daysRecorded: 'দিন রেকর্ড',
  },
  projects: {
    heading: 'প্রজেক্ট',
    addNew: 'নতুন প্রজেক্ট',
    filterPlaceholder: 'খুঁজুন...',
    emptyCloudTitle: 'কোনো ক্লাউড প্রজেক্ট নেই।',
    emptyFilterTitle: 'কিছু পাওয়া যায়নি।',
    createFirst: 'প্রজেক্ট যোগ',
    deleteTitle: 'ডিলিট প্রজেক্ট',
    deleteConfirm: 'স্থায়ীভাবে মুছে ফেলবেন?',
    backToProjects: 'প্রজেক্ট',
    editHeading: 'প্রজেক্ট এডিট',
    newHeading: 'নতুন প্রজেক্ট',
    publishedOnSite: 'পাবলিশড',
    saveProject: 'সেভ প্রজেক্ট',
    slidesTitle: 'মিডিয়া (সর্বোচ্চ ৫টি ছবি বা ভিডিও)',
    addPhotosBtn: 'ছবি যোগ',
    shortVideoBtn: 'ভিডিও',
    addPhotoUrlPlaceholder: 'https://...',
    addPhotoUrlBtn: 'যোগ',
    noMediaYet: 'ডিফল্ট প্রিভিউ',
    setCover: 'কভার',
    liveUrlLabel: 'লাইভ URL',
    repoUrlLabel: 'সোর্স URL',
    fallbackThemeLabel: 'থিম',
    enterNextError: 'প্রয়োজনীয় সব তথ্য দিন।',
  },
  profile: {
    heading: 'প্রোফাইল ও সেটিংস',
    loadDefaults: 'ডিফল্ট',
    saveSettings: 'সেভ করুন',
    starterDemosTitle: 'ডেমো প্রজেক্ট সাথে দেখাও',
    publicCvTitle: 'পাবলিক সিভি বাটন',
  },
  career: {
    heading: 'ক্যারিয়ার ও মাইলস্টোন',
    addMilestone: 'নতুন মাইলস্টোন',
    addExperience: 'নতুন এন্ট্রি',
    milestonesTab: 'মাইলস্টোন',
    experienceTab: 'টাইমলাইন',
    emptyMilestones: 'কোনো মাইলস্টোন নেই।',
    emptyExperience: 'কোনো এন্ট্রি নেই।',
    deleteMilestoneTitle: 'ডিলিট মাইলস্টোন',
    deleteExperienceTitle: 'ডিলিট এন্ট্রি',
    saveMilestone: 'সেভ মাইলস্টোন',
    saveEntry: 'সেভ এন্ট্রি',
  },
  inquiries: {
    heading: 'মেসেজ',
    emptyTitle: 'কোনো মেসেজ নেই।',
    copyEmail: 'কপি',
    copied: 'কপিড',
    reply: 'রিপ্লাই',
    deleteTitle: 'ডিলিট মেসেজ',
    statuses: {
      all: 'সব',
      new: 'নতুন',
      read: 'পড়া',
      replied: 'রিপ্লাইড',
      archived: 'আর্কাইভ',
    },
  },
};

export function getAdminCopy(lang: AdminLang): AdminTranslations {
  return lang === 'bn' ? BN_COPY : EN_COPY;
}
