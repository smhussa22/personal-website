'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { Spotlight } from '@/components/ui/spotlight'
import { Magnetic } from '@/components/ui/magnetic'
import {
  PROJECTS,
  WORK_EXPERIENCE,
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

const RECENTLY_IMAGES = [1, 2, 3, 4]

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
                    <ProjectVideo src={project.video} title={project.name} />
                  ) : project.image ? (
                    <Image
                      src={project.image}
                      alt={project.name}
                      fill
                      className="object-contain p-4"
                    />
                  ) : null}
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

      {/* Experience */}
      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION_SECTION}>
        <h3 className="mb-5 text-lg font-medium">Experience</h3>

        <div className="flex flex-col space-y-2">
          {WORK_EXPERIENCE.map((job) => (
            <a
              key={job.id}
              className="relative overflow-hidden rounded-2xl bg-zinc-300/30 p-[1px] dark:bg-zinc-600/30"
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Spotlight
                className="from-zinc-900 via-zinc-800 to-zinc-700 blur-2xl dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-50"
                size={64}
              />

              <div className="relative h-full w-full rounded-[15px] bg-white p-4 dark:bg-zinc-950">
                <div className="relative flex w-full flex-row justify-between">
                  <div>
                    <h4 className="font-normal dark:text-zinc-100">
                      {job.title}
                    </h4>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      {job.company}
                    </p>
                  </div>

                  <p className="text-zinc-600 dark:text-zinc-400">
                    {job.start} - {job.end}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </motion.section>

      {/* Recently */}
      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION_SECTION}>
        <h3 className="mb-5 text-lg font-medium">Recently..</h3>

        <div className="flex flex-wrap gap-4">
          {RECENTLY_IMAGES.map((n) => (
            <div
              key={n}
              className="relative h-[220px] overflow-hidden rounded-xl bg-zinc-50/40 p-1 ring-1 ring-zinc-200/50 ring-inset dark:bg-zinc-950/40 dark:ring-zinc-800/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/recently/${n}.webp`}
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
