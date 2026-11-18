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
    signInPrompt: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    signingIn: string;
    signInButton: string;
    sessionFooter: string;
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
    subtitle: string;
    cloudInitTitle: string;
    cloudInitDesc: string;
    syncButton: string;
    liveRightNow: string;
    activeViewersDesc: string;
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
    cvDesc: string;
    downloadCv: string;
    cvToggleSettings: string;
    resyncDefaults: string;
    seedDialogTitle: string;
    seedDialogDesc: string;
    seedDialogConfirm: string;
  };
  analytics: {
    heading: string;
    subtitle: string;
    liveBadge: string;
    liveNowTitle: string;
    liveNowSubtitle: string;
    noActiveViewers: string;
    todayVisitors: string;
    pageViewsToday: string;
    monthVisitors: string;
    monthlyViewsAllTime: string;
    projectClicks: string;
    waitingClicks: string;
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
    countriesSubtitle: string;
    noCountryData: string;
    ageGroupsTitle: string;
    ageGroupsSubtitle: string;
    noAgeData: string;
    agePrivacyNote: string;
    hireFunnelTitle: string;
    modalOpens: string;
    submittedBriefs: string;
    cvDownloadsTitle: string;
    cvDownloadsDesc: string;
    allTimeViewsTitle: string;
    allTimeViewsDesc: string;
  };
  projects: {
    heading: string;
    subtitle: string;
    addNew: string;
    filterPlaceholder: string;
    starterDemoNoticeTitle: string;
    starterDemoNoticeDesc: string;
    manageStarterToggle: string;
    emptyCloudTitle: string;
    emptyFilterTitle: string;
    emptyCloudDesc: string;
    emptyFilterDesc: string;
    createFirst: string;
    deleteTitle: string;
    deleteConfirm: string;
    backToProjects: string;
    editHeading: string;
    newHeading: string;
    formHint: string;
    publishedOnSite: string;
    saveProject: string;
    slidesTitle: string;
    slidesSubtitle: string;
    addPhotosBtn: string;
    shortVideoBtn: string;
    addPhotoUrlPlaceholder: string;
    addPhotoUrlBtn: string;
    noMediaYet: string;
    setCover: string;
    liveUrlLabel: string;
    liveUrlHint: string;
    repoUrlLabel: string;
    fallbackThemeLabel: string;
    enterNextError: string;
  };
  profile: {
    heading: string;
    subtitle: string;
    loadDefaults: string;
    saveSettings: string;
    starterDemosTitle: string;
    starterDemosDesc: string;
    publicCvTitle: string;
    publicCvDesc: string;
  };
  career: {
    heading: string;
    subtitle: string;
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
    subtitle: string;
    emptyTitle: string;
    emptyDesc: string;
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
    previewLiveSite: 'Preview Live Site',
    openLiveSite: 'Open Live Site',
    signOut: 'Sign Out',
    installApp: 'Install App',
    installAdminApp: 'Install Admin App',
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
    hiddenDraft: 'Hidden Draft',
    clear: 'Clear',
    unsavedChanges: 'Unsaved changes',
  },
  auth: {
    checkingSession: 'Checking admin session...',
    adminSignIn: 'ADMIN SIGN IN',
    verifyYourEmail: 'VERIFY YOUR EMAIL',
    signInPrompt: 'Enter your administrator email and password to manage portfolio content and client inquiries.',
    emailLabel: 'Email Address',
    emailPlaceholder: 'Enter admin email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    signingIn: 'Signing In...',
    signInButton: 'Sign In',
    sessionFooter: 'Session-Only Security · Closing browser or app automatically locks Admin access',
    notVerifiedError: 'Email is not verified yet. Open the link in your inbox, then tap Unlock.',
    sendVerification: 'Send Verification Email',
    sendingVerification: 'Sending...',
    iveVerified: "I've Verified — Unlock Dashboard",
    notAuthorized: 'is not authorized as an administrator.',
    tryAnotherAccount: 'Try Another Account',
  },
  nav: {
    controlCenter: 'Portfolio Control Center',
    overview: 'Overview',
    analytics: 'Analytics',
    profile: 'Profile & Copy',
    projects: 'Projects',
    career: 'Milestones & Bio',
    inquiries: 'Inquiries',
    subProfile: {
      identity: 'Hero & Portrait',
      contact: 'Contact, Quote & CTA',
      metrics: 'Metrics & Partners',
      process: 'Services, Stack & Scenes',
      viewer: 'Viewer Controls',
      cv: 'Resume / CV',
    },
    subCareer: {
      milestones: 'Milestones',
      experience: 'Career Timeline',
    },
  },
  overview: {
    heading: 'STUDIO OVERVIEW',
    subtitle: 'Manage everything displayed on your public portfolio website with automatic character bounds and safe fallbacks.',
    cloudInitTitle: 'Cloud Database Ready to Initialize',
    cloudInitDesc: 'Right now your viewer site is showing built-in defaults. Sync those defaults into Cloud Firestore in one click so you can edit every item directly.',
    syncButton: 'Sync Default Portfolio to Cloud',
    liveRightNow: 'Live Viewers Now',
    activeViewersDesc: 'Real-time visitors currently viewing your website',
    todayVisitors: 'Today Visitors',
    totalSuffix: 'total',
    publishedProjects: 'Published Projects',
    milestonesTimeline: 'Milestones & Timeline',
    newInquiries: 'New Client Inquiries',
    quickShortcuts: 'Quick Shortcuts',
    editNamePhotoBio: 'Edit Name, Photo & Bio',
    addUpdateProjects: 'Add / Update Projects',
    milestonesExperience: 'Milestones & Experience',
    openInquiries: 'Open Inquiries',
    viewAnalytics: 'View Real-Time Visitor Analytics',
    cvCloudStatus: 'Resume / CV & Cloud Status',
    publicCvOn: 'Public CV: ON',
    publicCvOff: 'Public CV: OFF (Admin Only)',
    cvDesc: 'Generate and download your latest portfolio PDF CV here anytime, or configure whether visitors can see the CV button on sbshanto.web.app.',
    downloadCv: 'Download My CV (PDF)',
    cvToggleSettings: 'CV Toggle & Settings',
    resyncDefaults: 'Re-sync Defaults',
    seedDialogTitle: 'Initialize Cloud Settings Document',
    seedDialogDesc: 'Creates the starter cloud settings record in Firestore so your site profile, theme controls, and analytics can be customized anytime.',
    seedDialogConfirm: 'Initialize Cloud',
  },
  analytics: {
    heading: 'REAL-TIME VISITOR ANALYTICS',
    subtitle: 'Live active viewers, country & age insights, most clicked projects, and Hire Me funnel — updates automatically without page refresh.',
    liveBadge: 'Real-Time Stream Active',
    liveNowTitle: 'Active Visitors Right Now',
    liveNowSubtitle: 'Automatically counts visitors currently browsing your site in real time.',
    noActiveViewers: 'Waiting for active viewers right now...',
    todayVisitors: 'Today Visitors',
    pageViewsToday: 'page views today',
    monthVisitors: 'This Month Visitors',
    monthlyViewsAllTime: 'monthly views ·',
    projectClicks: 'Project Card Clicks',
    waitingClicks: 'Waiting for card clicks',
    hireSubmissions: 'Hire Me Submissions',
    opensSuffix: 'opens',
    conversionCv: 'conversion · CV downloads:',
    dailyTrafficTitle: 'Daily Traffic (Last 14 Days)',
    monthlyTrafficTitle: 'Monthly Traffic (6 Months)',
    dailyBtn: 'Daily (14d)',
    monthlyBtn: 'Monthly',
    uniqueVisitors: 'Unique Visitors',
    interactionsLabel: 'Card Clicks + Hire Opens + CV',
    emptyTraffic: 'Live traffic bars fill automatically as real visitors open your public website.',
    mostClickedTitle: 'Most Clicked Projects',
    noTrackedProjects: 'No projects tracked yet. Once visitors inspect project cards, rankings appear here.',
    clicksLabel: 'clicks',
    countriesTitle: 'Visitor Countries',
    countriesSubtitle: 'Automatically detected from visitor connection & locale',
    noCountryData: 'Country breakdown appears automatically as visitors browse your website.',
    ageGroupsTitle: 'Visitor Age Groups (Optional)',
    ageGroupsSubtitle: 'Anonymous age brackets voluntarily shared by visitors',
    noAgeData: 'No age groups shared yet.',
    agePrivacyNote: 'Browsers never expose a visitor’s age automatically. This shows real anonymous counts chosen voluntarily by visitors on your site.',
    hireFunnelTitle: 'Hire Me Funnel',
    modalOpens: 'Modal Opens',
    submittedBriefs: 'Submitted Briefs',
    cvDownloadsTitle: 'Resume / CV Downloads',
    cvDownloadsDesc: 'Counts visitor CV downloads whenever public CV download is switched ON.',
    allTimeViewsTitle: 'All-Time Page Views',
    allTimeViewsDesc: 'Recorded days of public traffic:',
  },
  projects: {
    heading: 'PROJECTS SHOWCASE',
    subtitle: 'Upload multiple photos for video-style slideshow reels, add clickable project URLs, reorder, or hide drafts.',
    addNew: 'Add New Project',
    filterPlaceholder: 'Filter projects...',
    starterDemoNoticeTitle: 'Starter Demo Projects Are Visible on Public Site',
    starterDemoNoticeDesc: 'When you add new projects, your 6 built-in demo showcase projects stay visible alongside them automatically. You can turn them off anytime in Viewer Controls.',
    manageStarterToggle: 'Viewer Controls',
    emptyCloudTitle: 'No custom cloud projects saved yet.',
    emptyFilterTitle: 'No projects match this filter.',
    emptyCloudDesc: 'Click "Add New Project" to add your work — starter demos stay visible on your live website automatically.',
    emptyFilterDesc: 'Try switching category or clearing the search box.',
    createFirst: 'Create First Project',
    deleteTitle: 'Delete Project',
    deleteConfirm: 'Remove this project permanently from your cloud portfolio database?',
    backToProjects: 'Back to Projects',
    editHeading: 'EDIT PROJECT',
    newHeading: 'NEW PROJECT',
    formHint: 'Add multiple photos for an auto-playing slideshow reel plus a clickable live website link.',
    publishedOnSite: 'Published on Site',
    saveProject: 'Save Project',
    slidesTitle: 'Project Slideshow Photos (Up to 5) or Short Video',
    slidesSubtitle: 'Pick multiple photos from your phone/PC — on your main site they auto-play smoothly one after another like a video.',
    addPhotosBtn: 'Add Photos (Multi)',
    shortVideoBtn: 'Short Video',
    addPhotoUrlPlaceholder: 'Or paste image URL (https://...)',
    addPhotoUrlBtn: 'Add URL',
    noMediaYet: 'No custom photos yet — showing fallback vector preview.',
    setCover: 'Cover',
    liveUrlLabel: 'Live Project URL (Visitors can open this directly)',
    liveUrlHint: 'Example: https://yourgame.web.app or https://mysite.com — makes an "Open Live Project" button appear.',
    repoUrlLabel: 'Optional GitHub / Source URL',
    fallbackThemeLabel: 'Fallback Vector Canvas Theme',
    enterNextError: 'Fill in all required project details before saving.',
  },
  profile: {
    heading: 'PROFILE & SITE COPY',
    subtitle: 'Edit personal identity, contact links, hero counters, services, and stack. Every field has safe layout limits.',
    loadDefaults: 'Load Safe Defaults',
    saveSettings: 'Save Profile & Settings',
    starterDemosTitle: 'Show Built-In Starter Demo Projects With Custom Work',
    starterDemosDesc: 'Keep the 6 built-in demo showcase projects visible alongside your newly added projects so your portfolio never looks empty.',
    publicCvTitle: 'Public Website CV Download Visibility',
    publicCvDesc: 'When switched OFF (default), visitors on your public website will NOT see any CV download button — only you can download it in Admin.',
  },
  career: {
    heading: 'MILESTONES & EXPERIENCE',
    subtitle: 'Control your shipped build milestones and studio timeline entries.',
    addMilestone: 'Add Milestone',
    addExperience: 'Add Experience',
    milestonesTab: 'Milestones',
    experienceTab: 'Career Timeline',
    emptyMilestones: 'No cloud milestones saved yet. Add one or sync defaults from Overview.',
    emptyExperience: 'No cloud experience entries saved yet. Add one or sync defaults from Overview.',
    deleteMilestoneTitle: 'Delete Milestone',
    deleteExperienceTitle: 'Delete Experience',
    saveMilestone: 'Save Milestone',
    saveEntry: 'Save Entry',
  },
  inquiries: {
    heading: 'CLIENT INQUIRIES',
    subtitle: 'Private project briefs submitted from your public portfolio website. Only your verified admin account can read them.',
    emptyTitle: 'No inquiries in this view.',
    emptyDesc: 'When visitors submit the Hire Me form on your viewer site, messages appear here in real time.',
    copyEmail: 'Email',
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
    previewLiveSite: 'লাইভ সাইট দেখুন',
    openLiveSite: 'লাইভ সাইট খুলুন',
    signOut: 'লগ আউট',
    installApp: 'অ্যাপ ইনস্টল',
    installAdminApp: 'অ্যাডমিন অ্যাপ ইনস্টল',
    cancel: 'বাতিল',
    working: 'অপেক্ষা করুন...',
    save: 'সেভ করুন',
    saving: 'সেভ হচ্ছে...',
    edit: 'এডিট',
    delete: 'ডিলিট',
    hide: 'লুকান',
    publish: 'পাবলিশ',
    published: 'পাবলিশড',
    draft: 'ড্রাফট',
    hiddenDraft: 'হাইড করা ড্রাফট',
    clear: 'মুছুন',
    unsavedChanges: 'সেভ বাকি আছে',
  },
  auth: {
    checkingSession: 'অ্যাডমিন সেশন যাচাই হচ্ছে...',
    adminSignIn: 'অ্যাডমিন লগইন',
    verifyYourEmail: 'ইমেইল ভেরিফাই করুন',
    signInPrompt: 'আপনার পোর্টফোলিও কনটেন্ট, প্রজেক্ট এবং ভিজিটর অ্যানালিটিক্স ম্যানেজ করতে অ্যাডমিন ইমেইল ও পাসওয়ার্ড দিন।',
    emailLabel: 'ইমেইল ঠিকানা',
    emailPlaceholder: 'অ্যাডমিন ইমেইল লিখুন',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: 'পাসওয়ার্ড লিখুন',
    signingIn: 'লগইন হচ্ছে...',
    signInButton: 'লগইন করুন',
    sessionFooter: 'সেশন সিকিউরিটি · ব্রাউজার বা অ্যাপ বন্ধ করলে অ্যাডমিন অটো-লক হয়ে যাবে',
    notVerifiedError: 'ইমেইল এখনো ভেরিফাই হয়নি। ইনবক্সের লিংকে ক্লিক করে আবার আনলক বাটনে চাপ দিন।',
    sendVerification: 'ভেরিফিকেশন ইমেইল পাঠান',
    sendingVerification: 'পাঠানো হচ্ছে...',
    iveVerified: 'ভেরিফাই করেছি — ড্যাশবোর্ড খুলুন',
    notAuthorized: 'এই অ্যাকাউন্টটির অ্যাডমিন অনুমতি নেই।',
    tryAnotherAccount: 'অন্য অ্যাকাউন্ট দিয়ে চেষ্টা করুন',
  },
  nav: {
    controlCenter: 'অ্যাডমিন কন্ট্রোল প্যানেল',
    overview: 'ওভারভিউ',
    analytics: 'অ্যানালিটিক্স',
    profile: 'প্রোফাইল ও সেটিংস',
    projects: 'প্রজেক্টস',
    career: 'মাইলস্টোন ও বায়ো',
    inquiries: 'ইনকোয়ারি',
    subProfile: {
      identity: 'হিরো ও ছবি',
      contact: 'যোগাযোগ ও কোট',
      metrics: 'মেট্রিক্স ও টেক',
      process: 'সার্ভিস ও স্ট্যাক',
      viewer: 'ভিউয়ার কন্ট্রোলস',
      cv: 'সিভি / রিজিউমি',
    },
    subCareer: {
      milestones: 'মাইলস্টোন',
      experience: 'অভিজ্ঞতা',
    },
  },
  overview: {
    heading: 'স্টুডিও ওভারভিউ',
    subtitle: 'আপনার মূল ওয়েবসাইটের সব লেখা, ছবি, প্রজেক্ট ও ভিজিটর পরিসংখ্যান এখান থেকে সহজেই নিয়ন্ত্রণ করুন।',
    cloudInitTitle: 'ক্লাউড ডাটাবেস সেটআপের জন্য প্রস্তুত',
    cloudInitDesc: 'বর্তমানে আপনার সাইট ডিফল্ট ডাটা দেখাচ্ছে। এক ক্লিকে ডিফল্ট সেটিংস ক্লাউডে সেভ করুন যাতে সবকিছু এডিট করতে পারেন।',
    syncButton: 'ডিফল্ট ডাটা ক্লাউডে সেভ করুন',
    liveRightNow: 'এখন লাইভ দেখছেন',
    activeViewersDesc: 'রিফ্রেশ ছাড়াই রিয়েল-টাইম অ্যাক্টিভ ভিজিটর',
    todayVisitors: 'আজকের ভিজিটর',
    totalSuffix: 'মোট',
    publishedProjects: 'পাবলিশড প্রজেক্ট',
    milestonesTimeline: 'মাইলস্টোন ও অভিজ্ঞতা',
    newInquiries: 'নতুন মেসেজ',
    quickShortcuts: 'দ্রুত শর্টকাট',
    editNamePhotoBio: 'নাম, ছবি ও বায়ো এডিট',
    addUpdateProjects: 'প্রজেক্ট যোগ / আপডেট',
    milestonesExperience: 'মাইলস্টোন ও ক্যারিয়ার',
    openInquiries: 'মেসেজ দেখুন',
    viewAnalytics: 'রিয়েল-টাইম ভিজিটর ও দেশ দেখুন',
    cvCloudStatus: 'সিভি / রিজিউমি ও ক্লাউড স্ট্যাটাস',
    publicCvOn: 'পাবলিক সিভি: চালু',
    publicCvOff: 'পাবলিক সিভি: বন্ধ (শুধু অ্যাডমিন)',
    cvDesc: 'যেকোনো সময় আপনার পোর্টফোলিওর পিডিএফ সিভি ডাউনলোড করুন, অথবা মূল সাইটে ভিজিটরদের জন্য সিভি বাটন চালু/বন্ধ করুন।',
    downloadCv: 'আমার সিভি ডাউনলোড (PDF)',
    cvToggleSettings: 'সিভি সেটিংস',
    resyncDefaults: 'ডিফল্ট রিসেট করুন',
    seedDialogTitle: 'ক্লাউড সেটিংস চালু করুন',
    seedDialogDesc: 'ফায়ারস্টোরে আপনার প্রোফাইল ও থিমের প্রাথমিক সেটিংস তৈরি করবে যাতে আপনি যেকোনো সময় পরিবর্তন করতে পারেন।',
    seedDialogConfirm: 'ক্লাউড চালু করুন',
  },
  analytics: {
    heading: 'রিয়েল-টাইম ভিজিটর অ্যানালিটিক্স',
    subtitle: 'কোন দেশ থেকে কতজন দেখছেন, বয়সের ধরন, প্রজেক্ট ক্লিক এবং লাইভ ভিজিটর — রিফ্রেশ ছাড়াই অটো-আপডেট হয়।',
    liveBadge: 'রিয়েল-টাইম লাইভ',
    liveNowTitle: 'এই মুহূর্তে লাইভ দেখছেন',
    liveNowSubtitle: 'এখন যারা আপনার মূল ওয়েবসাইট ব্রাউজ করছেন তাদের রিয়েল-টাইম সংখ্যা।',
    noActiveViewers: 'এই মুহূর্তে কোনো লাইভ ভিজিটর নেই...',
    todayVisitors: 'আজকের ভিজিটর',
    pageViewsToday: 'টি পেজ ভিউ আজকে',
    monthVisitors: 'এই মাসের ভিজিটর',
    monthlyViewsAllTime: 'মাসিক ভিউ ·',
    projectClicks: 'প্রজেক্ট ক্লিক',
    waitingClicks: 'ক্লিকের অপেক্ষায়',
    hireSubmissions: 'হায়ার মেসেজ',
    opensSuffix: 'বার খোলা হয়েছে',
    conversionCv: 'কনভার্শন · সিভি ডাউনলোড:',
    dailyTrafficTitle: 'দৈনিক ট্রাফিক (শেষ ১৪ দিন)',
    monthlyTrafficTitle: 'মাসিক ট্রাফিক (৬ মাস)',
    dailyBtn: 'দৈনিক (১৪ দিন)',
    monthlyBtn: 'মাসিক',
    uniqueVisitors: 'ইউনিক ভিজিটর',
    interactionsLabel: 'প্রজেক্ট ক্লিক + হায়ার + সিভি',
    emptyTraffic: 'ভিজিটররা ওয়েবসাইট খুললেই এখানে দৈনিক ট্রাফিক চার্ট দেখা যাবে।',
    mostClickedTitle: 'সবচেয়ে বেশি দেখা প্রজেক্ট',
    noTrackedProjects: 'এখনো কোনো প্রজেক্ট ক্লিক রেকর্ড হয়নি।',
    clicksLabel: 'ক্লিক',
    countriesTitle: 'কোন দেশ থেকে ভিজিট করছে',
    countriesSubtitle: 'ভিজিটরের নেটওয়ার্ক ও টাইমজোন থেকে অটো-শনাক্তকৃত',
    noCountryData: 'ভিজিটর ঢুকলেই এখানে দেশের তালিকা অটোমেটিক চলে আসবে।',
    ageGroupsTitle: 'ভিজিটরদের বয়সের গ্রুপ (ঐচ্ছিক)',
    ageGroupsSubtitle: 'ভিজিটরদের নিজেদের দেওয়া গোপনীয় বয়সের তথ্য',
    noAgeData: 'এখনো কোনো বয়সের তথ্য জমা পড়েনি।',
    agePrivacyNote: 'নোট: ব্রাউজার কারো বয়স অটোমেটিক জানায় না। সাইটের ফর্ম বা কুইক-চেক থেকে ভিজিটর নিজে নির্বাচন করলে এখানে দেখা যায়।',
    hireFunnelTitle: 'হায়ার মি ফানেল',
    modalOpens: 'ফর্ম খোলা হয়েছে',
    submittedBriefs: 'জমা হওয়া মেসেজ',
    cvDownloadsTitle: 'সিভি ডাউনলোড',
    cvDownloadsDesc: 'পাবলিক সিভি বাটন চালু থাকলে ভিজিটরদের ডাউনলোড সংখ্যা।',
    allTimeViewsTitle: 'সর্বমোট পেজ ভিউ',
    allTimeViewsDesc: 'রেকর্ডকৃত দিন সংখ্যা:',
  },
  projects: {
    heading: 'প্রজেক্টস শোকেস',
    subtitle: 'একাধিক ছবি যোগ করুন (ভিডিওর মতো অটো-স্লাইড হবে), প্রজেক্টের লাইভ লিংক দিন এবং প্রকাশ/হাইড করুন।',
    addNew: 'নতুন প্রজেক্ট যোগ করুন',
    filterPlaceholder: 'প্রজেক্ট খুঁজুন...',
    starterDemoNoticeTitle: 'ডেমো প্রজেক্টগুলো অটো-সক্রিয় আছে',
    starterDemoNoticeDesc: 'নতুন প্রজেক্ট যোগ করলেও আগের ৬টি ডেমো প্রজেক্ট মূল ওয়েবসাইটে সুন্দরভাবে থাকবে। চাইলে ভিউয়ার কন্ট্রোলস থেকে বন্ধ করতে পারবেন।',
    manageStarterToggle: 'ভিউয়ার কন্ট্রোলস',
    emptyCloudTitle: 'এখনো কোনো কাস্টম ক্লাউড প্রজেক্ট যোগ করা হয়নি।',
    emptyFilterTitle: 'এই ফিল্টারে কোনো প্রজেক্ট পাওয়া যায়নি।',
    emptyCloudDesc: 'নতুন প্রজেক্ট যোগ করলে তা আগের ডেমো প্রজেক্টগুলোর সাথেই মূল সাইটে দেখাবে।',
    emptyFilterDesc: 'ক্যাটাগরি পরিবর্তন করুন বা সার্চ বক্স খালি করুন।',
    createFirst: 'প্রথম প্রজেক্ট তৈরি করুন',
    deleteTitle: 'প্রজেক্ট ডিলিট করুন',
    deleteConfirm: 'আপনি কি নিশ্চিতভাবে এই প্রজেক্টটি ক্লাউড ডাটাবেস থেকে মুছে ফেলতে চান?',
    backToProjects: 'প্রজেক্ট তালিকায় ফিরুন',
    editHeading: 'প্রজেক্ট এডিট করুন',
    newHeading: 'নতুন প্রজেক্ট যোগ করুন',
    formHint: 'একসাথে একাধিক ছবি আপলোড করলে মূল সাইটে ভিডিওর মতো একটার পর একটা অটো-প্লে হবে।',
    publishedOnSite: 'সাইটে প্রকাশিত',
    saveProject: 'প্রজেক্ট সেভ করুন',
    slidesTitle: 'প্রজেক্ট স্লাইডশো ছবি (সর্বোচ্চ ৫টি) অথবা শর্ট ভিডিও',
    slidesSubtitle: 'ফোন বা পিসি থেকে একাধিক ছবি একসাথে সিলেক্ট করুন — ওয়েবসাইটে এগুলো ভিডিওর মতো স্লাইডশো হয়ে চলবে।',
    addPhotosBtn: 'একাধিক ছবি যোগ করুন',
    shortVideoBtn: 'শর্ট ভিডিও',
    addPhotoUrlPlaceholder: 'অথবা ছবির লিংক দিন (https://...)',
    addPhotoUrlBtn: 'লিংক যোগ',
    noMediaYet: 'এখনো কোনো ছবি দেওয়া হয়নি — ডিফল্ট ডিজাইন দেখাচ্ছে।',
    setCover: 'কভার',
    liveUrlLabel: 'লাইভ প্রজেক্ট URL (ভিজিটররা সরাসরি ওপেন করতে পারবে)',
    liveUrlHint: 'উদাহরণ: https://yourapp.web.app — দিলে কার্ডে ও মডালে "Open Live Project" বাটন আসবে।',
    repoUrlLabel: 'গিটহাব / সোর্স লিংক (ঐচ্ছিক)',
    fallbackThemeLabel: 'ডিফল্ট ভেক্টর ক্যানভাস থিম',
    enterNextError: 'সেভ করার আগে প্রজেক্টের প্রয়োজনীয় তথ্যগুলো পূরণ করুন।',
  },
  profile: {
    heading: 'প্রোফাইল ও সাইট সেটিংস',
    subtitle: 'আপনার নাম, ছবি, বায়ো, কন্টাক্ট লিংক এবং ওয়েবসাইটের থিম ও কন্ট্রোল এখান থেকে এডিট করুন।',
    loadDefaults: 'ডিফল্ট লোড করুন',
    saveSettings: 'প্রোফাইল ও সেটিংস সেভ করুন',
    starterDemosTitle: 'নতুন প্রজেক্টের সাথে ডেমো প্রজেক্টও দেখাও',
    starterDemosDesc: 'চালু থাকলে আপনি নতুন ১টি প্রজেক্ট যোগ করলেও সাইটে আগের ৬টি ডেমো প্রজেক্ট অটোমেটিক দেখা যাবে।',
    publicCvTitle: 'মূল সাইটে সিভি ডাউনলোড বাটন',
    publicCvDesc: 'বন্ধ থাকলে সাধারণ ভিজিটররা সিভি ডাউনলোড বাটন দেখবে না — শুধু আপনি অ্যাডমিন থেকে ডাউনলোড করতে পারবেন।',
  },
  career: {
    heading: 'মাইলস্টোন ও অভিজ্ঞতা',
    subtitle: 'আপনার অর্জন এবং কাজের অভিজ্ঞতার টাইমলাইন ম্যানেজ করুন।',
    addMilestone: 'মাইলস্টোন যোগ করুন',
    addExperience: 'অভিজ্ঞতা যোগ করুন',
    milestonesTab: 'মাইলস্টোন',
    experienceTab: 'ক্যারিয়ার টাইমলাইন',
    emptyMilestones: 'এখনো কোনো মাইলস্টোন যোগ করা হয়নি।',
    emptyExperience: 'এখনো কোনো অভিজ্ঞতা যোগ করা হয়নি।',
    deleteMilestoneTitle: 'মাইলস্টোন ডিলিট করুন',
    deleteExperienceTitle: 'অভিজ্ঞতা ডিলিট করুন',
    saveMilestone: 'মাইলস্টোন সেভ করুন',
    saveEntry: 'অভিজ্ঞতা সেভ করুন',
  },
  inquiries: {
    heading: 'ক্লায়েন্ট ইনকোয়ারি (মেসেজ)',
    subtitle: 'মূল ওয়েবসাইট থেকে ভিজিটরদের পাঠানো প্রজেক্ট মেসেজগুলো শুধু আপনার ভেরিফায়েড অ্যাডমিন দেখতে পারবেন।',
    emptyTitle: 'এই ক্যাটাগরিতে কোনো মেসেজ নেই।',
    emptyDesc: 'ভিজিটররা Hire Me ফর্ম পূরণ করলে এখানে রিয়েল-টাইমে মেসেজ চলে আসবে।',
    copyEmail: 'ইমেইল কপি',
    copied: 'কপি হয়েছে',
    reply: 'রিপ্লাই',
    deleteTitle: 'মেসেজ ডিলিট করুন',
    statuses: {
      all: 'সবগুলো',
      new: 'নতুন',
      read: 'পড়া হয়েছে',
      replied: 'উত্তর দেওয়া হয়েছে',
      archived: 'আর্কাইভ',
    },
  },
};

export function getAdminCopy(lang: AdminLang): AdminTranslations {
  return lang === 'bn' ? BN_COPY : EN_COPY;
}
