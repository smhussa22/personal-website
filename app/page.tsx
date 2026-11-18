'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { Magnetic } from '@/components/ui/magnetic'
import { Spotlight } from '@/components/ui/spotlight'
import {
  PROJECTS,
  OPEN_SOURCE,
  EMAIL,
  SOCIAL_LINKS,
} from './data'

const VARIANTS_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const VARIANTS_SECTION = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

const TRANSITION_SECTION = {
  duration: 0.3,
}

const PLAYBACK_RATE = 1.75

const RECENTLY_IMAGES = [
  { n: 1, ext: 'jpg' },
  { n: 2, ext: 'webp' },
  { n: 4, ext: 'webp' },
  { n: 5, ext: 'webp' },
]

function MagneticSocialLink({
  children,
  link,
}: {
  children: React.ReactNode
  link: string
}) {
  return (
    <Magnetic springOptions={{ bounce: 0 }} intensity={0.3}>
      <a
        href={link}
        className="group relative inline-flex shrink-0 items-center gap-[1px] rounded-full bg-zinc-100 px-2.5 py-1 text-sm text-black transition-colors duration-200 hover:bg-zinc-950 hover:text-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        {children}
      </a>
    </Magnetic>
  )
}

function ProjectVideo({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.playbackRate = PLAYBACK_RATE
    video.play().catch(() => {})
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      title={title}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        e.currentTarget.playbackRate = PLAYBACK_RATE
      }}
      className="h-full w-full rounded-xl object-cover"
    />
  )
}

function ProjectBadge({
  label,
  tooltip,
  variant,
}: {
  label: string
  tooltip?: string
  variant: 'gold' | 'blue'
}) {
  const styles =
    variant === 'gold'
      ? 'bg-yellow-400 text-yellow-950'
      : 'bg-orange-500 text-white'

  return (
    <div className="group/badge absolute right-0 top-0 z-10">
      <div
        className={`pointer-events-auto rounded-tr-xl rounded-bl-xl px-3 py-1.5 text-xs font-semibold shadow-md ${styles}`}
      >
        {label}
      </div>
      {tooltip && (
        <div className="pointer-events-none absolute right-0 top-full mt-2 w-max max-w-[220px] origin-top-right scale-95 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-50 opacity-0 shadow-lg ring-1 ring-zinc-800 transition-all duration-150 group-hover/badge:scale-100 group-hover/badge:opacity-100 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-200">
          {tooltip}
        </div>
      )}
    </div>
  )
}

export default function Personal() {
  return (
    <motion.main
      className="space-y-8"
      variants={VARIANTS_CONTAINER}
      initial="hidden"
      animate="visible"
    >
      {/* About */}
      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION_SECTION}>
        <div className="flex-1">
          <p className="text-zinc-600 my-2 dark:text-zinc-400">
            I am a student at the University of Guelph, pursuing an Honours Computer Science degree. 
            I have a strong passion for backend development, specifically in the realm of networking, distributed systems, and microservices.
          </p>
      
        </div>
      </motion.section>

      {/* Contact */}
      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION_SECTION}>
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          Contact me at{' '}
          <a className="underline dark:text-zinc-300" href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
        </p>

        <div className="flex items-center justify-start space-x-3">
          {SOCIAL_LINKS.map((link) => (
            <MagneticSocialLink key={link.label} link={link.link}>
              {link.label}
            </MagneticSocialLink>
          ))}
        </div>
      </motion.section>

      {/* Open source */}
      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION_SECTION}>
        <h3 className="mb-5 text-lg font-medium">What I&apos;ve Worked On</h3>

        <div className="flex flex-col space-y-2">
          {OPEN_SOURCE.map((oss) => (
            <a
              key={oss.id}
              className="relative overflow-hidden rounded-2xl bg-zinc-300/30 p-[1px] dark:bg-zinc-600/30"
              href={oss.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Spotlight
                className="from-zinc-900 via-zinc-800 to-zinc-700 blur-2xl dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-50"
                size={64}
              />
              <div className="relative h-full w-full rounded-[15px] bg-white p-4 dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={oss.logo}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-md object-cover"
                  />
                  <h4 className="font-normal dark:text-zinc-100">{oss.name}</h4>
                </div>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                  {oss.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </motion.section>

      {/* Projects */}
      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION_SECTION}>
        <h3 className="mb-5 text-lg font-medium">Personal Projects</h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PROJECTS.map((project) => (
            <div key={project.id} className="space-y-2">
              <div className="relative rounded-2xl bg-zinc-50/40 p-1 ring-1 ring-zinc-200/50 ring-inset dark:bg-zinc-950/40 dark:ring-zinc-800/50">
                {project.badge && (
                  <ProjectBadge
                    label={project.badge.label}
                    tooltip={project.badge.tooltip}
                    variant={project.badge.variant}
                  />
                )}
                <div className="relative h-[240px] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                  {project.video ? (
                    project.videoLink ? (
                      <a href={project.videoLink} aria-label={`Open ${project.name}`} className="block h-full w-full">
                        <ProjectVideo src={project.video} title={project.name} />
                      </a>
                    ) : (
                      <ProjectVideo src={project.video} title={project.name} />
                    )
                  ) : project.image ? (
                    <Image
                      src={project.image}
                      alt={project.name}
                      fill
                      className="object-contain p-4"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      aria-label="GitHub"
                      className="absolute inset-0 m-auto h-16 w-16 fill-zinc-400 dark:fill-zinc-600"
                    >
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="px-1">
                <a
                  className="font-base group relative inline-block font-[450] text-zinc-900 dark:text-zinc-50"
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {project.name}
                </a>

                <p className="text-base text-zinc-600 dark:text-zinc-400">
                  {project.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Recently */}
      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION_SECTION}>
        <h3 className="mb-5 text-lg font-medium">Recently..</h3>

        <div className="flex flex-wrap gap-4">
          {RECENTLY_IMAGES.map(({ n, ext }) => (
            <div
              key={n}
              className="relative h-[220px] overflow-hidden rounded-xl bg-zinc-50/40 p-1 ring-1 ring-zinc-200/50 ring-inset dark:bg-zinc-950/40 dark:ring-zinc-800/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/recently/${n}.${ext}`}
                alt={`Recent ${n}`}
                className="h-full w-auto rounded-lg object-cover"
              />
            </div>
          ))}
        </div>
      </motion.section>

    </motion.main>
  )
}
