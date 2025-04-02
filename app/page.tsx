"use client";

import { SettingsProvider } from "@/lib/settings-provider";
import { ClientOnly } from "@/lib/client-only";
import { Inter } from "next/font/google";
import ChatAutomation from "@/components/ready-to-use-examples/chat-automation";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function Page() {
  return (
    <SettingsProvider>
      <ClientOnly>
        <div
          className={`flex flex-col gap-6 items-center justify-center h-full mt-12 px-4 pb-12 ${inter.className}`}
        >
          <h1 className="text-2xl font-bold mb-0">
            Chat Automation Example
          </h1>
          <p className="text-gray-600 mb-6 -mt-2">
            Ready-to-use components for engineers building apps with screenpipe
          </p>

          <div className="w-full max-w-3xl">
            <ChatAutomation />
          </div>
        </div>
      </ClientOnly>
    </SettingsProvider>
  );
}
