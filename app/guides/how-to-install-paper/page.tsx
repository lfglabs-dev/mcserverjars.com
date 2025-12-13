import { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../../siteConfig";
import { Breadcrumb } from "../../components/Breadcrumb";

export const metadata: Metadata = {
  title: "How to Install a Paper Minecraft Server | Step-by-Step Guide",
  description:
    "Learn how to set up a Paper Minecraft server from scratch. Download Paper, configure your server, and start playing in minutes with this beginner-friendly guide.",
  alternates: {
    canonical: `${siteConfig.url}/guides/how-to-install-paper`,
  },
  openGraph: {
    title: "How to Install a Paper Minecraft Server",
    description:
      "Step-by-step guide to setting up a Paper server. Perfect for beginners.",
    url: `${siteConfig.url}/guides/how-to-install-paper`,
  },
};

export default function HowToInstallPaperGuide() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Install a Paper Minecraft Server",
    description: "Set up a Paper Minecraft server from scratch.",
    step: [
      {
        "@type": "HowToStep",
        name: "Download Java",
        text: "Install Java 21 or newer on your computer.",
      },
      {
        "@type": "HowToStep",
        name: "Download Paper",
        text: "Download the latest Paper server jar from MCServerJars.",
      },
      {
        "@type": "HowToStep",
        name: "Create server folder",
        text: "Create a new folder for your server files.",
      },
      {
        "@type": "HowToStep",
        name: "Run the server",
        text: "Run the server jar to generate configuration files.",
      },
      {
        "@type": "HowToStep",
        name: "Accept EULA",
        text: "Edit eula.txt and set eula=true.",
      },
      {
        "@type": "HowToStep",
        name: "Start playing",
        text: "Run the server again and connect from Minecraft.",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pt-24 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Breadcrumb
            items={[
              { label: "Guides", href: "/guides" },
              { label: "How to Install Paper" },
            ]}
          />

          <article className="prose-custom">
            <h1>How to Install a Paper Minecraft Server</h1>

            <p className="lead">
              This guide will walk you through setting up a Paper Minecraft
              server from scratch. Paper is the most popular server software,
              offering excellent performance and plugin support.
            </p>

            <h2>Requirements</h2>

            <ul>
              <li>Java 21 or newer (Java 21 recommended for Minecraft 1.20.5+)</li>
              <li>At least 2GB of RAM (4GB+ recommended)</li>
              <li>A computer or VPS to run the server</li>
            </ul>

            <h2>Step 1: Install Java</h2>

            <p>
              Paper requires Java to run. For Minecraft 1.20.5 and newer, you
              need Java 21. Download it from{" "}
              <a
                href="https://adoptium.net/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Adoptium
              </a>{" "}
              (Eclipse Temurin).
            </p>

            <p>Verify your Java installation by opening a terminal and running:</p>

            <pre>
              <code>java -version</code>
            </pre>

            <h2>Step 2: Download Paper</h2>

            <p>
              Download the latest Paper server jar for your Minecraft version:
            </p>

            <p>
              <Link href="/paper" className="text-primary hover:underline font-medium">
                Download Paper from MCServerJars
              </Link>
            </p>

            <p>
              Choose the Minecraft version you want to run and download the
              latest build.
            </p>

            <h2>Step 3: Create Your Server Folder</h2>

            <p>
              Create a new folder for your server. Name it something like
              &quot;minecraft-server&quot; and place the downloaded Paper jar inside.
            </p>

            <p>Rename the jar file to <code>server.jar</code> for convenience.</p>

            <h2>Step 4: Create a Start Script</h2>

            <p>
              Create a new file called <code>start.sh</code> (Linux/Mac) or{" "}
              <code>start.bat</code> (Windows) with the following content:
            </p>

            <p>
              <strong>Windows (start.bat):</strong>
            </p>
            <pre>
              <code>java -Xmx4G -Xms4G -jar server.jar --nogui</code>
            </pre>

            <p>
              <strong>Linux/Mac (start.sh):</strong>
            </p>
            <pre>
              <code>{`#!/bin/bash
java -Xmx4G -Xms4G -jar server.jar --nogui`}</code>
            </pre>

            <p>
              Adjust the <code>-Xmx4G</code> and <code>-Xms4G</code> values to
              match how much RAM you want to allocate.
            </p>

            <h2>Step 5: First Run and EULA</h2>

            <p>
              Run your start script. The server will generate some files and
              then stop, asking you to accept the EULA.
            </p>

            <p>
              Open <code>eula.txt</code> and change <code>eula=false</code> to{" "}
              <code>eula=true</code>.
            </p>

            <h2>Step 6: Configure Your Server</h2>

            <p>
              Before starting again, you can edit <code>server.properties</code>{" "}
              to configure your server:
            </p>

            <ul>
              <li>
                <code>server-port</code> - The port your server runs on (default: 25565)
              </li>
              <li>
                <code>max-players</code> - Maximum number of players
              </li>
              <li>
                <code>motd</code> - The message shown in the server list
              </li>
              <li>
                <code>online-mode</code> - Whether to verify players with Mojang
              </li>
            </ul>

            <h2>Step 7: Start Your Server</h2>

            <p>
              Run your start script again. This time the server will fully
              start. You will see a message like &quot;Done!&quot; when it is ready.
            </p>

            <p>
              Connect to your server from Minecraft using <code>localhost</code>{" "}
              if playing on the same computer, or your IP address if connecting
              from elsewhere.
            </p>

            <h2>Next Steps</h2>

            <ul>
              <li>
                <strong>Install plugins</strong> - Drop plugin jars into the{" "}
                <code>plugins</code> folder and restart
              </li>
              <li>
                <strong>Configure Paper</strong> - Edit files in the{" "}
                <code>config</code> folder for performance tuning
              </li>
              <li>
                <strong>Set up backups</strong> - Regularly backup your{" "}
                <code>world</code> folder
              </li>
            </ul>

            <h2>Troubleshooting</h2>

            <p>
              <strong>Server won&apos;t start?</strong> Make sure you have the
              correct Java version installed and enough RAM allocated.
            </p>

            <p>
              <strong>Can&apos;t connect?</strong> Check your firewall settings
              and make sure port 25565 is open.
            </p>

            <p>
              <strong>Need a different version?</strong> Browse all available
              Paper versions on{" "}
              <Link href="/paper" className="text-primary hover:underline">
                MCServerJars
              </Link>
              .
            </p>
          </article>
        </div>
      </div>
    </>
  );
}

