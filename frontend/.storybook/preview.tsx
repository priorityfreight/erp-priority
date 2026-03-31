import type { Preview } from "@storybook/nextjs-vite"

import "../app/globals.css"

import { AppProviders } from "@/components/layout/AppProviders"

const preview: Preview = {
  decorators: [
    (Story) => (
      <AppProviders>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(128,0,32,0.14),_transparent_28%),linear-gradient(180deg,_#f7f8fb_0%,_#eef2f7_100%)] p-6 text-[var(--brand-navy)] md:p-10">
          <div className="mx-auto max-w-7xl">
            <Story />
          </div>
        </div>
      </AppProviders>
    ),
  ],
  parameters: {
    layout: "padded",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
}

export default preview
