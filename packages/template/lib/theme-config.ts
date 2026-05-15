/**
 * aiConnected docs theme configuration
 *
 * Customize your documentation's look and feel by modifying this file.
 * All colors, branding, and styling can be adjusted here.
 */

export const siteConfig = {
  // Site metadata
  name: 'aiConnected',
  description: 'Documentation, API references, planning docs, and knowledge base for aiConnected.',
  url: 'https://secure-docs.aiconnected.ai',

  // Logo configuration
  logo: {
    src: '/logo/light.svg',
    darkSrc: '/logo/dark.svg',
    alt: 'aiConnected',
    width: 174,
    height: 40,
  },

  // Navigation links
  links: {
    github: 'https://github.com/oxfordpierpont/docs',
    discord: '',
    twitter: 'https://x.com/aiconnected',
    support: 'mailto:support@aiconnected.ai',
  },

  // Footer configuration
  footer: {
    companyName: 'aiConnected',
    links: [
      { label: 'Website', href: 'https://aiconnected.ai' },
      { label: 'Sign In', href: 'https://aiconnected.io/login' },
      { label: 'Get Started', href: 'https://aiconnected.io/signup' },
    ],
  },
}

export const themeConfig = {
  // Primary accent color - used for active states, links, highlights
  colors: {
    // Light mode
    light: {
      accent: '#1c75bc',        // Primary accent color
      accentForeground: '#ffffff',
      accentMuted: 'rgba(28, 117, 188, 0.1)',
    },
    // Dark mode
    dark: {
      accent: '#2e95f3',        // Brighter for dark backgrounds
      accentForeground: '#021220',
      accentMuted: 'rgba(46, 149, 243, 0.14)',
    },
  },

  // Code block styling
  codeBlock: {
    light: {
      background: '#fafafa',
      titleBar: '#f3f4f6',
    },
    dark: {
      background: '#1a1a1f',
      titleBar: '#1f2937',
    },
  },

  // OG Image generation settings
  ogImage: {
    // Gradient background (CSS gradient string)
    gradient: 'linear-gradient(135deg, #fafcff 0%, #d7ecff 52%, #2e95f3 100%)',
    // Text colors
    titleColor: '#021220',
    sectionColor: '#1c75bc',
    // Logo URL (absolute URL required for OG images)
    logoUrl: 'https://secure-docs.aiconnected.ai/logo/light.svg',
  },
}

// Export CSS variable values for use in Tailwind
export function getCSSVariables(mode: 'light' | 'dark') {
  const colors = themeConfig.colors[mode]
  return {
    '--accent': colors.accent,
    '--accent-foreground': colors.accentForeground,
    '--accent-muted': colors.accentMuted,
  }
}

/**
 * Get the site URL dynamically
 * Priority: NEXT_PUBLIC_SITE_URL > VERCEL_PROJECT_PRODUCTION_URL > VERCEL_URL > siteConfig.url
 * This allows OG images to work automatically on Vercel without configuration
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  // Use production URL if available (custom domain)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  // Fallback to deployment URL for preview deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return siteConfig.url
}
