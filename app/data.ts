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

type OpenSource = {
  name: string
  description: string
  link: string
  logo: string
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
    description: 'A network monitoring system with automated incident response, heavily inspired by Splunk.',
    link: 'https://github.com/smhussa22/node-monitor',
    video: '/demos/nodemonitor.mp4',
    id: 'project1',
  },
  {
    name: 'Maroof Street',
    description: 'A distributed mini stock exchange built around my C++ matching engine, where simulated accounts trade real symbols using live market data.',
    link: 'https://github.com/smhussa22/maroof-street',
    id: 'project2',
  },
  {
    name: 'Matching Engine',
    description: 'A limit orderbook-based matching engine written in modern C++23, designed specifically for high throughput and low latency from cache-friendly data structures.',
    link: 'https://github.com/smhussa22/matching-engine',
    id: 'project5',
  },
  {
    name: 'maroof.net',
    description: 'A networking library that implements reliable-UDP transport in beautiful, modern C++23. "Connection oriented API like TCP... but message oriented like UDP"',
    link: 'https://github.com/smhussa22/maroof-net',
    id: 'project6',
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

export const OPEN_SOURCE: OpenSource[] = [
  {
    name: 'Microsoft C++ Standard Library',
    description:
      'Optimized performance for algorithms in the std::ranges (C++20) library.',
    link: 'https://github.com/microsoft/STL/pulls?q=is%3Apr+author%3Asmhussa22',
    logo: '/logos/microsoft.png',
    id: 'oss1',
  },
  {
    name: 'Monero',
    description:
      'Patched a DNSSEC validation bypass in the C++ core of the cryptocurrency, closing a DNS poisoning attack.',
    link: 'https://github.com/monero-project/monero/pulls?q=is%3Apr+author%3Asmhussa22',
    logo: '/logos/monero-project.png',
    id: 'oss2',
  },
  {
    name: 'PcapPlusPlus',
    description:
      'Implemented Bluetooth HCI packet parsing, creation, and serialization, closing a 3-year-old feature request.',
    link: 'https://github.com/seladb/PcapPlusPlus/pulls?q=is%3Apr+author%3Asmhussa22',
    logo: '/logos/pcapplusplus.svg',
    id: 'oss3',
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
    link: '/Syed_Maroof_Hussain_Resume.pdf',
  },
]

export const EMAIL = 'syedmaroofhuss@gmail.com'
