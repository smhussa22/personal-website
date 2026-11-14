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
    name: 'NodeMonitor',
    description: 'Placeholder description.',
    link: '',
    video: '/demos/nodemonitor.mp4',
    id: 'project1',
  },
  {
    name: 'OpenSocialNet',
    description: 'Placeholder description.',
    link: '',
    id: 'project2',
  },
  {
    name: 'FileSpark',
    description:
      'End-to-end, user-based, full-stack file uploading and sharing system.',
    link: 'https://github.com/smhussa22/filespark',
    video: '/demos/filespark.mp4',
    badge: { label: '100 users!', variant: 'blue' },
    id: 'project3',
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
    id: 'project4',
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
