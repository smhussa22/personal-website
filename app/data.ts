type Badge = {
  label: string
  tooltip?: string
  variant: 'gold' | 'blue'
}

type Project = {
  name: string
  description: string
  link: string
  video?: string
  image?: string
  badge?: Badge
  id: string
}

type WorkExperience = {
  company: string
  title: string
  start: string
  end: string
  link: string
  id: string
}

type BlogPost = {
  title: string
  description: string
  link: string
  uid: string
}

type SocialLink = {
  label: string
  link: string
}

export const PROJECTS: Project[] = [
  {
    name: 'FileSpark',
    description:
      'End-to-end, user-based, full-stack file uploading and sharing system.',
    link: 'https://github.com/smhussa22/filespark',
    video: '/demos/filespark.mp4',
    badge: { label: '100 users!', variant: 'blue' },
    id: 'project1',
  },
  {
    name: 'Unchained',
    description:
      'Predictive forecasting tool that uses graph neural networks to visualize how local logistics disruptions cause cascading medical shortages at hospitals.',
    link: 'https://github.com/smhussa22/unchained',
    video: '/demos/unchained.mp4',
    badge: {
      label: 'Hackathon Winner',
      tooltip: "Won WesternAI DataQuest '26",
      variant: 'gold',
    },
    id: 'project2',
  },
  {
    name: 'SOCIS Website',
    description: "Official website for UofG's B.Comp. academic society, handling thousands of requests.",
    link: 'https://socis.ca/',
    video: '/demos/socis.mp4',
    id: 'project3',
  },
  {
    name: 'GeckoAI',
    description: "Full-stack web application allowing users to automate tedious calendar scheduling.",
    link: 'https://github.com/smhussa22/geckoai',
    image: '/geckoai.png',
    id: 'project4',
  },
]

export const WORK_EXPERIENCE: WorkExperience[] = [

  {
    company: 'Society Of Computing and Information Sciences, University of Guelph',
    title: 'Vice President, Technology',
    start: '2025',
    end: 'Present',
    link: 'https://socis.ca',
    id: 'work1',
  },

]

export const BLOG_POSTS: BlogPost[] = [

]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'GitHub',
    link: 'https://github.com/smhussa22',
  },
  {
    label: 'LinkedIn',
    link: 'https://www.linkedin.com/in/syedmarhuss',
  },
  {
    label: 'Resume',
    link: '/Syed_Maroof_Hussain_Resume_Redacted.pdf',
  },
]

export const EMAIL = 'syedmarhuss@gmail.com'
