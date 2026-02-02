type Project = {
  name: string
  description: string
  link: string
  video: string
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
    video:
      'https://res.cloudinary.com/read-cv/video/upload/t_v_b/v1/1/profileItems/W2azTw5BVbMXfj7F53G92hMVIn32/newProfileItem/d898be8a-7037-4c71-af0c-8997239b050d.mp4?_a=DATAdtAAZAA0',
    id: 'project1',
  },
  {
    name: 'SOCIS Website',
    description: "Official website for the society representing University of Guelph's Bachelor of Computing.",
    link: 'https://socis.ca/',
    video:
      'https://res.cloudinary.com/read-cv/video/upload/t_v_b/v1/1/profileItems/W2azTw5BVbMXfj7F53G92hMVIn32/XSfIvT7BUWbPRXhrbLed/ee6871c9-8400-49d2-8be9-e32675eabf7e.mp4?_a=DATAdtAAZAA0',
    id: 'project2',
  }, 
  {
    name: 'GeckoAI',
    description: "Full-stack web application allowing users to automate tedious calendar scheduling.",
    link: 'https://github.com/smhussa22/geckoai',
    video:
      'https://res.cloudinary.com/read-cv/video/upload/t_v_b/v1/1/profileItems/W2azTw5BVbMXfj7F53G92hMVIn32/XSfIvT7BUWbPRXhrbLed/ee6871c9-8400-49d2-8be9-e32675eabf7e.mp4?_a=DATAdtAAZAA0',
    id: 'project2',
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
    label: 'Instagram',
    link: 'https://www.instagram.com/smaroofh',
  },
  {
    label: 'Resume',
    link: '/Syed_Maroof_Hussain_Resume_Redacted.pdf',
  },
]

export const EMAIL = 'syedmarhuss@gmail.com'
